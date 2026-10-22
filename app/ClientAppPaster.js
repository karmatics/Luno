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

        // 1. Idempotency & CRC/Hash Check
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
          var zeroWarn = '⚠️ PARSER WARNING: Input payload contained ' + rawText.trim().length + ' characters, but 0 valid HTML containers were detected.\n\n' +
            'Please ensure container tags are properly formatted:\n' +
            '• Surgical Patch: <script data-file="' + (targetProj || 'Project') + '/path/to/file.js" data-method="ClassName.methodName" data-action="patch">\n' +
            '• Full File Write: <script data-file="' + (targetProj || 'Project') + '/path/to/file.js">\n' +
            '• Server Script: <script data-file="RUN: SERVER" data-action="run-server">';

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

        // Capture previous file contents for diffing
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

        // Calculate diffs and byte metrics matching normalized paths
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

        // Check if all files had 0 delta (content already identical to disk)
        var netLineChanges = calculatedFileDiffs.reduce(function(acc, d) { return acc + d.linesAdded + d.linesRemoved; }, 0);
        if (netLineChanges === 0 && calculatedFileDiffs.length > 0 && !finalPayload.serverScript) {
          var noChangeNotice = '✓ IDEMPOTENT PASTE: All files in the pasted container already match disk storage.\n' +
            'No files were modified, and your previous diff session remains active.';
          if (targetApp && targetApp.showFeedback) {
            targetApp.showFeedback(noChangeNotice, 'info', { fileDiffs: ClientAppPaster._lastCalculatedDiffs || calculatedFileDiffs });
          }
          if (targetApp && targetApp.showToast) {
            targetApp.showToast('Pasted content already applied — 0 changes required', 'info', '✓');
          }
          return;
        }

        // Apply changes to storage
        var data = null;
        if (finalPayload.files && finalPayload.files.length > 0) {
          data = await LunoApiClient.savePayload(finalPayload, targetProj);
        } else {
          data = { success: true, count: 0, modifiedCount: 0 };
        }

        // Cache hash and diffs so duplicate pastes can be detected
        ClientAppPaster._lastPastedPayloadHash = payloadHash;
        ClientAppPaster._lastCalculatedDiffs = calculatedFileDiffs;

        // 2. Automated LLM Note Resolution Protocol
        if (globalThis.CadPlanItemNotes && typeof globalThis.CadPlanItemNotes.resolveNotesFromLlmPayload === 'function') {
          const resolvedList = await globalThis.CadPlanItemNotes.resolveNotesFromLlmPayload(rawText);
          if (resolvedList.length > 0 && targetApp && targetApp.showToast) {
            targetApp.showToast(`🧹 Archived ${resolvedList.length} resolved living spec directive(s)!`, 'success', '✨');
          }
        }

        // Build structured client summary
        var totalAdd = calculatedFileDiffs.reduce(function(s, d) { return s + (d.linesAdded || 0); }, 0);
        var totalRem = calculatedFileDiffs.reduce(function(s, d) { return s + (d.linesRemoved || 0); }, 0);
        var clientSummary = "🔍 CLIENT PARSER SUMMARY:\n• Target: " + (targetProj || "Luno") + "\n";
        clientSummary += "• Containers: " + (rawPayload.files ? rawPayload.files.length : finalPayload.files.length) + "\n";
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
            targetApp.showToast('Saved ' + (data.modifiedCount || data.count || 0) + ' file(s)' + toastDiff + '!', 'success', '💾');
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