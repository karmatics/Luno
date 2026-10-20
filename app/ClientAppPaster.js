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

        // Capture previous file contents for diffs
        var originalFileContents = new Map();
        if (Array.isArray(rawPayload.files)) {
          for (var pIdx = 0; pIdx < rawPayload.files.length; pIdx++) {
            var rawFileObj = rawPayload.files[pIdx];
            if (rawFileObj && rawFileObj.filePath && !originalFileContents.has(rawFileObj.filePath)) {
              try {
                var preRead = await LunoApiClient.fetchFsRead(rawFileObj.filePath, targetProj);
                originalFileContents.set(rawFileObj.filePath, (preRead && preRead.success && preRead.content !== undefined) ? preRead.content : '');
              } catch (e) {
                originalFileContents.set(rawFileObj.filePath, '');
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

        // Calculate diffs and byte metrics
        var calculatedFileDiffs = [];
        if (typeof CodeDiffer !== 'undefined' && Array.isArray(finalPayload.files)) {
          finalPayload.files.forEach(function(savedFile) {
            var oldStr = originalFileContents.get(savedFile.filePath) || '';
            var newStr = savedFile.content || '';
            var diffAnalysis = CodeDiffer.analyzeDiff(oldStr, newStr, savedFile.filePath);

            var summaryMatch = (finalPayload.patchActionsSummary || []).find(function(s) {
              return s.path === savedFile.filePath || s.path.endsWith(savedFile.filePath);
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

        // Optional Diff Review Modal (only stops if diffReviewEnabled is ON and autoApprove is OFF)
        var isDiffReviewEnabled = (typeof LunoSettings !== 'undefined' && LunoSettings.diffReviewEnabled ? LunoSettings.diffReviewEnabled() : false);
        var autoApprove = (typeof ClientApp !== 'undefined' && ClientApp.autoApprove);

        if (isDiffReviewEnabled && !autoApprove && calculatedFileDiffs.length > 0 && typeof DiffApprovalModal !== 'undefined') {
          var proceedWithSave = await new Promise(function(resolve) {
            DiffApprovalModal.open({
              payloadText: rawText,
              rawPayload: rawPayload,
              fileDiffs: calculatedFileDiffs,
              onConfirm: function(res) { resolve(res || true); },
              onCancel: function() { resolve(false); }
            });
          });

          if (!proceedWithSave) {
            if (targetApp && targetApp.showToast) targetApp.showToast('Payload cancelled by user.', 'info', '⏸️');
            return;
          }

          if (proceedWithSave && proceedWithSave.filteredPayload && typeof LunoManifestDecisionEngine !== 'undefined') {
            finalPayload = await LunoManifestDecisionEngine.processPayload(proceedWithSave.filteredPayload, lunoMeta, targetProj);
            if (finalPayload.files.length === 0 && !finalPayload.serverScript) {
              if (targetApp && targetApp.showToast) targetApp.showToast('All changes were discarded.', 'info', '🧹');
              return;
            }
          }
        }

        // Build structured client summary with explicit line additions/removals
        var clientSummary = "🔍 CLIENT PARSER SUMMARY:\n• Target: " + (targetProj || "Luno") + "\n";
        clientSummary += "• Containers: " + (rawPayload.files ? rawPayload.files.length : finalPayload.files.length) + "\n";

        if (Array.isArray(calculatedFileDiffs) && calculatedFileDiffs.length > 0) {
          clientSummary += "• File Modifications & Line Diffs:\n";
          calculatedFileDiffs.forEach(function(diffItem, idx) {
            var sign = diffItem.byteDelta > 0 ? '+' : '';
            var statsStr = '(+' + (diffItem.linesAdded || 0) + ' / -' + (diffItem.linesRemoved || 0) + ' lines, ' + sign + (diffItem.byteDelta || 0) + ' B)';
            var isPatch = (diffItem.mode === 'direct-ast-apply' || diffItem.mode === 'surgical-patch');
            var badge = isPatch ? '[AST Merge]' : (diffItem.mode === 'json-merge' ? '[JSON Merge]' : '[Full File]');
            clientSummary += "  " + (idx + 1) + ". " + diffItem.filePath + " " + statsStr + " " + badge + "\n";
          });
        } else if (Array.isArray(finalPayload.patchActionsSummary)) {
          finalPayload.patchActionsSummary.forEach(function(act, idx) {
            var badge = act.mode === 'direct-ast-apply' ? '[AST Merge]' : (act.mode === 'json-merge' ? '[JSON Merge]' : '[Full File]');
            clientSummary += "  " + (idx + 1) + ". " + act.path + " " + badge + "\n";
          });
        }

        // Apply changes to storage
        var data = null;
        if (finalPayload.files && finalPayload.files.length > 0) {
          data = await LunoApiClient.savePayload(finalPayload, targetProj);
        } else {
          data = { success: true, count: 0, modifiedCount: 0 };
        }

        var finalFeedback = clientSummary + "\n📊 EXECUTION RESPONSE:\n" + (data.llmFeedback || JSON.stringify(data, null, 2));

        // Display execution feedback automatically on the home screen
        if (targetApp && targetApp.showFeedback) {
          targetApp.showFeedback(finalFeedback, data && data.success ? "success" : "error", {
            fileDiffs: calculatedFileDiffs
          });
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
            var totalAdd = calculatedFileDiffs.reduce(function(s, d) { return s + (d.linesAdded || 0); }, 0);
            var totalRem = calculatedFileDiffs.reduce(function(s, d) { return s + (d.linesRemoved || 0); }, 0);
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