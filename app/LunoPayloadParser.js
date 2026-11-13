class LunoPayloadParser {
  constructor() {}

  static stripMarkdownFences(text) {
      if (!text || typeof text !== 'string') return '';
      var cleaned = text.trim();

      if (cleaned.indexOf('`') !== -1 || cleaned.indexOf('~') !== -1) {
        var extracted = LunoPayloadParser._extractFencedContainerText(cleaned);
        if (extracted !== null) {
          return extracted;
        }
      }

      var openFenceMatch = cleaned.match(/^[ \t]*(`{3,}|~{3,})[a-zA-Z0-9_\-]*\r?\n/);
      if (openFenceMatch) {
        cleaned = cleaned.slice(openFenceMatch[0].length);
        cleaned = cleaned.trimEnd();

        var closeFenceMatch = cleaned.match(/\r?\n[ \t]*(`{3,}|~{3,})[ \t]*$/);
        if (closeFenceMatch) {
          cleaned = cleaned.slice(0, cleaned.length - closeFenceMatch[0].length).trimEnd();
        } else if (/^[ \t]*(`{3,}|~{3,})[ \t]*$/.test(cleaned)) {
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

        var tickCheck = LunoPayloadParser._isInsideInlineBacktick(cleaned, openIdx);
        if (tickCheck.inside) {
          pos = tickCheck.closeEnd;
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

        var headerEndIdx = LunoPayloadParser._findHeaderEnd(cleaned, openIdx + 1 + tagWord.length);
        if (headerEndIdx === -1) break;

        var headerStr = cleaned.substring(openIdx + 1 + tagWord.length, headerEndIdx);

        if (!LunoPayloadParser._isContainerHeader(headerStr)) {
          pos = openIdx + 1;
          continue;
        }

        var closeInfo = LunoPayloadParser._findClosingTag(cleaned, headerEndIdx, tagWord);
        if (!closeInfo) {
          pos = headerEndIdx + 1;
          continue;
        }

        var closeSearchIdx = closeInfo.closeSearchIdx;
        var closeEndIdx = closeInfo.closeEndIdx;
        var closeTag = '</' + tagWord;
        var isScript = (tagWord === SCRIPT_WORD);

        var innerContent = cleaned.substring(headerEndIdx + 1, closeSearchIdx).trim();
        var rawFilePath = LunoPayloadParser.getAttrValue(headerStr, 'data-file');
        var filePath = rawFilePath ? rawFilePath.replace(/\\/g, '/').replace(/^\/+/, '').trim() : '';
        var methodSpec = LunoPayloadParser.getAttrValue(headerStr, 'data-method') || LunoPayloadParser.getAttrValue(headerStr, 'data-block');
        var action = (LunoPayloadParser.getAttrValue(headerStr, 'data-action') || 'write').toLowerCase();
        var typeAttr = LunoPayloadParser.getAttrValue(headerStr, 'type').toLowerCase();

        var isJsScript = isScript && typeAttr !== 'application/json' && typeAttr !== 'text/plain' && typeAttr !== 'application/luno-request' && action !== 'request';

        if (!isJsScript) {
          var innerFenceThenContainer = /\r?\n[ \t]*(?:`{2,}|~{2,})[^\n]*\r?\n[\s\S]*?<(?:script|style|template|svg)\b[^>]*\b(?:data-file|data-action|type)\s*=/i.test(innerContent);
          if (innerFenceThenContainer) {
            pos = headerEndIdx + 1;
            continue;
          }
        }

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
            var hasInnerContainer = /<(?:script|style|template|svg)\b[^>]*\b(?:data-file|data-action|type)\s*=/i.test(innerContent);
            if (hasInnerContainer) {
              pos = headerEndIdx + 1;
              continue;
            }

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
                  var warnMsg = 'Recovered boundary for <' + SCRIPT_WORD + ' data-file="' + filePath + '"> by advancing to boundary offset ' + nextCloseIdx;
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
          requests.push({ tagName: tagWord, filePath: filePath, methodSpec: methodSpec, content: innerContent });
        } else if (action === 'run-server' || filePath === 'RUN: SERVER') {
          serverScript += (serverScript ? '\n\n' : '') + innerContent;
        } else if (action === 'run-client' || filePath === 'RUN: CLIENT') {
          clientScript += (clientScript ? '\n\n' : '') + innerContent;
        } else if (filePath && filePath !== '...') {
          files.push({ tagName: tagWord, filePath: filePath, methodSpec: methodSpec, action: action, content: innerContent });
        }

        pos = closeEndIdx + 1;
      }

      return { files: files, serverScript: serverScript, clientScript: clientScript, requests: requests, debugLogs: debugLogs };
    }
  static parsePatchLog(patchLogHtml) {
    return LunoPayloadParser.parse(patchLogHtml);
  }

  static _isContainerHeader(headerStr) {
      if (!headerStr || typeof headerStr !== 'string') return false;
      var filePath = LunoPayloadParser.getAttrValue(headerStr, 'data-file').replace(/\\/g, '/').replace(/^\/+/, '').trim();
      var action = LunoPayloadParser.getAttrValue(headerStr, 'data-action').toLowerCase().trim();
      var typeAttr = LunoPayloadParser.getAttrValue(headerStr, 'type').toLowerCase().trim();

      if (typeAttr === 'application/luno-request' || action === 'request') return true;
      if (action === 'run-server' || action === 'run-client') return true;
      if (filePath && filePath !== '...') return true;
      return false;
    }

  static _findHeaderEnd(str, afterTagIdx) {
      var len = str.length;
      var inAttrQuote = false;
      var attrQuoteChar = '';
      for (var h = afterTagIdx; h < len; h++) {
        var ch = str.charAt(h);
        if (inAttrQuote) {
          var bkCount = 0;
          var bkIdx = h - 1;
          while (bkIdx >= 0 && str.charAt(bkIdx) === '\\') { bkCount++; bkIdx--; }
          if (ch === attrQuoteChar && (bkCount % 2 === 0)) inAttrQuote = false;
        } else if (ch === '"' || ch === "'") {
          inAttrQuote = true;
          attrQuoteChar = ch;
        } else if (ch === '>') {
          return h;
        }
      }
      return -1;
    }

  static _findClosingTag(cleaned, headerEndIdx, tagWord) {
      var len = cleaned.length;
      var SCRIPT_WORD = 'scr' + 'ipt';
      var STYLE_WORD = 'sty' + 'le';
      var TEMPLATE_WORD = 'temp' + 'late';
      var SVG_WORD = 'sv' + 'g';

      var closeTag = '</' + tagWord;
      var closeSearchIdx = -1;
      var i = headerEndIdx + 1;

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

      if (closeSearchIdx === -1) return null;
      var closeEndIdx = cleaned.indexOf('>', closeSearchIdx);
      if (closeEndIdx === -1) return null;
      return { closeSearchIdx: closeSearchIdx, closeEndIdx: closeEndIdx };
    }

  static _extractFencedContainerText(text) {
      if (!text || typeof text !== 'string') return null;
      var len = text.length;
      var blocks = [];
      var currentFence = null;
      var hasFenceSeen = false;
      var pos = 0;

      while (pos < len) {
        var nlIdx = text.indexOf('\n', pos);
        var lineEnd = nlIdx !== -1 ? nlIdx : len;
        var nextPos = nlIdx !== -1 ? nlIdx + 1 : len;
        var lineRaw = text.slice(pos, lineEnd);
        var lineNoCr = lineRaw.endsWith('\r') ? lineRaw.slice(0, -1) : lineRaw;

        if (currentFence === null) {
          var openMatch = lineNoCr.match(/^[ \t]*(`{2,}|~{2,})[ \t]*([a-zA-Z0-9_\-]*)[ \t]*(.*)$/);
          var midOpenMatch = !openMatch ? lineNoCr.match(/(?:[ \t:])(`{3,}|~{3,})[ \t]*(html|htm|xml|svg|luno)?[ \t]*(<(?:script|style|template|svg)\b[\s\S]*)?$/i) : null;

          if (openMatch) {
            var fenceToken = openMatch[1];
            var fenceChar = fenceToken.charAt(0);
            var fenceLen = fenceToken.length;
            var lang = (openMatch[2] || '').toLowerCase();
            var trailing = openMatch[3] || '';
            var isSameLineContainer = /^(<(?:script|style|template|svg)\b)/i.test(trailing);

            var isValidOpener = false;
            if (fenceLen >= 3) {
              isValidOpener = (trailing === '' || isSameLineContainer);
            } else if (fenceLen === 2) {
              if (isSameLineContainer) {
                isValidOpener = true;
              } else if (trailing === '' && /^(?:html|htm|xml|svg|luno)$/i.test(lang)) {
                isValidOpener = true;
              } else if (trailing === '' && lang === '') {
                var peekRest = text.slice(nextPos).trimStart();
                if (/^<(?:script|style|template|svg)\b/i.test(peekRest)) {
                  isValidOpener = true;
                }
              }
            }

            if (isValidOpener) {
              hasFenceSeen = true;
              var contentStart = isSameLineContainer
                ? (pos + lineNoCr.indexOf(trailing))
                : nextPos;
              currentFence = {
                fenceChar: fenceChar,
                fenceLen: fenceLen,
                fenceStart: pos,
                contentStart: contentStart,
                lang: lang,
                hasContainer: false
              };

              pos = isSameLineContainer ? contentStart : nextPos;
              continue;
            }
          } else if (midOpenMatch && (midOpenMatch[2] || midOpenMatch[3])) {
            hasFenceSeen = true;
            var mFence = midOpenMatch[1];
            var mLang = (midOpenMatch[2] || '').toLowerCase();
            var mTrail = midOpenMatch[3] || '';
            var mStart = mTrail ? (pos + lineNoCr.indexOf(mTrail)) : nextPos;
            currentFence = {
              fenceChar: mFence.charAt(0),
              fenceLen: mFence.length,
              fenceStart: pos + midOpenMatch.index,
              contentStart: mStart,
              lang: mLang,
              hasContainer: false
            };
            pos = mTrail ? mStart : nextPos;
            continue;
          }

          // Preserve valid standalone containers that appear outside fences (hybrid responses)
          var standaloneMatch = LunoPayloadParser._findLineContainerMatch(text, pos, lineEnd);
          if (standaloneMatch) {
            var sInner = text.slice(standaloneMatch.headerEndIdx + 1, standaloneMatch.closeSearchIdx);
            var hasFenceOrInner = /\r?\n[ \t]*(?:`{2,}|~{2,})[^\n]*\r?\n/.test(sInner) ||
                                  /<(?:script|style|template|svg)\b[^>]*\b(?:data-file|data-action|type)\s*=/i.test(sInner);
            if (!hasFenceOrInner) {
              blocks.push({
                fenceStart: -1,
                content: text.slice(standaloneMatch.openIdx, standaloneMatch.closeEndIdx + 1),
                hasContainer: true
              });
              var sAfter = standaloneMatch.closeEndIdx + 1;
              var sAfterNl = text.indexOf('\n', sAfter);
              var sRest = text.slice(sAfter, sAfterNl !== -1 ? sAfterNl : len);
              pos = sRest.trim() === '' ? (sAfterNl !== -1 ? sAfterNl + 1 : len) : sAfter;
              continue;
            }
          }

          pos = nextPos;
          continue;
        }

        // Inside an open fence:
        var closeMatch = lineNoCr.match(/^[ \t]*(`{2,}|~{2,})[ \t]*$/);
        if (closeMatch && closeMatch[1].charAt(0) === currentFence.fenceChar && closeMatch[1].length >= currentFence.fenceLen) {
          if (!currentFence.hasContainer) {
            var afterBareFence = text.slice(nextPos).trimStart();
            var nextLineEndOff = afterBareFence.indexOf('\n');
            var nextLineEnd = nextLineEndOff !== -1 ? nextLineEndOff : afterBareFence.length;
            var nextLineMatch = LunoPayloadParser._findLineContainerMatch(afterBareFence, 0, nextLineEnd);
            if (nextLineMatch) {
              currentFence = {
                fenceChar: closeMatch[1].charAt(0),
                fenceLen: closeMatch[1].length,
                fenceStart: pos,
                contentStart: nextPos,
                lang: '',
                hasContainer: false
              };
              pos = nextPos;
              continue;
            }
          }

          blocks.push({
            fenceStart: currentFence.fenceStart,
            content: text.slice(currentFence.contentStart, pos),
            hasContainer: currentFence.hasContainer
          });
          currentFence = null;
          pos = nextPos;
          continue;
        }

        if (!currentFence.hasContainer) {
          var nestedHtmlOpen = lineNoCr.match(/^[ \t]*(`{2,}|~{2,})[ \t]*(html|htm|xml|svg|luno)[ \t]*(.*)$/i);
          if (nestedHtmlOpen) {
            var nTrailing = nestedHtmlOpen[3] || '';
            var nSameLine = /^(<(?:script|style|template|svg)\b)/i.test(nTrailing);
            if (nTrailing === '' || nSameLine) {
              currentFence = {
                fenceChar: nestedHtmlOpen[1].charAt(0),
                fenceLen: nestedHtmlOpen[1].length,
                fenceStart: pos,
                contentStart: nSameLine ? (pos + lineNoCr.indexOf(nTrailing)) : nextPos,
                lang: nestedHtmlOpen[2].toLowerCase(),
                hasContainer: false
              };
              pos = nSameLine ? currentFence.contentStart : nextPos;
              continue;
            }
          }
        }

        var containerMatch = LunoPayloadParser._findLineContainerMatch(text, pos, lineEnd);
        if (containerMatch) {
          currentFence.hasContainer = true;
          var afterClose = containerMatch.closeEndIdx + 1;
          var lineAfterCloseNl = text.indexOf('\n', afterClose);
          var restOfCloseLine = text.slice(afterClose, lineAfterCloseNl !== -1 ? lineAfterCloseNl : len);
          var sameLineCloseMatch = restOfCloseLine.match(/^[ \t]*(`{2,}|~{2,})[ \t]*\r?$/);
          if (sameLineCloseMatch && sameLineCloseMatch[1].charAt(0) === currentFence.fenceChar && sameLineCloseMatch[1].length >= currentFence.fenceLen) {
            blocks.push({
              fenceStart: currentFence.fenceStart,
              content: text.slice(currentFence.contentStart, afterClose),
              hasContainer: true
            });
            currentFence = null;
            pos = lineAfterCloseNl !== -1 ? lineAfterCloseNl + 1 : len;
            continue;
          }
          pos = restOfCloseLine.trim() === '' ? (lineAfterCloseNl !== -1 ? lineAfterCloseNl + 1 : len) : afterClose;
          continue;
        }

        pos = nextPos;
      }

      if (currentFence !== null) {
        blocks.push({
          fenceStart: currentFence.fenceStart,
          content: text.slice(currentFence.contentStart),
          hasContainer: currentFence.hasContainer
        });
      }

      if (!hasFenceSeen) {
        return null;
      }

      var containerBlocks = blocks.filter(function(b) { return b.hasContainer; });
      if (containerBlocks.length > 0) {
        return containerBlocks.map(function(b) {
          return b.content.trim();
        }).join('\n\n');
      }

      if (blocks.length === 1 && blocks[0].fenceStart === 0) {
        return blocks[0].content.trim();
      }

      return null;
    }
  static _isInsideInlineBacktick(text, openIdx) {
      var SCRIPT_WORD = 'scr' + 'ipt';
      var STYLE_WORD = 'sty' + 'le';
      var TEMPLATE_WORD = 'temp' + 'late';
      var SVG_WORD = 'sv' + 'g';

      var lineStart = text.lastIndexOf('\n', openIdx - 1) + 1;
      var lineEnd = text.indexOf('\n', openIdx);
      if (lineEnd === -1) lineEnd = text.length;

      var prefix = text.slice(lineStart, openIdx);
      if (prefix.indexOf('`') === -1) return { inside: false, closeEnd: -1 };

      var activeTickLen = 0;
      var proseBeforeSpan = false;
      var i = 0;
      while (i < prefix.length) {
        if (prefix.charAt(i) === '`') {
          var runLen = 1;
          while (i + runLen < prefix.length && prefix.charAt(i + runLen) === '`') runLen++;
          if (activeTickLen === 0) {
            activeTickLen = runLen;
            proseBeforeSpan = prefix.slice(0, i).trim().length > 0;
          } else if (runLen === activeTickLen) {
            activeTickLen = 0;
          }
          i += runLen;
        } else {
          i++;
        }
      }

      if (activeTickLen === 0 || activeTickLen >= 3) {
        return { inside: false, closeEnd: -1 };
      }

      var restOfLine = text.slice(openIdx, lineEnd);
      var closeTickStr = activeTickLen === 2 ? '``' : '`';
      var closeIdx = restOfLine.indexOf(closeTickStr);
      if (closeIdx === -1) {
        return { inside: false, closeEnd: -1 };
      }

      var insideStr = restOfLine.slice(0, closeIdx);
      var closeTagRe = new RegExp('</(?:' + SCRIPT_WORD + '|' + STYLE_WORD + '|' + TEMPLATE_WORD + '|' + SVG_WORD + ')\\s*>', 'i');
      if (!closeTagRe.test(insideStr) || proseBeforeSpan) {
        return { inside: true, closeEnd: openIdx + closeIdx + activeTickLen };
      }
      return { inside: false, closeEnd: -1 };
    }

  static _findLineContainerMatch(text, lineStart, lineEnd) {
      var SCRIPT_WORD = 'scr' + 'ipt';
      var STYLE_WORD = 'sty' + 'le';
      var TEMPLATE_WORD = 'temp' + 'late';
      var SVG_WORD = 'sv' + 'g';

      var scan = lineStart;
      while (scan < lineEnd) {
        var openIdx = text.indexOf('<', scan);
        if (openIdx === -1 || openIdx >= lineEnd) break;

        if (text.substring(openIdx, openIdx + 2) === '</') {
          scan = openIdx + 2;
          continue;
        }

        var tickCheck = LunoPayloadParser._isInsideInlineBacktick(text, openIdx);
        if (tickCheck.inside) {
          scan = tickCheck.closeEnd;
          continue;
        }

        var rest = text.slice(openIdx + 1, lineEnd).toLowerCase();
        var tagWord = null;
        if (rest.indexOf(SCRIPT_WORD) === 0) tagWord = SCRIPT_WORD;
        else if (rest.indexOf(STYLE_WORD) === 0) tagWord = STYLE_WORD;
        else if (rest.indexOf(TEMPLATE_WORD) === 0) tagWord = TEMPLATE_WORD;
        else if (rest.indexOf(SVG_WORD) === 0) tagWord = SVG_WORD;

        if (!tagWord) {
          scan = openIdx + 1;
          continue;
        }

        var afterTag = text.charAt(openIdx + 1 + tagWord.length);
        if (afterTag && ' \t\r\n>'.indexOf(afterTag) === -1) {
          scan = openIdx + 1;
          continue;
        }

        var hEnd = LunoPayloadParser._findHeaderEnd(text, openIdx + 1 + tagWord.length);
        if (hEnd === -1) break;

        var hStr = text.slice(openIdx + 1 + tagWord.length, hEnd);
        if (!LunoPayloadParser._isContainerHeader(hStr)) {
          scan = openIdx + 1;
          continue;
        }

        var closeInfo = LunoPayloadParser._findClosingTag(text, hEnd, tagWord);
        if (!closeInfo || closeInfo.closeEndIdx === -1) {
          scan = hEnd + 1;
          continue;
        }

        return {
          openIdx: openIdx,
          headerEndIdx: hEnd,
          tagWord: tagWord,
          closeSearchIdx: closeInfo.closeSearchIdx,
          closeEndIdx: closeInfo.closeEndIdx
        };
      }

      return null;
    }
}

globalThis.LunoPayloadParser = LunoPayloadParser;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoPayloadParser;