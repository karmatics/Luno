class ClientAppPaster {
  constructor() {}

  static async pasteClipboard() {
    var pastedText = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        pastedText = await navigator.clipboard.readText();
      }
    } catch (err) {}

    if (pastedText && pastedText.trim()) {
      ClientAppPaster.processPastedText(pastedText);
    } else {
      var text = prompt('Paste HTML Container payload text here:');
      if (text) ClientAppPaster.processPastedText(text);
    }
  }

  static async processPastedText(text) {
      if (!text || !text.trim()) return;

      if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
        LunoSpaDock.mountView('workspace');
      }

      if (typeof ClientAppUI !== 'undefined') {
        ClientAppUI.inboxExpanded = true;
        var inboxContent = document.getElementById('inbox-card-content');
        if (inboxContent) inboxContent.style.display = 'block';
      }

      var inboxCard = document.querySelector('.inbox-card');
      if (inboxCard && typeof LunoAnimationEngine !== 'undefined') {
        var rect = inboxCard.getBoundingClientRect();
        LunoAnimationEngine.burstSparks(rect.left + (rect.width / 2), rect.top + (rect.height / 2), '#3fb950', 16);
        LunoAnimationEngine.pulseTarget(inboxCard, { color: '#3fb950', glowColor: 'rgba(63, 185, 80, 0.8)' });
        if (typeof LunoAnimationEngine.wavePulse === 'function') {
          LunoAnimationEngine.wavePulse(inboxCard, '#3fb950');
        }
      }

      var input = document.getElementById('code-input') || document.getElementById('payload-input');
      if (input) input.value = text;

      // Render live micro-approval metric badge immediately upon paste
      if (typeof MicroApprovalBadge !== 'undefined' && MicroApprovalBadge.renderInlineBadge) {
        MicroApprovalBadge.renderInlineBadge(text, 'inbox-metrics-badge');
      }

      var autoApprove = (typeof ClientApp !== 'undefined' && ClientApp.autoApprove);
      var pace = (typeof ClientApp !== 'undefined' && ClientApp.executionPace);

      if (!autoApprove && pace !== 'fast' && typeof InboxActionTimer !== 'undefined' && InboxActionTimer.startTimer) {
        InboxActionTimer.startTimer(text, function() {
          ClientAppPaster.executeSave(text);
        });
      } else {
        ClientAppPaster.executeSave(text);
      }
  }
  static async saveCode() {
    var input = document.getElementById('code-input') || document.getElementById('payload-input');
    var text = input ? input.value : '';
    if (!text || !text.trim()) {
      var targetApp = globalThis.ClientAppCore || globalThis.ClientApp;
      if (targetApp && targetApp.showToast) {
        targetApp.showToast('Payload box is empty.', 'error', '⚠️');
      }
      return;
    }
    ClientAppPaster.executeSave(text);
  }

  static async executeSave(overrideText) {
    var targetApp = globalThis.ClientAppCore || globalThis.ClientApp;
    var input = document.getElementById('code-input') || document.getElementById('payload-input');
    var rawText = overrideText || (input ? input.value : '');
    if (!rawText || !rawText.trim()) return;

    try {
      var targetProj = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';

      var payloadHash = (typeof CodeDiffer !== 'undefined' && CodeDiffer.fastHash) 
        ? CodeDiffer.fastHash(rawText.trim()) 
        : String(rawText.trim().length);

      if (ClientAppPaster._lastPastedPayloadHash === payloadHash && ClientAppPaster._lastCalculatedDiffs?.length > 0) {
        var duplicateNotice = 'ℹ️ IDEMPOTENCY GUARD: You pasted the identical payload block (CRC: ' + payloadHash + '). ' +
          'No additional file changes were detected.\n\nYour previous active diff view has been preserved without wiping out.';

        if (targetApp && targetApp.showFeedback) {
          targetApp.showFeedback(duplicateNotice, 'info', { fileDiffs: ClientAppPaster._lastCalculatedDiffs });
        }
        if (targetApp && targetApp.showToast) {
          targetApp.showToast('Duplicate paste detected — previous diff view preserved!', 'info', '🛡️');
        }
        return;
      }

      var rawPayload = { files: [], serverScript: '', clientScript: '', requests: [], debugLogs: [] };
      if (typeof LunoPayloadParser !== 'undefined' && LunoPayloadParser.parse) {
        rawPayload = LunoPayloadParser.parse(rawText);
      }

      var hasRawContainers = (rawPayload.files && rawPayload.files.length > 0) ||
                             Boolean(rawPayload.serverScript) ||
                             Boolean(rawPayload.clientScript) ||
                             (rawPayload.requests && rawPayload.requests.length > 0);

      if (!hasRawContainers && rawText.trim().length > 20) {
        var zeroWarn = '⚠️ PARSER WARNING: Input payload contained ' + rawText.trim().length + ' characters, but 0 valid HTML containers were detected.';
        if (targetApp && targetApp.showFeedback) targetApp.showFeedback(zeroWarn, 'error');
        if (targetApp && targetApp.showToast) targetApp.showToast('0 HTML Containers Found!', 'error', '⚠️');
        return;
      }

      var normKey = function(p) {
        if (!p) return '';
        var clean = p.replace(/\\/g, '/').replace(/^\/+/, '');
        if (clean.startsWith('Luno/')) clean = clean.slice(5);
        if (targetProj && clean.startsWith(targetProj + '/')) clean = clean.slice(targetProj.length + 1);
        return clean;
      };

      var originalFileContents = new Map();
      if (Array.isArray(rawPayload.files)) {
        for (var pIdx = 0; pIdx < rawPayload.files.length; pIdx++) {
          var rawFileObj = rawPayload.files[pIdx];
          if (rawFileObj && rawFileObj.filePath) {
            var nKey = normKey(rawFileObj.filePath);
            if (!originalFileContents.has(nKey)) {
              try {
                var preRead = await LunoApiClient.fetchFsRead(rawFileObj.filePath, targetProj);
                var content = (preRead && preRead.success && preRead.content !== undefined) ? preRead.content : '';
                originalFileContents.set(nKey, content);
                originalFileContents.set(rawFileObj.filePath, content);
              } catch (e) {
                originalFileContents.set(nKey, '');
                originalFileContents.set(rawFileObj.filePath, '');
              }
            }
          }
        }
      }

      var lunoMeta = {};
      try {
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
          var metaRes = await LunoApiClient.fetchFsRead('luno.json', targetProj);
          if (metaRes && metaRes.content) lunoMeta = JSON.parse(metaRes.content);
        }
      } catch (e) {}

      var finalPayload = rawPayload;
      if (typeof LunoManifestDecisionEngine !== 'undefined' && LunoManifestDecisionEngine.processPayload) {
        finalPayload = await LunoManifestDecisionEngine.processPayload(rawPayload, lunoMeta, targetProj);
      }

      if (finalPayload && typeof finalPayload === 'object' && targetProj) {
        finalPayload.project = targetProj;
      }

      var calculatedFileDiffs = [];
      if (typeof CodeDiffer !== 'undefined' && Array.isArray(finalPayload.files)) {
        finalPayload.files.forEach(function(savedFile) {
          var nKey = normKey(savedFile.filePath);
          var oldStr = originalFileContents.get(nKey) || originalFileContents.get(savedFile.filePath) || '';
          var newStr = savedFile.content || '';
          var diffAnalysis = CodeDiffer.analyzeDiff(oldStr, newStr, savedFile.filePath);

          var summaryMatch = (finalPayload.patchActionsSummary || []).find(function(s) {
            return normKey(s.path) === nKey || s.path === savedFile.filePath;
          });

          calculatedFileDiffs.push({
            filePath: savedFile.filePath,
            target: summaryMatch ? (summaryMatch.target || savedFile.filePath) : savedFile.filePath,
            mode: summaryMatch ? (summaryMatch.mode || 'direct-ast-apply') : 'full-file',
            oldContent: oldStr,
            newContent: newStr,
            linesAdded: diffAnalysis.linesAdded,
            linesRemoved: diffAnalysis.linesRemoved,
            bytesBefore: diffAnalysis.bytesBefore,
            bytesAfter: diffAnalysis.bytesAfter,
            byteDelta: diffAnalysis.byteDelta
          });
        });
      }

      var netLineChanges = calculatedFileDiffs.reduce(function(acc, d) { return acc + d.linesAdded + d.linesRemoved; }, 0);
      if (netLineChanges === 0 && calculatedFileDiffs.length > 0 && !finalPayload.serverScript && !finalPayload.clientScript) {
        var noChangeNotice = '✓ IDEMPOTENT PASTE: All files already match disk storage.';
        if (targetApp && targetApp.showFeedback) {
          targetApp.showFeedback(noChangeNotice, 'info', { fileDiffs: ClientAppPaster._lastCalculatedDiffs || calculatedFileDiffs });
        }
        return;
      }

      var data = null;
      if ((finalPayload.files && finalPayload.files.length > 0) || Boolean(finalPayload.serverScript)) {
        data = await LunoApiClient.savePayload(finalPayload, targetProj);
      } else {
        data = { success: true, count: 0, modifiedCount: 0 };
      }

      // ====================================================================
      // SERVER-TO-OUTBOX BRIDGE: Extract stageFiles from object OR llmFeedback
      // ====================================================================
      var serverStageList = (data && (data.stageFiles || data.outboxItems || data.stagedFiles)) ||
                            (data && data.serverResult && (data.serverResult.stageFiles || data.serverResult.outboxItems));

      if (!serverStageList && data && data.llmFeedback) {
        var match = data.llmFeedback.match(/---\s*Return Value\s*---\s*\r?\n(\{[\s\S]*?\})\s*(\r?\n---|\r?\n⚡|\r?\n✅|$)/);
        if (match) {
          try {
            var parsedReturn = JSON.parse(match[1]);
            if (parsedReturn && parsedReturn.stageFiles && Array.isArray(parsedReturn.stageFiles)) {
              serverStageList = parsedReturn.stageFiles;
            }
          } catch(e) {}
        }
      }

      if (Array.isArray(serverStageList) && serverStageList.length > 0) {
        var stagedCount = 0;
        serverStageList.forEach(function(item) {
          var p = item.path || item.filePath || 'Context File';
          var c = item.content || item.payload || '';
          var isStyle = p.endsWith('.css');
          var isHtml = p.endsWith('.html');
          var isJson = p.endsWith('.json');
          var tag = isStyle ? 'style' : (isHtml ? 'template' : (isJson ? 'script type="application/json"' : 'script'));
          var closingTag = isStyle ? 'style' : (isHtml ? 'template' : 'script');
          var payload = '```html\n<' + tag + ' data-file="' + p + '">\n' + c + '\n<\/' + closingTag + '>\n```\n';

          if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
            OutboxQueue.addBundle('📄 ' + p, payload, {
              priority: 'high',
              type: 'file',
              files: [p],
              meta: { filePath: p, source: 'server-staged' }
            });
            stagedCount++;
          }
        });

        if (typeof ClientAppUI !== 'undefined') ClientAppUI.outboxExpanded = true;
        var outboxContent = document.getElementById('outbox-card-content');
        if (outboxContent) {
          outboxContent.style.display = 'block';
          outboxContent.classList.remove('collapsed');
        }

        if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
          OutboxWidgetRenderer.renderWidget('outbox-queue-container');
        }

        if (targetApp && targetApp.showToast) {
          targetApp.showToast('✓ Staged ' + stagedCount + ' file(s) into Outbox from server!', 'success', '📦');
        }
      }

      // Execute in-browser client script
      if (finalPayload.clientScript && finalPayload.clientScript.trim()) {
        try {
          var clientFn = new Function('UITools', 'ClientApp', finalPayload.clientScript);
          var clientResult = clientFn(globalThis.UITools, globalThis.ClientApp);
          if (clientResult && typeof clientResult.then === 'function') {
            clientResult = await clientResult;
          }
          if (clientResult !== undefined) {
            console.log('[Luno Client Script Result]', clientResult);
          }
        } catch(cErr) {
          console.error('[Luno Client Script Error]', cErr);
          if (targetApp && targetApp.showToast) {
            targetApp.showToast('Client Script Error: ' + cErr.message, 'error', '❌');
          }
        }
      }

      ClientAppPaster._lastPastedPayloadHash = payloadHash;
      ClientAppPaster._lastCalculatedDiffs = calculatedFileDiffs;

      if (globalThis.CadPlanItemNotes && typeof globalThis.CadPlanItemNotes.resolveNotesFromLlmPayload === 'function') {
        const resolvedList = await globalThis.CadPlanItemNotes.resolveNotesFromLlmPayload(rawText);
        if (resolvedList.length > 0 && targetApp && targetApp.showToast) {
          targetApp.showToast(`🧹 Archived ${resolvedList.length} resolved living spec directive(s)!`, 'success', '✨');
        }
      }

      var totalAdd = calculatedFileDiffs.reduce(function(s, d) { return s + (d.linesAdded || 0); }, 0);
      var totalRem = calculatedFileDiffs.reduce(function(s, d) { return s + (d.linesRemoved || 0); }, 0);
      var totalContainers = (rawPayload.files ? rawPayload.files.length : 0) +
                            (rawPayload.serverScript ? 1 : 0) +
                            (rawPayload.clientScript ? 1 : 0) +
                            (rawPayload.requests ? rawPayload.requests.length : 0);

      var clientSummary = "🔍 CLIENT PARSER SUMMARY:\n• Target: " + (targetProj || "Luno") + "\n";
      clientSummary += "• Containers: " + totalContainers + "\n";
      clientSummary += "• Net Diff: +" + totalAdd + " / -" + totalRem + " lines (CRC: " + payloadHash + ")\n";

      var finalFeedback = clientSummary + "\n📊 EXECUTION RESPONSE:\n" + (data.llmFeedback || JSON.stringify(data, null, 2));

      if (targetApp && targetApp.showFeedback) {
        targetApp.showFeedback(finalFeedback, data && data.success ? "success" : "error", {
          fileDiffs: calculatedFileDiffs
        });
      }

      var inboxBadge = document.getElementById('inbox-metrics-badge');
      if (inboxBadge && calculatedFileDiffs.length > 0) {
        inboxBadge.innerHTML = '<span style="color:#3fb950; font-weight:bold;">✅ Saved ' + calculatedFileDiffs.length + ' file(s): +' + totalAdd + ' / -' + totalRem + ' LOC</span>';
      }

      if (data && data.success) {
        if (input) input.value = "";

        if (typeof LunoHistoryManager !== 'undefined' && calculatedFileDiffs.length > 0) {
          LunoHistoryManager.recordChanges(calculatedFileDiffs, targetProj).catch(function() {});
        }

        if (typeof LunoLoader !== 'undefined' && LunoLoader.applyPatchLog) {
          await LunoLoader.applyPatchLog(targetProj);
        }

        if (typeof ClientApp !== 'undefined' && ClientApp.fetchCodebaseMetrics) {
          await ClientApp.fetchCodebaseMetrics(targetProj);
        }

        if (targetApp && targetApp.showToast) {
          var toastDiff = calculatedFileDiffs.length > 0 ? (' (+' + totalAdd + '/-' + totalRem + ' LOC)') : '';
          var actionLabel = finalPayload.serverScript ? 'Executed server script' : 'Saved ' + (data.modifiedCount || data.count || 0) + ' file(s)';
          targetApp.showToast(actionLabel + toastDiff + '!', 'success', '💾');
        }
      } else {
        throw new Error((data && data.error) || 'Save failed');
      }
    } catch (err) {
      if (targetApp && targetApp.showFeedback) targetApp.showFeedback("❌ Error: " + err.message, "error");
      if (targetApp && targetApp.showToast) targetApp.showToast("Save Error: " + err.message, "error", "❌");
    }
  }
}

globalThis.ClientAppPaster = ClientAppPaster;
if (typeof module !== "undefined" && module.exports) module.exports = ClientAppPaster;