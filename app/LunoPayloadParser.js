class LunoPayloadParser {
  constructor() {}

  static stripMarkdownFences(text) {
      if (!text || typeof text !== 'string') return '';
      var cleaned = text.trim();

      // Match leading markdown code fence with 3 or more backticks or tildes and optional language tag
      var openFenceMatch = cleaned.match(/^(`{3,}|~{3,})[a-zA-Z0-9_\-]*\r?\n/);
      if (openFenceMatch) {
        cleaned = cleaned.slice(openFenceMatch[0].length);
        cleaned = cleaned.trimEnd();

        // Match trailing closing fence anchored at the end of the text
        var closeFenceMatch = cleaned.match(/\r?\n(`{3,}|~{3,})\s*$/);
        if (closeFenceMatch) {
          cleaned = cleaned.slice(0, cleaned.length - closeFenceMatch[0].length).trimEnd();
        } else if (/^(`{3,}|~{3,})\s*$/.test(cleaned)) {
          cleaned = '';
        }
      }

      return cleaned;
    }
  static getAttrValue(str, attrName) {
    if (!str || !attrName) return '';
    var regex = new RegExp('(?:^|\\s)' + attrName + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
    var match = str.match(regex);
    if (match) {
      return match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : (match[3] || ''));
    }
    return '';
  }

  static parse(text) {
      if (!text || typeof text !== 'string') {
        return { files: [], serverScript: '', clientScript: '', requests: [], debugLogs: ['Input text is empty'] };
      }

      var rawInputLen = text.length;
      var cleaned = LunoPayloadParser.stripMarkdownFences(text);

      var files = [];
      var serverScript = '';
      var clientScript = '';
      var requests = [];
      var debugLogs = [];
      var pos = 0;
      var len = cleaned.length;

      var SCRIPT_WORD = 'scr' + 'ipt';
      var STYLE_WORD = 'sty' + 'le';
      var TEMPLATE_WORD = 'temp' + 'late';
      var SVG_WORD = 'sv' + 'g';

      while (pos < len) {
        var openIdx = cleaned.indexOf('<', pos);
        if (openIdx === -1) break;

        var isClose = cleaned.substring(openIdx, openIdx + 2) === '</';
        if (isClose) {
          pos = openIdx + 2;
          continue;
        }

        var tagWord = null;
        var rest = cleaned.substring(openIdx + 1);

        if (rest.indexOf(SCRIPT_WORD) === 0) tagWord = SCRIPT_WORD;
        else if (rest.indexOf(STYLE_WORD) === 0) tagWord = STYLE_WORD;
        else if (rest.indexOf(TEMPLATE_WORD) === 0) tagWord = TEMPLATE_WORD;
        else if (rest.indexOf(SVG_WORD) === 0) tagWord = SVG_WORD;

        if (!tagWord) {
          pos = openIdx + 1;
          continue;
        }

        var nextChar = cleaned.charAt(openIdx + 1 + tagWord.length);
        if (nextChar && nextChar !== ' ' && nextChar !== '\t' && nextChar !== '\n' && nextChar !== '\r' && nextChar !== '>') {
          pos = openIdx + 1;
          continue;
        }

        var headerEndIdx = -1;
        var inAttrQuote = false;
        var attrQuoteChar = '';
        for (var h = openIdx + 1 + tagWord.length; h < len; h++) {
          var ch = cleaned.charAt(h);
          if (inAttrQuote) {
            var bkCount = 0;
            var bkIdx = h - 1;
            while (bkIdx >= 0 && cleaned.charAt(bkIdx) === '\\') { bkCount++; bkIdx--; }
            if (ch === attrQuoteChar && (bkCount % 2 === 0)) inAttrQuote = false;
          } else if (ch === '"' || ch === "'") {
            inAttrQuote = true;
            attrQuoteChar = ch;
          } else if (ch === '>') {
            headerEndIdx = h;
            break;
          }
        }

        if (headerEndIdx === -1) break;

        var headerStr = cleaned.substring(openIdx + 1 + tagWord.length, headerEndIdx);
        var closeTag = '</' + tagWord;
        var closeSearchIdx = -1;
        var i = headerEndIdx + 1;

        var isScript = (tagWord === SCRIPT_WORD);
        var isStyle = (tagWord === STYLE_WORD);
        var isMarkup = (tagWord === TEMPLATE_WORD || tagWord === SVG_WORD);

        var inString = false;
        var strChar = '';
        var inLineComment = false;
        var inBlockComment = false;
        var inHtmlComment = false;
        var inMarkupQuote = false;
        var markupQuoteChar = '';
        var inRegex = false;
        var inRegexCharClass = false;
        var stack = [];
        var lastNonWsChar = '';
        var lastWord = '';

        var isRegexPrefix = function(prevChar, prevWord) {
          if (!prevChar) return true;
          if ('(,=:[!&|;{?+-*%^~<>'.indexOf(prevChar) !== -1) return true;
          var keywords = ['return', 'case', 'typeof', 'void', 'delete', 'throw', 'yield', 'await', 'in', 'instanceof', 'of', 'new'];
          return keywords.indexOf(prevWord) !== -1;
        };

        while (i < len) {
          var curr = cleaned.charAt(i);
          var next = (i + 1 < len) ? cleaned.charAt(i + 1) : '';

          var backslashCount = 0;
          var b = i - 1;
          while (b >= 0 && cleaned.charAt(b) === '\\') { backslashCount++; b--; }
          var isEscaped = (backslashCount % 2 === 1);

          if (isStyle) {
            if (inBlockComment) {
              if (curr === '*' && next === '/') { inBlockComment = false; i += 2; continue; }
              i++;
              continue;
            }
            if (inString) {
              if (curr === strChar && !isEscaped) inString = false;
              i++;
              continue;
            }
            if (curr === '/' && next === '*' && !isEscaped) { inBlockComment = true; i += 2; continue; }
            if ((curr === '"' || curr === "'") && !isEscaped) { inString = true; strChar = curr; i++; continue; }
            if (curr === '<' && cleaned.substring(i, i + closeTag.length) === closeTag) {
              var afterCloseIdx = i + closeTag.length;
              while (afterCloseIdx < len && (cleaned.charAt(afterCloseIdx) === ' ' || cleaned.charAt(afterCloseIdx) === '\t' || cleaned.charAt(afterCloseIdx) === '\r' || cleaned.charAt(afterCloseIdx) === '\n')) afterCloseIdx++;
              if (afterCloseIdx < len && cleaned.charAt(afterCloseIdx) === '>') { closeSearchIdx = i; break; }
            }
            i++;
            continue;
          }

          if (isMarkup) {
            if (inHtmlComment) {
              if (curr === '-' && next === '-' && (i + 2 < len) && cleaned.charAt(i + 2) === '>') { inHtmlComment = false; i += 3; continue; }
              i++;
              continue;
            }
            if (inMarkupQuote) {
              if (curr === markupQuoteChar && !isEscaped) inMarkupQuote = false;
              i++;
              continue;
            }
            if (curr === '<' && next === '!' && cleaned.substring(i, i + 4) === '<!--') { inHtmlComment = true; i += 4; continue; }
            if ((curr === '"' || curr === "'") && !isEscaped) { inMarkupQuote = true; markupQuoteChar = curr; i++; continue; }

            if (curr === '<' && cleaned.substring(i, i + closeTag.length) === closeTag) {
              var afterCloseIdx2 = i + closeTag.length;
              while (afterCloseIdx2 < len && (cleaned.charAt(afterCloseIdx2) === ' ' || cleaned.charAt(afterCloseIdx2) === '\t' || cleaned.charAt(afterCloseIdx2) === '\r' || cleaned.charAt(afterCloseIdx2) === '\n')) afterCloseIdx2++;
              if (afterCloseIdx2 < len && cleaned.charAt(afterCloseIdx2) === '>') { closeSearchIdx = i; break; }
            }
            i++;
            continue;
          }

          var currentContext = stack.length > 0 ? stack[stack.length - 1] : null;
          var isInsideRawTemplate = (currentContext === 'TEMPLATE_RAW');

          if (inLineComment) {
            if (curr === '\n' || curr === '\r') inLineComment = false;
            i++;
            continue;
          }
          if (inBlockComment) {
            if (curr === '*' && next === '/') { inBlockComment = false; i += 2; continue; }
            i++;
            continue;
          }
          if (inString) {
            if (curr === strChar && !isEscaped) { inString = false; lastNonWsChar = strChar; lastWord = ''; }
            i++;
            continue;
          }
          if (inRegex) {
            if (curr === '[' && !isEscaped) inRegexCharClass = true;
            else if (curr === ']' && !isEscaped) inRegexCharClass = false;
            else if (curr === '/' && !isEscaped && !inRegexCharClass) {
              inRegex = false;
              i++;
              while (i < len && /[a-z]/i.test(cleaned.charAt(i))) i++;
              lastNonWsChar = '/';
              lastWord = '';
              continue;
            } else if (curr === '\n' || curr === '\r') {
              inRegex = false;
              inRegexCharClass = false;
            }
            i++;
            continue;
          }

          if (isInsideRawTemplate) {
            if (curr === '`' && !isEscaped) { stack.pop(); lastNonWsChar = '`'; lastWord = ''; i++; continue; }
            if (curr === '$' && next === '{' && !isEscaped) {
              stack.push({ type: 'INTERPOLATION', braceDepth: 1 });
              lastNonWsChar = '{';
              lastWord = '';
              i += 2;
              continue;
            }
            i++;
            continue;
          }

          if (currentContext && currentContext.type === 'INTERPOLATION') {
            if (curr === '{') {
              currentContext.braceDepth++;
              lastNonWsChar = '{';
              lastWord = '';
              i++;
              continue;
            }
            if (curr === '}') {
              currentContext.braceDepth--;
              if (currentContext.braceDepth === 0) stack.pop();
              lastNonWsChar = '}';
              lastWord = '';
              i++;
              continue;
            }
          }

          if (curr === '/' && !isEscaped) {
            if (next === '/') { inLineComment = true; i += 2; continue; }
            if (next === '*') { inBlockComment = true; i += 2; continue; }
            if (isRegexPrefix(lastNonWsChar, lastWord)) { inRegex = true; inRegexCharClass = false; i++; continue; }
          }

          if ((curr === '"' || curr === "'") && !isEscaped) { inString = true; strChar = curr; i++; continue; }
          if (curr === '`' && !isEscaped) { stack.push('TEMPLATE_RAW'); i++; continue; }

          if (stack.length === 0 && curr === '<' && cleaned.substring(i, i + closeTag.length) === closeTag) {
            var afterCloseIdx3 = i + closeTag.length;
            while (afterCloseIdx3 < len && (cleaned.charAt(afterCloseIdx3) === ' ' || cleaned.charAt(afterCloseIdx3) === '\t' || cleaned.charAt(afterCloseIdx3) === '\r' || cleaned.charAt(afterCloseIdx3) === '\n')) afterCloseIdx3++;
            if (afterCloseIdx3 < len && cleaned.charAt(afterCloseIdx3) === '>') { closeSearchIdx = i; break; }
          }

          if (curr !== ' ' && curr !== '\t' && curr !== '\r' && curr !== '\n') {
            lastNonWsChar = curr;
            if (/[a-zA-Z0-9_$]/.test(curr)) lastWord += curr;
            else lastWord = '';
          } else {
            lastWord = '';
          }
          i++;
        }

        if (closeSearchIdx === -1) {
          var simpleIdx = cleaned.indexOf(closeTag, headerEndIdx + 1);
          if (simpleIdx !== -1) {
            var afterIdx = simpleIdx + closeTag.length;
            while (afterIdx < len && (cleaned.charAt(afterIdx) === ' ' || cleaned.charAt(afterIdx) === '\t' || cleaned.charAt(afterIdx) === '\r' || cleaned.charAt(afterIdx) === '\n')) afterIdx++;
            if (afterIdx < len && cleaned.charAt(afterIdx) === '>') closeSearchIdx = simpleIdx;
          }
        }

        if (closeSearchIdx === -1) { pos = headerEndIdx + 1; continue; }
        var closeEndIdx = cleaned.indexOf('>', closeSearchIdx);
        if (closeEndIdx === -1) { pos = headerEndIdx + 1; continue; }

        var innerContent = cleaned.substring(headerEndIdx + 1, closeSearchIdx).trim();
        var rawFilePath = LunoPayloadParser.getAttrValue(headerStr, 'data-file');
        var filePath = rawFilePath ? rawFilePath.replace(/\\/g, '/').replace(/^\/+/, '').trim() : '';
        var methodSpec = LunoPayloadParser.getAttrValue(headerStr, 'data-method');
        var action = LunoPayloadParser.getAttrValue(headerStr, 'data-action') || 'write';
        var typeAttr = LunoPayloadParser.getAttrValue(headerStr, 'type');

        action = action.toLowerCase();
        typeAttr = typeAttr.toLowerCase();

        var isJsScript = isScript && typeAttr !== 'application/json' && typeAttr !== 'text/plain' && typeAttr !== 'application/luno-request' && action !== 'request';

        if (isJsScript && innerContent) {
          var validateJs = function(code, isMethod) {
            var acornObj = (typeof window !== 'undefined' && window.acorn) || (typeof globalThis !== 'undefined' && globalThis.acorn);
            if (!acornObj && typeof require !== 'undefined') {
              try { acornObj = require('acorn'); } catch (e) {}
            }
            if (!acornObj || typeof acornObj.parse !== 'function') return true;

            var testCode = isMethod ? ('class __ValidationWrapper__ {\n' + code + '\n}') : code;
            var opts = { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true, allowImportExportEverywhere: true };
            try {
              acornObj.parse(testCode, opts);
              return true;
            } catch (e) {
              try {
                opts.sourceType = 'script';
                acornObj.parse(testCode, opts);
                return true;
              } catch (e2) {
                return false;
              }
            }
          };

          var isMethodPatch = Boolean(methodSpec || action === 'patch');
          var isValid = validateJs(innerContent, isMethodPatch);

          if (!isValid) {
            var nextCloseIdx = cleaned.indexOf(closeTag, closeEndIdx + 1);
            while (!isValid && nextCloseIdx !== -1) {
              var afterNext = nextCloseIdx + closeTag.length;
              while (afterNext < len && (cleaned.charAt(afterNext) === ' ' || cleaned.charAt(afterNext) === '\t' || cleaned.charAt(afterNext) === '\r' || cleaned.charAt(afterNext) === '\n')) afterNext++;
              if (afterNext < len && cleaned.charAt(afterNext) === '>') {
                var candidateContent = cleaned.substring(headerEndIdx + 1, nextCloseIdx).trim();
                if (validateJs(candidateContent, isMethodPatch)) {
                  innerContent = candidateContent;
                  closeSearchIdx = nextCloseIdx;
                  closeEndIdx = afterNext;
                  isValid = true;
                  var warnMsg = 'Recovered boundary for <script data-file="' + filePath + '"> by advancing to boundary offset ' + nextCloseIdx;
                  debugLogs.push(warnMsg);
                  if (typeof LunoPlaybackLogger !== 'undefined' && typeof LunoPlaybackLogger.warn === 'function') {
                    LunoPlaybackLogger.warn('Parser Boundary Recovery', warnMsg);
                  }
                  break;
                }
              }
              nextCloseIdx = cleaned.indexOf(closeTag, nextCloseIdx + closeTag.length);
            }

            if (!isValid) {
              debugLogs.push('Script container for "' + (filePath || 'anonymous') + '" generated AST syntax warnings during boundary scan');
            }
          }
        }

        if (typeAttr === 'application/luno-request' || action === 'request') {
          requests.push({ tagName: tagWord, filePath, methodSpec, content: innerContent });
        } else if (action === 'run-server' || filePath === 'RUN: SERVER') {
          serverScript += (serverScript ? '\n\n' : '') + innerContent;
        } else if (action === 'run-client' || filePath === 'RUN: CLIENT') {
          clientScript += (clientScript ? '\n\n' : '') + innerContent;
        } else if (filePath && filePath !== '...') {
          files.push({ tagName: tagWord, filePath, methodSpec, action, content: innerContent });
        }

        pos = closeEndIdx + 1;
      }

      return { files, serverScript, clientScript, requests, debugLogs };
  }
  static parsePatchLog(patchLogHtml) {
    return LunoPayloadParser.parse(patchLogHtml);
  }
}

globalThis.LunoPayloadParser = LunoPayloadParser;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoPayloadParser;