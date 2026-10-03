class LunoClassPatcher {
  constructor() {}

  static parseAST(sourceText) {
      if (!sourceText || typeof sourceText !== 'string' || !sourceText.trim()) {
        throw new Error('[Luno AST Guard] parseAST received empty source text.');
      }
  
      var acornObj = (typeof window !== 'undefined' && window.acorn) || (typeof globalThis !== 'undefined' && globalThis.acorn);
      if (!acornObj && typeof require !== 'undefined') {
        try { acornObj = require('acorn'); } catch (e) {}
        if (!acornObj) {
          try {
            var p = require('path');
            var root = (typeof LunoServer !== 'undefined' && LunoServer.getRootDir) ? LunoServer.getRootDir() : process.cwd();
            } catch(e2) {}
        }
        if (!acornObj) {
          try {
            var p = require('path');
            var root = (typeof LunoServer !== 'undefined' && LunoServer.getRootDir) ? LunoServer.getRootDir() : process.cwd();
            acornObj = require(p.join(root, 'node_modules', 'acorn'));
          } catch (e3) {}
        }
      }
  
      if (!acornObj || typeof acornObj.parse !== 'function') {
        throw new Error('[Luno AST Guard] Acorn AST parser is not loaded in memory.');
      }
  
      var parseOpts = {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowHashBang: true,
        ranges: true,
        locations: true
      };
  
      try {
        return acornObj.parse(sourceText, parseOpts);
      } catch (e) {
        try {
          parseOpts.sourceType = 'script';
          return acornObj.parse(sourceText, parseOpts);
        } catch (e2) {
          throw new Error('[Luno AST Guard] Acorn failed to parse source AST: ' + e2.message);
        }
      }
    }

  static parseSpec(targetSpec) {
        if (!targetSpec || typeof targetSpec !== 'string' || !targetSpec.trim()) {
          throw new Error('[Luno AST Guard] Cannot parse targetSpec: targetSpec is empty.');
        }

        var clean = targetSpec.trim();
        if (clean.includes('@')) clean = clean.split('@').pop().trim();
        clean = clean.replace(/^(?:globalThis|window)\./, '');
        clean = clean.replace(/\s*\([\s\S]*?\)\s*$/, '').trim();

        var isStatic = null;
        var isAsync = false;
        var isGenerator = false;
        var kind = 'method';

        // Strip and record all leading modifier keywords that may precede the class or member
        var leadingModRegex = /^(static|async|get|set)\s+/i;
        var matchLead;
        while ((matchLead = clean.match(leadingModRegex))) {
          var mod = matchLead[1].toLowerCase();
          if (mod === 'static') isStatic = true;
          else if (mod === 'async') isAsync = true;
          else if (mod === 'get') kind = 'get';
          else if (mod === 'set') kind = 'set';
          clean = clean.slice(matchLead[0].length).trim();
        }

        var className = '';
        var rawMember = '';

        if (clean.includes('.prototype.')) {
          var protoParts = clean.split('.prototype.');
          className = protoParts[0].trim();
          rawMember = protoParts[1].trim();
          if (isStatic === null) isStatic = false;
        } else if (clean.includes('.')) {
          var dotParts = clean.split('.');
          rawMember = dotParts.pop().trim();
          className = dotParts.join('.').trim();
        } else {
          rawMember = clean;
        }

        var memberTokens = rawMember.split(/\s+/);
        var actualMemberName = memberTokens[memberTokens.length - 1];

        for (var i = 0; i < memberTokens.length - 1; i++) {
          var tok = memberTokens[i].toLowerCase();
          if (tok === 'static') isStatic = true;
          else if (tok === 'async') isAsync = true;
          else if (tok === 'get') kind = 'get';
          else if (tok === 'set') kind = 'set';
          else if (tok === '*') isGenerator = true;
        }

        if (actualMemberName.startsWith('*')) {
          isGenerator = true;
          actualMemberName = actualMemberName.slice(1);
        }

        if (actualMemberName === 'constructor') {
          isStatic = false;
          kind = 'constructor';
        }

        if (!actualMemberName) {
          throw new Error('[Luno AST Guard] Invalid targetSpec "' + targetSpec + '": Could not extract member name.');
        }

        return {
          className: className,
          memberName: actualMemberName,
          isStatic: isStatic,
          isAsync: isAsync,
          isGenerator: isGenerator,
          kind: kind
        };
      }

  static normalizeMethodCode(memberName, methodCode, isStatic, targetKind) {
      var rawStr = String(methodCode !== undefined && methodCode !== null ? methodCode : '').trim();
      if (!rawStr) {
        return (isStatic === true ? 'static ' : '') + memberName + '() {}';
      }

      var clean = rawStr;
      if (clean.endsWith(';')) clean = clean.slice(0, -1).trim();

      if (/^(?:globalThis\.|window\.)?[A-Za-z0-9_$]+(?:\.prototype|\.)[A-Za-z0-9_$]+\s*=/.test(clean)) {
        var eqIdx = clean.indexOf('=');
        clean = clean.slice(eqIdx + 1).trim();
        if (clean.endsWith(';')) clean = clean.slice(0, -1).trim();
      }

      var maxPasses = 20;
      while (maxPasses > 0 && (clean.startsWith('//') || clean.startsWith('/*'))) {
        maxPasses--;
        if (clean.startsWith('//')) {
          var nl = clean.indexOf('\n');
          clean = nl !== -1 ? clean.slice(nl + 1).trim() : '';
        } else if (clean.startsWith('/*')) {
          var endComment = clean.indexOf('*/');
          clean = endComment !== -1 ? clean.slice(endComment + 2).trim() : '';
        }
      }
      if (!clean) return (isStatic === true ? 'static ' : '') + memberName + '() {}';

      var propMatch = clean.match(/^(?:(static)\s+)?(?:(async)\s+)?([A-Za-z0-9_$#]+)\s*=\s*([\s\S]+)$/);
      if (propMatch && !clean.startsWith('get ') && !clean.startsWith('set ')) {
        var propStatic = (propMatch[1] === 'static') || (isStatic === true);
        var propVal = propMatch[4].trim();
        var propPrefix = propStatic ? 'static ' : '';
        var semi = (propVal.endsWith('}') || propVal.endsWith(';')) ? (propVal.endsWith(';') ? '' : ';') : ';';
        return propPrefix + memberName + ' = ' + propVal + semi;
      }

      var openParenIdx = clean.indexOf('(');
      var firstBraceIdx = clean.indexOf('{');

      if (firstBraceIdx === -1 && openParenIdx === -1) {
        var prefix = (isStatic === true ? 'static ' : '');
        if (memberName === 'constructor') return 'constructor() { ' + clean + ' }';
        return prefix + memberName + '() { ' + clean + ' }';
      }

      var bodyStartIdx = firstBraceIdx !== -1 ? firstBraceIdx : clean.length;
      var headerPart = clean.slice(0, bodyStartIdx).trim();
      var bodyPart = firstBraceIdx !== -1 ? clean.slice(firstBraceIdx).trim() : '{}';

      if (openParenIdx !== -1) {
        var depth = 0;
        var inStr = false;
        var strChar = '';
        var stack = [];
        var inLineComm = false;
        var inBlockComm = false;
        var inRegex = false;
        var inRegexCharClass = false;
        var lastNonWsChar = '';
        var lastWord = '';
        var closeParenIdx = -1;

        var isRegexPrefix = function(prevChar, prevWord) {
          if (!prevChar) return true;
          // '{' restored (unambiguous regex start, e.g. `${/["]/.test(x)}` or `{ /regex/ }`)
          // '}' omitted to prevent object literal division {n: 4}/2 misfiring
          if ('(,=:[!&|;{?+-*%^~<>'.indexOf(prevChar) !== -1) return true;
          var keywords = ['return', 'case', 'typeof', 'void', 'delete', 'throw', 'yield', 'await', 'in', 'instanceof', 'of', 'new'];
          return keywords.indexOf(prevWord) !== -1;
        };

        for (var i = openParenIdx; i < clean.length; i++) {
          var ch = clean[i];
          var next = (i + 1 < clean.length) ? clean[i + 1] : '';

          var bkCount = 0;
          var b = i - 1;
          while (b >= 0 && clean.charAt(b) === '\\') { bkCount++; b--; }
          var isEscaped = (bkCount % 2 === 1);

          if (inLineComm) {
            if (ch === '\n' || ch === '\r') inLineComm = false;
            continue;
          }
          if (inBlockComm) {
            if (ch === '*' && next === '/') {
              inBlockComm = false;
              i++;
            }
            continue;
          }

          if (inStr) {
            if (ch === strChar && !isEscaped) {
              inStr = false;
              lastNonWsChar = strChar;
              lastWord = '';
            }
            continue;
          }

          if (inRegex) {
            if (ch === '[' && !isEscaped) inRegexCharClass = true;
            else if (ch === ']' && !isEscaped) inRegexCharClass = false;
            else if (ch === '/' && !isEscaped && !inRegexCharClass) {
              inRegex = false;
              while (i + 1 < clean.length && /[a-z]/i.test(clean.charAt(i + 1))) i++;
              lastNonWsChar = '/';
              lastWord = '';
            } else if (ch === '\n' || ch === '\r') {
              inRegex = false;
              inRegexCharClass = false;
            }
            continue;
          }

          var currentContext = stack.length > 0 ? stack[stack.length - 1] : null;

          if (currentContext === 'TEMPLATE_RAW') {
            if (ch === '`' && !isEscaped) {
              stack.pop();
              lastNonWsChar = '`';
              lastWord = '';
            } else if (ch === '$' && next === '{' && !isEscaped) {
              stack.push({ type: 'INTERPOLATION', braceDepth: 1 });
              lastNonWsChar = '{';
              lastWord = '';
              i++;
            }
            continue;
          }

          if (currentContext && currentContext.type === 'INTERPOLATION') {
            if (ch === '{') {
              currentContext.braceDepth++;
              lastNonWsChar = '{';
              lastWord = '';
              continue;
            }
            if (ch === '}') {
              currentContext.braceDepth--;
              if (currentContext.braceDepth === 0) {
                stack.pop();
              }
              lastNonWsChar = '}';
              lastWord = '';
              continue;
            }
          }

          if (ch === '/' && !isEscaped) {
            if (next === '/') {
              inLineComm = true;
              i++;
              continue;
            }
            if (next === '*') {
              inBlockComm = true;
              i++;
              continue;
            }
            if (isRegexPrefix(lastNonWsChar, lastWord)) {
              inRegex = true;
              inRegexCharClass = false;
              continue;
            }
          }

          if ((ch === '"' || ch === "'") && !isEscaped) {
            inStr = true;
            strChar = ch;
            continue;
          }
          if (ch === '`' && !isEscaped) {
            stack.push('TEMPLATE_RAW');
            continue;
          }

          if (stack.length === 0) {
            if (ch === '(') {
              depth++;
            } else if (ch === ')') {
              depth--;
              if (depth === 0) {
                closeParenIdx = i;
                break;
              }
            }
          }

          if (ch !== ' ' && ch !== '\t' && ch !== '\r' && ch !== '\n') {
            lastNonWsChar = ch;
            if (/[a-zA-Z0-9_$]/.test(ch)) lastWord += ch;
            else lastWord = '';
          } else {
            lastWord = '';
          }
        }

        if (closeParenIdx !== -1) {
          var searchBrace = clean.indexOf('{', closeParenIdx);
          if (searchBrace !== -1) {
            bodyStartIdx = searchBrace;
            headerPart = clean.slice(0, bodyStartIdx).trim();
            bodyPart = clean.slice(bodyStartIdx).trim();
          }
        }
      }

      var hasStatic = /\bstatic\b/.test(headerPart) || (isStatic === true);
      var hasAsync = /\basync\b/.test(headerPart);
      var isGenerator = headerPart.includes('*');

      var isGet = (targetKind === 'get') || (targetKind !== 'set' && /(?:^|\s)get\s+/.test(headerPart) && memberName !== 'get');
      var isSet = (targetKind === 'set') || (targetKind !== 'get' && /(?:^|\s)set\s+/.test(headerPart) && memberName !== 'set');

      var params = '()';
      var pStart = headerPart.indexOf('(');
      var pEnd = headerPart.lastIndexOf(')');
      if (pStart !== -1 && pEnd !== -1 && pEnd > pStart) {
        params = headerPart.slice(pStart, pEnd + 1);
      }

      if (memberName === 'constructor') {
        return 'constructor' + params + ' ' + bodyPart;
      }

      var out = '';
      if (hasStatic) out += 'static ';
      if (hasAsync && !isGet && !isSet) out += 'async ';
      if (isGenerator) out += '*';
      if (isGet) out += 'get ';
      if (isSet) out += 'set ';

      out += memberName + params + ' ' + bodyPart;
      return String(out).trim();
    }
  static findClassNodes(ast, targetClassName, targetMemberName, isStatic, targetKind) {
      var results = [];
      if (!ast || typeof ast !== 'object') return results;

      var walk = function(node, parent) {
        if (!node || typeof node !== 'object') return;

        if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
          var name = (node.id && node.id.name) ? node.id.name : null;

          if (!name && parent) {
            if (parent.type === 'VariableDeclarator' && parent.id && parent.id.name) {
              name = parent.id.name;
            } else if (parent.type === 'AssignmentExpression' && parent.left) {
              if (parent.left.type === 'Identifier') name = parent.left.name;
              else if (parent.left.type === 'MemberExpression' && parent.left.property) {
                name = parent.left.property.name || parent.left.property.value;
              }
            } else if (parent.type === 'ExportDefaultDeclaration') {
              name = 'default';
            }
          }

          var namesSet = new Set();
          if (name) namesSet.add(name);

          if (!targetClassName || namesSet.has(targetClassName) || (targetClassName === 'default' && namesSet.has('default'))) {
            results.push({
              node: node,
              name: name,
              names: namesSet,
              bodyNode: node.body,
              range: node.range
            });
          }
        }

        for (var key in node) {
          if (key === 'parent') continue;
          var child = node[key];
          if (Array.isArray(child)) {
            for (var i = 0; i < child.length; i++) {
              if (child[i] && typeof child[i].type === 'string') walk(child[i], node);
            }
          } else if (child && typeof child.type === 'string') {
            walk(child, node);
          }
        }
      };

      walk(ast, null);

      if (results.length === 0 && targetClassName) {
        var allClassNodes = LunoClassPatcher.findClassNodes(ast, null);

        if (allClassNodes.length === 1) {
          var loneClass = allClassNodes[0];
          if (typeof LunoPlaybackLogger !== 'undefined' && typeof LunoPlaybackLogger.warn === 'function') {
            LunoPlaybackLogger.warn(
              'AST Single-Class Fallback Notice',
              'Target class "' + targetClassName + '" not found; auto-resolved to lone class "' + (loneClass.name || 'Anonymous') + '".'
            );
          }
          return allClassNodes;
        }

        if (allClassNodes.length > 1 && targetMemberName) {
          var matchingClasses = [];
          for (var c = 0; c < allClassNodes.length; c++) {
            var candidate = allClassNodes[c];
            var match = LunoClassPatcher.findMemberInClass(candidate.node, targetMemberName, isStatic, targetKind);
            if (match && match.memberNode) {
              matchingClasses.push(candidate);
            }
          }

          if (matchingClasses.length === 1) {
            var resolvedClass = matchingClasses[0];
            if (typeof LunoPlaybackLogger !== 'undefined' && typeof LunoPlaybackLogger.warn === 'function') {
              LunoPlaybackLogger.warn(
                'AST Multi-Class Member Resolution Notice',
                'Target class "' + targetClassName + '" not found; auto-resolved member "' + targetMemberName + '" to class "' + (resolvedClass.name || 'Anonymous') + '".'
              );
            }
            return [resolvedClass];
          }
        }
      }

      return results;
    }
  static findMethodBounds(sourceCode, rawTarget) {
      if (!sourceCode || !rawTarget) return null;
      var parsed = LunoClassPatcher.parseSpec(rawTarget);
      var ast = LunoClassPatcher.parseAST(sourceCode);
      var classNodes = LunoClassPatcher.findClassNodes(ast, parsed.className);

      if (classNodes.length === 0) return null;
      var targetClass = classNodes[0];

      var match = LunoClassPatcher.findMemberInClass(
        targetClass.node || targetClass,
        parsed.memberName,
        parsed.isStatic,
        parsed.kind
      );

      if (match.memberNode && match.memberNode.range) {
        return { startIdx: match.memberNode.range[0], endIdx: match.memberNode.range[1] };
      }
      return null;
    }

  static deleteMethodInSource(existingSource, targetSpec) {
      if (!existingSource || typeof existingSource !== 'string' || !existingSource.trim()) {
        return existingSource;
      }

      var parsed = LunoClassPatcher.parseSpec(targetSpec);
      var ast = LunoClassPatcher.parseAST(existingSource);
      var classNodes = LunoClassPatcher.findClassNodes(ast, parsed.className);

      if (classNodes.length === 0) {
        throw new Error('[Luno AST Guard] Cannot delete member: Target class "' + parsed.className + '" not found in source AST.');
      }

      var targetClass = classNodes[0];
      var match = LunoClassPatcher.findMemberInClass(
        targetClass.node || targetClass,
        parsed.memberName,
        parsed.isStatic,
        parsed.kind
      );

      var memberNode = match.memberNode;

      if (!memberNode) {
        throw new Error(
          '[Luno AST Guard] Cannot delete member "' + (parsed.isStatic ? 'static ' : '') + parsed.memberName + '" from class "' + parsed.className + '": ' +
          'Member not found in class body. Available members: [' + match.availableMembers.join(', ') + '].'
        );
      }

      if (memberNode && memberNode.range) {
        var start = memberNode.range[0];
        var end = memberNode.range[1];

        var idx = start - 1;
        while (idx >= 0 && (existingSource[idx] === ' ' || existingSource[idx] === '\t' || existingSource[idx] === '\r' || existingSource[idx] === '\n')) {
          idx--;
        }
        if (idx >= 1 && existingSource[idx] === '/' && existingSource[idx - 1] === '*') {
          var commentStart = existingSource.lastIndexOf('/*', idx);
          if (commentStart !== -1) {
            idx = commentStart - 1;
            while (idx >= 0 && (existingSource[idx] === ' ' || existingSource[idx] === '\t' || existingSource[idx] === '\r' || existingSource[idx] === '\n')) {
              idx--;
            }
          }
        }
        start = Math.max(0, idx + 1);

        return existingSource.slice(0, start) + '\n' + existingSource.slice(end).replace(/^[\r\n]+/, '');
      }

      return existingSource;
    }

  static patchMethodInSource(existingSource, targetSpec, methodCode, options) {
      if (!existingSource || typeof existingSource !== 'string' || !existingSource.trim()) {
        throw new Error('[Luno AST Guard] Cannot patch method: existingSource is empty.');
      }

      var opts = options || {};
      var allowInsert = (opts.allowInsert !== false && opts.insertIfMissing !== false);
      var parsed = LunoClassPatcher.parseSpec(targetSpec);
      var className = parsed.className;
      var memberName = parsed.memberName;
      var isStatic = parsed.isStatic;
      var targetKind = parsed.kind;

      var rawMethodTrim = String(methodCode || '').trim();

      if (targetKind === 'method') {
        if (/^(?:static\s+)?get\s+[A-Za-z0-9_$#]+/.test(rawMethodTrim) && !/^(?:static\s+)?get\s*\(/i.test(rawMethodTrim)) {
          targetKind = 'get';
        } else if (/^(?:static\s+)?set\s+[A-Za-z0-9_$#]+/.test(rawMethodTrim) && !/^(?:static\s+)?set\s*\(/i.test(rawMethodTrim)) {
          targetKind = 'set';
        }
      }

      var ast = LunoClassPatcher.parseAST(existingSource);
      var classNodes = LunoClassPatcher.findClassNodes(ast, className, memberName, isStatic, targetKind);

      if (classNodes.length === 0) {
        var allFound = LunoClassPatcher.findClassNodes(ast).map(function(c) { return c.name || 'Anonymous'; });
        throw new Error('[Luno AST Guard] Target class "' + (className || 'target') + '" not found in source AST. Available classes: [' + allFound.join(', ') + '].');
      }

      var targetClassNode = classNodes[0].node || classNodes[0];
      var classBody = targetClassNode.body;

      if (!classBody || !Array.isArray(classBody.body) || !classBody.range) {
        throw new Error('[Luno AST Guard] Target class "' + (className || targetClassNode.id.name) + '" has an invalid class body in AST.');
      }

      var match = LunoClassPatcher.findMemberInClass(targetClassNode, memberName, isStatic, targetKind);
      var existingMemberNode = match.memberNode;
      var conflictingAccessorNode = match.conflictingAccessorNode;
      var availableMembers = match.availableMembers;

      if (!existingMemberNode && conflictingAccessorNode && targetKind === 'method') {
        var existKind = conflictingAccessorNode.kind;
        throw new Error(
          '[Luno AST Guard] Cannot patch member "' + memberName + '" in class "' + (className || targetClassNode.id.name) + '": ' +
          'Member already exists as a "' + existKind + '" accessor. ' +
          'Please specify \'data-method="' + (className || targetClassNode.id.name) + '.' + existKind + ' ' + memberName + '"\' or include \'' + existKind + '\' in the patch method signature.'
        );
      }

      var effectiveStatic = isStatic;
      if (effectiveStatic === null) {
        if (existingMemberNode) {
          effectiveStatic = Boolean(existingMemberNode.static);
        } else {
          effectiveStatic = /\bstatic\b/.test(methodCode);
        }
      }

      var cleanMethod = String(LunoClassPatcher.normalizeMethodCode(memberName, methodCode, effectiveStatic, targetKind) || '').trim();
      if (!cleanMethod) return existingSource;

      var targetIndentStr = '  ';
      if (existingMemberNode && existingMemberNode.range) {
        var lineStart = existingSource.lastIndexOf('\n', existingMemberNode.range[0]);
        var indentSub = existingSource.slice(lineStart === -1 ? 0 : lineStart + 1, existingMemberNode.range[0]);
        var indentMatch = indentSub.match(/^([ \t]*)/);
        if (indentMatch && indentMatch[1].length > 0) {
          targetIndentStr = indentMatch[1];
        }
      } else if (classBody.range) {
        var classLineStart = existingSource.lastIndexOf('\n', targetClassNode.range[0]);
        var classIndentSub = existingSource.slice(classLineStart === -1 ? 0 : classLineStart + 1, targetClassNode.range[0]);
        var classIndentMatch = classIndentSub.match(/^([ \t]*)/);
        targetIndentStr = (classIndentMatch ? classIndentMatch[1] : '') + '  ';
      }

      var rawLines = cleanMethod.split('\n');
      var minIndent = Infinity;
      for (var l = 0; l < rawLines.length; l++) {
        var line = rawLines[l];
        if (line.trim().length > 0) {
          var match2 = line.match(/^([ \t]*)/);
          if (match2 && match2[1].length < minIndent) {
            minIndent = match2[1].length;
          }
        }
      }
      if (minIndent === Infinity) minIndent = 0;

      var formattedMethod = rawLines.map(function(line) {
        if (line.trim().length === 0) return '';
        var relativeLine = line.slice(Math.min(line.length, minIndent));
        return targetIndentStr + relativeLine;
      }).join('\n');

      if (existingMemberNode && existingMemberNode.range) {
        var startIdx = existingMemberNode.range[0];
        var endIdx = existingMemberNode.range[1];

        var scanIdx = startIdx - 1;
        while (scanIdx >= 0 && (existingSource[scanIdx] === ' ' || existingSource[scanIdx] === '\t')) {
          scanIdx--;
        }

        var keepScanning = true;
        while (keepScanning && scanIdx >= 0) {
          if (existingSource[scanIdx] === '\n' || existingSource[scanIdx] === '\r') {
            var linePeek = scanIdx - 1;
            while (linePeek >= 0 && (existingSource[linePeek] === ' ' || existingSource[linePeek] === '\t')) {
              linePeek--;
            }
            if (linePeek >= 1 && existingSource[linePeek] === '/' && existingSource[linePeek - 1] === '*') {
              var commentStart = existingSource.lastIndexOf('/*', linePeek);
              if (commentStart !== -1) {
                var preC = commentStart - 1;
                while (preC >= 0 && (existingSource[preC] === ' ' || existingSource[preC] === '\t')) preC--;
                if (preC < 0 || existingSource[preC] === '\n' || existingSource[preC] === '\r') {
                  startIdx = Math.max(0, preC + 1);
                  scanIdx = preC;
                  continue;
                }
              }
            } else if (linePeek >= 0) {
              var prevLineStart = existingSource.lastIndexOf('\n', linePeek);
              var prevLine = existingSource.slice(prevLineStart === -1 ? 0 : prevLineStart + 1, linePeek + 1).trim();
              if (prevLine.startsWith('//')) {
                startIdx = prevLineStart === -1 ? 0 : prevLineStart + 1;
                scanIdx = prevLineStart;
                continue;
              }
            }
          }
          keepScanning = false;
        }

        var before = existingSource.slice(0, startIdx).trimEnd();
        var after = existingSource.slice(endIdx);
        if (after.startsWith(';')) {
          after = after.slice(1);
        }
        after = after.replace(/^[\r\n]+/, '');

        return before + '\n\n' + formattedMethod + '\n' + after;
      }

      var closeMatch = null;
      var targetLower = memberName.toLowerCase();
      for (var a = 0; a < availableMembers.length; a++) {
        var cleanAvail = availableMembers[a].replace(/^(?:static\s+|get\s+|set\s+)+/, '');
        var availLower = cleanAvail.toLowerCase();
        if (availLower === targetLower) {
          closeMatch = cleanAvail;
          break;
        }
        if (availLower.startsWith(targetLower) && availLower.length - targetLower.length <= 3) {
          closeMatch = cleanAvail;
          break;
        }
        if (targetLower.startsWith(availLower) && targetLower.length - availLower.length <= 3) {
          closeMatch = cleanAvail;
          break;
        }
      }

      if (closeMatch) {
        var notice = '[Luno AST Guard] Notice: Member "' + memberName + '" not found in class "' + (className || targetClassNode.id.name) + '", but similar member "' + closeMatch + '" exists in class body.';
        console.warn(notice);
        if (typeof LunoPlaybackLogger !== 'undefined' && LunoPlaybackLogger.warn) {
          LunoPlaybackLogger.warn('AST Member Similarity Notice', 'Target: ' + memberName + ' | Existing: ' + closeMatch + ' in class ' + (className || targetClassNode.id.name));
        }
      }

      if (!allowInsert) {
        throw new Error(
          '[Luno AST Guard] Target member "' + (effectiveStatic ? 'static ' : '') + memberName + '" was not found in class "' + (className || targetClassNode.id.name) + '". ' +
          (closeMatch ? ('(Did you mean "' + closeMatch + '"?) ') : '') +
          'Available members: [' + availableMembers.join(', ') + '].'
        );
      }

      var lastMember = (classBody.body && classBody.body.length > 0) ? classBody.body[classBody.body.length - 1] : null;
      var insertPos = (lastMember && lastMember.range) ? lastMember.range[1] : (classBody.range[0] + 1);

      var beforeInsert = existingSource.slice(0, insertPos).trimEnd();
      var afterInsert = existingSource.slice(insertPos);

      return beforeInsert + '\n\n' + formattedMethod + '\n' + afterInsert.trimStart();
    }
  static findMemberInClass(classNode, memberName, isStatic, targetKind) {
      if (!classNode || !classNode.body || !Array.isArray(classNode.body.body)) {
        return { memberNode: null, conflictingAccessorNode: null, availableMembers: [] };
      }

      var memberNode = null;
      var conflictingAccessorNode = null;
      var availableMembers = [];

      for (var i = 0; i < classNode.body.body.length; i++) {
        var member = classNode.body.body[i];
        if (member.type === 'MethodDefinition' || member.type === 'PropertyDefinition' || member.type === 'ClassProperty') {
          var keyName = member.key ? (member.key.name || member.key.value) : null;
          if (keyName) {
            var prefix = member.static ? 'static ' : '';
            if (member.kind === 'get') prefix += 'get ';
            else if (member.kind === 'set') prefix += 'set ';
            availableMembers.push(prefix + keyName);
          }

          var staticMatch = (isStatic === null || isStatic === undefined) ? true : (Boolean(member.static) === Boolean(isStatic));
          var memberKind = member.kind || (member.type === 'PropertyDefinition' ? 'property' : 'method');
          var kindMatch = false;

          if (targetKind === 'get' || targetKind === 'set') {
            kindMatch = (memberKind === targetKind);
          } else if (targetKind === 'constructor') {
            kindMatch = (memberKind === 'constructor');
          } else {
            kindMatch = (memberKind === 'method' || memberKind === 'constructor' || memberKind === 'property');
          }

          if (keyName === memberName && staticMatch) {
            if (kindMatch) {
              memberNode = member;
            } else if (memberKind === 'get' || memberKind === 'set') {
              conflictingAccessorNode = member;
            }
          }
        }
      }

      return {
        memberNode: memberNode,
        conflictingAccessorNode: conflictingAccessorNode,
        availableMembers: availableMembers
      };
    }

  static extractFileTopology(sourceCode, filePath) {
      if (!sourceCode || typeof sourceCode !== 'string') return [];
      var classes = [];

      var ast = null;
      try {
        if (typeof LunoClassPatcher !== 'undefined' && LunoClassPatcher.parseAST) {
          ast = LunoClassPatcher.parseAST(sourceCode);
        } else if (typeof acorn !== 'undefined' && acorn.parse) {
          ast = acorn.parse(sourceCode, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
        }
      } catch (e) {
        try {
          if (typeof acorn !== 'undefined' && acorn.parse) {
            ast = acorn.parse(sourceCode, { ecmaVersion: 'latest', sourceType: 'script', ranges: true });
          }
        } catch (e2) {}
      }

      if (ast && Array.isArray(ast.body)) {
        var classesInFile = [];
        var walk = function(node, parent) {
          if (!node || typeof node !== 'object') return;
          if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
            var clsName = (node.id && node.id.name) ? node.id.name : null;
            if (!clsName && parent) {
              if (parent.type === 'VariableDeclarator' && parent.id && parent.id.name) clsName = parent.id.name;
              else if (parent.type === 'AssignmentExpression' && parent.left) {
                if (parent.left.type === 'Identifier') clsName = parent.left.name;
                else if (parent.left.type === 'MemberExpression' && parent.left.property) {
                  clsName = parent.left.property.name || parent.left.property.value;
                }
              } else if (parent.type === 'ExportDefaultDeclaration') {
                clsName = 'default';
              }
            }
            if (node.body && Array.isArray(node.body.body)) {
              classesInFile.push({ name: clsName || 'AnonymousClass', node: node });
            }
          }
          for (var k in node) {
            if (k === 'parent') continue;
            var child = node[k];
            if (Array.isArray(child)) {
              for (var ci = 0; ci < child.length; ci++) {
                if (child[ci] && typeof child[ci].type === 'string') walk(child[ci], node);
              }
            } else if (child && typeof child.type === 'string') {
              walk(child, node);
            }
          }
        };
        walk(ast, null);

        classesInFile.forEach(function(cls) {
          var methods = [];
          var bodyMembers = cls.node.body.body;
          for (var mIdx = 0; mIdx < bodyMembers.length; mIdx++) {
            var member = bodyMembers[mIdx];
            if (member.type === 'MethodDefinition' || member.type === 'PropertyDefinition' || member.type === 'ClassProperty') {
              var keyName = member.key ? (member.key.name || member.key.value) : null;
              if (!keyName) continue;

              var prefix = member.static ? 'static ' : '';
              if (member.kind === 'get') prefix += 'get ';
              else if (member.kind === 'set') prefix += 'set ';
              else if (member.value && member.value.async) prefix += 'async ';

              var isGen = (member.value && member.value.generator) ? '*' : '';
              var paramList = [];
              if (member.value && Array.isArray(member.value.params)) {
                paramList = member.value.params.map(function(p) {
                  if (p.type === 'Identifier') return p.name;
                  if (p.type === 'AssignmentPattern' && p.left && p.left.name) return p.left.name;
                  if (p.type === 'RestElement' && p.argument && p.argument.name) return '...' + p.argument.name;
                  if (p.range) return sourceCode.slice(p.range[0], p.range[1]);
                  return 'arg';
                });
              }

              var isFieldArrow = (member.type === 'PropertyDefinition' || member.type === 'ClassProperty') &&
                member.value && (member.value.type === 'ArrowFunctionExpression' || member.value.type === 'FunctionExpression');

              if (isFieldArrow && member.value.params) {
                paramList = member.value.params.map(function(p) {
                  return (p.type === 'Identifier') ? p.name : (p.range ? sourceCode.slice(p.range[0], p.range[1]) : 'arg');
                });
              }

              var sig = prefix + isGen + keyName + '(' + paramList.join(', ') + ')';
              if ((member.type === 'PropertyDefinition' || member.type === 'ClassProperty') && !isFieldArrow) {
                sig = prefix + keyName;
              }
              methods.push('  • ' + sig);
            }
          }

          if (methods.length > 0 || cls.name) {
            classes.push({
              className: cls.name,
              isUnverified: false,
              methods: methods
            });
          }
        });
      } else {
        var classRegex = /\bclass\s+([A-Za-z0-9_$]+)/g;
        var match;
        while ((match = classRegex.exec(sourceCode)) !== null) {
          var cName = match[1];
          var methodRegex = /(?:static\s+)?(?:async\s+)?(?:\*[\s]*)?(?:get\s+|set\s+)?([A-Za-z0-9_$#]+)\s*\(([^)]*)\)\s*\{/g;
          var mMatch;
          var rMethods = [];
          while ((mMatch = methodRegex.exec(sourceCode)) !== null) {
            if (mMatch[1] !== 'if' && mMatch[1] !== 'for' && mMatch[1] !== 'while' && mMatch[1] !== 'switch' && mMatch[1] !== 'function') {
              rMethods.push('  • ' + mMatch[0].replace(/\s*\{$/, ''));
            }
          }
          classes.push({
            className: cName,
            isUnverified: true,
            methods: rMethods
          });
        }
      }

      return classes;
    }
}

if (typeof window !== 'undefined') window.LunoClassPatcher = LunoClassPatcher;
globalThis.LunoClassPatcher = LunoClassPatcher;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoClassPatcher;