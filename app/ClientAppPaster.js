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

    ClientAppPaster.executeSave(text);
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
          if (typeof LunoAcornLoader !== 'undefined' && typeof LunoAcornLoader.ensureLoaded === 'function') {
            try { await LunoAcornLoader.ensureLoaded(); } catch (e) {}
          }

          var targetProj = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';

          var rawPayload = { files: [], serverScript: '', requests: [], debugLogs: [] };
          if (typeof LunoPayloadParser !== 'undefined' && LunoPayloadParser.parse) {
            rawPayload = LunoPayloadParser.parse(rawText);
          }

          var hasRawContainers = (rawPayload.files && rawPayload.files.length > 0) || Boolean(rawPayload.serverScript) || (rawPayload.requests && rawPayload.requests.length > 0);

          if (!hasRawContainers && rawText.trim().length > 20) {
            var zeroWarn = '⚠️ PARSER WARNING: Input payload contained ' + rawText.trim().length + ' characters, but 0 valid HTML containers (<script>, <style>, <template>, <svg>) were detected.\n\n' +
              'Please ensure container tags are properly formatted:\n' +
              '• Surgical Patch: <script data-file="' + (targetProj || 'Project') + '/path/to/file.js" data-method="ClassName.methodName" data-action="patch">\n' +
              '• Full File Write: <script data-file="' + (targetProj || 'Project') + '/path/to/file.js">\n' +
              '• Server Script: <script data-file="RUN: SERVER" data-action="run-server">';

            if (targetApp && targetApp.showFeedback) {
              targetApp.showFeedback(zeroWarn, 'error');
            }
            if (targetApp && targetApp.showToast) {
              targetApp.showToast('0 HTML Containers Found in ' + rawText.trim().length + ' chars!', 'error', '⚠️');
            }
            if (typeof LunoPlaybackLogger !== 'undefined') {
              LunoPlaybackLogger.warn('Zero Containers Parsed', rawText.slice(0, 80) + '...');
            }
            return;
          }

          if (rawPayload.files && rawPayload.files.length > 0) {
            for (var s = 0; s < rawPayload.files.length; s++) {
              var fItem = rawPayload.files[s];
              if (fItem.tagName === 'svg' || (fItem.filePath && fItem.filePath.toLowerCase().endsWith('.svg'))) {
                if (typeof LunoSvgStudio !== 'undefined' && LunoSvgStudio.loadSvgPayload) {
                  LunoSvgStudio.loadSvgPayload(fItem.content, fItem.filePath);
                }
              }
            }
          }

          var lunoMeta = {};
          try {
            if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
              var metaRes = await LunoApiClient.fetchFsRead('luno.json', targetProj);
              if (metaRes && metaRes.content) {
                lunoMeta = JSON.parse(metaRes.content);
              }
            }
          } catch (e) {}

          var finalPayload = rawPayload;
          if (typeof LunoManifestDecisionEngine !== 'undefined' && LunoManifestDecisionEngine.processPayload) {
            finalPayload = await LunoManifestDecisionEngine.processPayload(rawPayload, lunoMeta, targetProj);
          }

          if (finalPayload && typeof finalPayload === 'object' && targetProj) {
            finalPayload.project = targetProj;
          }

          var activeMode = finalPayload.patchMode || (typeof LunoSettings !== 'undefined' && LunoSettings.getPatchApplyMode ? LunoSettings.getPatchApplyMode() : 'direct');
          var isDirectAutoApply = (activeMode === 'direct');

          var clientSummary = "🔍 CLIENT BROWSER PARSER SUMMARY (HTML Container Protocol):\n";
          clientSummary += "• Target Project: " + (targetProj || "Luno") + "\n";
          clientSummary += "• Patch Workflow Mode: " + (isDirectAutoApply ? "⚡ Auto-Apply to Files (Client AST Direct Merge)" : "🧩 Journal to Patch Log (LunoPatchLog.html)") + "\n";
          clientSummary += "• HTML Containers Processed: " + (rawPayload.files ? rawPayload.files.length : finalPayload.files.length) + " container(s)\n";

          if (Array.isArray(finalPayload.patchActionsSummary) && finalPayload.patchActionsSummary.length > 0) {
            finalPayload.patchActionsSummary.forEach(function(act, idx) {
              var badge = '[Full File Write]';
              if (!act.success || act.mode === 'failed') {
                badge = '[❌ FAILED: ' + (act.error || 'Syntax/Target Error') + ']';
              } else if (act.mode === 'direct-ast-apply') {
                badge = '[Client AST Direct Merge -> File]';
              } else if (act.mode === 'patchlog-journal') {
                badge = '[Patch Log Journal -> LunoPatchLog.html]';
              } else if (act.mode === 'json-merge') {
                badge = '[Client JSON Merge]';
              }

              clientSummary += "  " + (idx + 1) + ". " + act.path + (act.target && act.target !== act.path ? (" @ " + act.target) : "") + " " + badge + "\n";
            });
          }

          var failedCount = (finalPayload.failedPatches && finalPayload.failedPatches.length) || 0;
          var successCount = finalPayload.files ? finalPayload.files.length : 0;

          if (failedCount > 0) {
            clientSummary += "\n⚠️ Notice: " + failedCount + " patch(es) failed and were safely skipped. " + successCount + " valid file(s) are being saved.\n";
          }

          if (finalPayload.serverScript) {
            clientSummary += "• Server Script Detected (" + finalPayload.serverScript.length + " bytes)\n";
          }

          clientSummary += "\nℹ️ Note: All AST method parsing & patch compilation executed 100% on client browser JavaScript.\n";
          clientSummary += "⚡ Persisting compiled files to storage...\n\n";

          var pasteBtn = document.getElementById('btn-paste-chatbot');
          var feedbackCard = document.getElementById('feedback-card');
          if (pasteBtn && feedbackCard && typeof LunoAnimationEngine !== 'undefined') {
            LunoAnimationEngine.flyElement(pasteBtn, feedbackCard, {
              label: '📥 Applying Payload (' + successCount + ' files)',
              color: failedCount > 0 ? '#ff9800' : '#3fb950',
              glowColor: failedCount > 0 ? 'rgba(255, 152, 0, 0.85)' : 'rgba(63, 185, 80, 0.85)',
              icon: '⚡',
              duration: 550
            });
          }

          if (targetApp && targetApp.showFeedback) {
            targetApp.showFeedback(clientSummary, failedCount > 0 ? "info" : "info");
          }

          if (targetApp && targetApp.showToast) {
            targetApp.showToast('Applying payload to [' + (targetProj || 'Luno') + '] (' + (isDirectAutoApply ? 'Auto-Apply' : 'Patch Log') + ')...', 'info', '⚡');
          }

          var data = null;
          if (successCount > 0 || finalPayload.serverScript) {
            if (typeof LunoApiClient !== 'undefined' && LunoApiClient.savePayload) {
              data = await LunoApiClient.savePayload(finalPayload, targetProj);
            } else {
              var pParam = targetProj ? ('?project=' + encodeURIComponent(targetProj)) : '';
              var res = await fetch("/api/save" + pParam, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalPayload)
              });
              data = await res.json();
            }
          } else {
            data = { success: false, error: 'All patches in payload failed validation.', modifiedCount: 0 };
          }

          var finalFeedback = clientSummary + "📊 STORAGE EXECUTION RESPONSE:\n" + (data.llmFeedback || JSON.stringify(data, null, 2));

          if (targetApp && targetApp.showFeedback) {
            targetApp.showFeedback(finalFeedback, data && data.success ? (failedCount > 0 ? "info" : "success") : "error");
          }

          if (feedbackCard && typeof LunoAnimationEngine !== 'undefined') {
            LunoAnimationEngine.pulseTarget(feedbackCard, {
              color: data && data.success ? (failedCount > 0 ? '#ff9800' : '#00f2fe') : '#ff7b72',
              glowColor: data && data.success ? (failedCount > 0 ? 'rgba(255, 152, 0, 0.7)' : 'rgba(0, 242, 254, 0.7)') : 'rgba(255, 123, 114, 0.7)'
            });
          }

          if (data && data.success) {
            if (input) input.value = "";

            // Auto-pollution removed: Feedback is visible in the Output card and can be explicitly sent to Outbox if desired

            if (typeof LunoLoader !== 'undefined' && LunoLoader.applyPatchLog) {
              await LunoLoader.applyPatchLog(targetProj);
            }

            if (typeof OutboxQueue !== 'undefined' && OutboxQueue.renderWidget) {
              try { OutboxQueue.renderWidget(); } catch(e){}
            }

            if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.reloadActivePreviewIframe) {
              LunoSpaDock.reloadActivePreviewIframe(targetProj);
            }

            if (typeof ClientApp !== 'undefined' && ClientApp.fetchCodebaseMetrics) {
              await ClientApp.fetchCodebaseMetrics(targetProj);
            }

            if (targetApp && targetApp.showToast) {
              var modCount = data.modifiedCount !== undefined ? data.modifiedCount : (data.count || 0);
              if (failedCount > 0) {
                targetApp.showToast('Saved ' + modCount + ' file(s) (' + failedCount + ' invalid patch(es) skipped)', 'info', '⚠️');
              } else if (modCount > 0) {
                var modeDesc = isDirectAutoApply ? 'Directly Merged & Saved' : 'Journaled & Saved';
                targetApp.showToast(modeDesc + ' ' + modCount + ' file(s) in [' + (targetProj || 'Luno') + ']!', 'success', '💾');
              } else {
                targetApp.showToast('Evaluated: Target(s) up-to-date.', 'info', 'ℹ️');
              }
            }
          } else {
            throw new Error((data && data.error) || 'Save operation failed in storage');
          }
        } catch (err) {
          console.error('[ClientAppPaster Exception]', err);
          if (targetApp && targetApp.showFeedback) {
            targetApp.showFeedback("❌ Save Error: " + err.message + "\n\n" + (err.stack || ""), "error");
          }
          if (targetApp && targetApp.showToast) {
            targetApp.showToast("Save Error: " + err.message, "error", "❌");
          }
        }
      }
}

globalThis.ClientAppPaster = ClientAppPaster;
if (typeof module !== "undefined" && module.exports) module.exports = ClientAppPaster;