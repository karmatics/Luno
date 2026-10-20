class ClientApp {
  constructor() {}

  static activeRootDir = '';
  static targetProjectName = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_target_project')) || 'Luno';
  static executionPace = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_execution_pace')) || 'methodical';
  static autoApprove = typeof localStorage !== 'undefined' && localStorage.getItem('luno_auto_approve') === 'true';
  static inboxMetricsText = '📥 Ready to receive payload';
  static outboxMetricsText = '📊 Outbox: Ready';
  static uncommittedCount = 0;
  static lastMemoryHotPatch = null;

  static setTargetProject(name, options) {
    var opts = options || {};
    var pName = name || 'Luno';
    ClientApp.targetProjectName = pName;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('luno_target_project', pName);
        if (pName) localStorage.setItem('luno_active_app_proj', pName);
      }
    } catch (e) {}

    var headerSelect = document.getElementById('global-target-project-select');
    if (headerSelect && headerSelect.value !== pName) {
      headerSelect.value = pName;
    }

    ClientApp.fetchCodebaseMetrics(pName);

    if (typeof LunoPlaybackLogger !== 'undefined') {
      LunoPlaybackLogger.boot('Target Project Changed', pName);
    }

    if (opts.openTab && typeof LunoSpaHeaderNav !== 'undefined') {
      LunoSpaHeaderNav.openProjectTab(pName);
    }
  }

  static getTargetProject() {
    if (ClientApp.targetProjectName && ClientApp.targetProjectName !== 'Luno Workspace') {
      return ClientApp.targetProjectName;
    }
    if (ClientApp.activeRootDir) {
      var lastSegment = ClientApp.activeRootDir.split('/').filter(Boolean).pop();
      if (lastSegment && lastSegment !== 'Luno Workspace') return lastSegment;
    }
    return 'Luno';
  }
  static async init() {
      console.log('[Luno] Workspace online.');
      try {
        // Boot dynamic CSS theme immediately so user preferences apply on load
        if (typeof LunoThemeEngine !== 'undefined' && typeof LunoThemeEngine.applyDynamicTheme === 'function') {
          LunoThemeEngine.applyDynamicTheme();
        }

        await ClientApp.checkPing();
        if (!ClientApp.targetProjectName && ClientApp.activeRootDir) {
          ClientApp.targetProjectName = ClientApp.activeRootDir.split('/').filter(Boolean).pop() || 'Luno';
        }
        await ClientApp.fetchCodebaseMetrics();
        var savedView = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_active_dock_view')) || 'workspace';
        if (typeof LunoSpaDock !== 'undefined') {
          LunoSpaDock.mountView(savedView);
        } else {
          ClientApp.renderUI();
        }
        if (typeof OutboxQueue !== 'undefined') {
          OutboxQueue.renderWidget();
        }
      } catch (err) {
        console.error('[Luno Init Exception]', err);
        ClientApp.renderErrorRecoveryUI(err);
      }
    }
  static renderUI() {
    try {
      var root = document.getElementById('app-root') || document.body;
      if (typeof ClientAppUI !== 'undefined') {
        ClientAppUI.renderOutboxFirstLayout(root);
      }
    } catch (err) {
      console.error('[Luno Render Exception]', err);
      ClientApp.renderErrorRecoveryUI(err);
    }
  }

  static showToast(message, type, icon) {
    var toastType = type || 'success';
    var toastIcon = icon || '✨';
    var msgText = String(message || '');

    if (typeof LunoPlaybackLogger !== 'undefined') {
      if (toastType === 'error') LunoPlaybackLogger.error('Toast Error', msgText);
      else if (toastType === 'info') LunoPlaybackLogger.boot('Toast Notice', msgText);
      else LunoPlaybackLogger.patch('Toast Success', msgText);
    }

    var container = document.getElementById('toast-box');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-box';
      container.style.cssText = 'position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:0.5rem; max-width:92vw; width:max-content; pointer-events:auto;';
      document.body.appendChild(container);
    }

    var t = document.createElement('div');
    var isErr = toastType === 'error';
    var isInfo = toastType === 'info';
    var bg = isErr ? '#2c080a' : (isInfo ? '#0d2d4a' : '#0d2818');
    var color = isErr ? '#ff7b72' : (isInfo ? '#58a6ff' : '#3fb950');
    var border = isErr ? '#f85149' : (isInfo ? '#0088cc' : '#238636');

    t.style.cssText = [
      'background:' + bg + ';',
      'color:' + color + ';',
      'border:2px solid ' + border + ';',
      'padding:0.75rem 1.2rem;',
      'border-radius:10px;',
      'font-family:monospace;',
      'font-size:0.85rem;',
      'font-weight:bold;',
      'box-shadow:0 8px 24px rgba(0,0,0,0.9);',
      'cursor:pointer;',
      'user-select:none;',
      'display:flex;',
      'align-items:center;',
      'justify-content:space-between;',
      'gap:0.75rem;',
      'word-break:break-word;',
      'transform: translateY(-12px) scale(0.95);',
      'opacity: 0;',
      'transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out;'
    ].join('\n');

    t.title = 'Tap to copy error message';
    t.innerHTML = '<span>' + toastIcon + ' ' + msgText + '</span><span style="font-size:0.72rem; opacity:0.7; margin-left:0.5rem;">[Tap to Copy / Dismiss]</span>';

    t.onclick = function() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msgText);
      }
      t.style.borderColor = '#00f2fe';
      setTimeout(function() {
        if (t.parentNode) t.remove();
      }, 350);
    };

    container.appendChild(t);

    requestAnimationFrame(function() {
      t.style.transform = 'translateY(0) scale(1)';
      t.style.opacity = '1';
    });

    var dismissTimeout = isErr ? 60000 : (isInfo ? 3500 : 2200);

    setTimeout(function() {
      if (t.parentNode) {
        t.style.transform = 'translateY(-10px) scale(0.92)';
        t.style.opacity = '0';
        setTimeout(function() { if (t.parentNode) t.remove(); }, 240);
      }
    }, dismissTimeout);
  }

  static async fetchCodebaseMetrics(projectOverride) {
    var proj = projectOverride || ClientApp.getTargetProject() || 'Luno';

    try {
      var data = await LunoApiClient.fetchAllCode(proj);
      if (data && data.manifest) {
        ClientApp.outboxMetricsText = '📊 Outbox (' + proj + '): ' + data.manifest.length + ' files';
        var badge = document.getElementById('outbox-metrics-badge');
        if (badge) badge.textContent = ClientApp.outboxMetricsText;
      }
    } catch (e) {}

    try {
      var mData = await LunoApiClient.fetchFsRead('luno.json', proj);
      if (mData && mData.content) {
        var meta = JSON.parse(mData.content);
        ClientApp.uncommittedCount = meta.processedCountSinceCheckpoint || 0;
        var cpSub = document.getElementById('checkpoint-btn-subtitle');
        if (cpSub) {
          cpSub.textContent = 'save in git (' + ClientApp.uncommittedCount + ' uncommitted file' + (ClientApp.uncommittedCount === 1 ? '' : 's') + ')';
        }
      }
    } catch (e) {}
  }

  static async checkPing() {
    try {
      var data = await LunoApiClient.ping();
      ClientApp.activeRootDir = data.rootDir || '';

      var verBadge = document.getElementById('luno-version-tag');
      if (verBadge) verBadge.textContent = data.version || 'v3.6.6';
      var rootLabel = document.getElementById('active-root-label');
      if (rootLabel) rootLabel.textContent = ClientApp.activeRootDir;
    } catch (e) {}
  }

  static showFeedback(text, type, options) {
      var feedbackType = type || 'info';
      var opts = options || {};
      var box = document.getElementById('feedback');
      var parentCard = document.getElementById('feedback-card');
      if (!box) return;

      if (parentCard) {
        parentCard.style.display = 'block';
        parentCard.style.boxShadow = '0 0 24px #00f2fe, 0 0 12px #3fb950';
        try {
          parentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {}
        setTimeout(function() {
          if (parentCard) parentCard.style.boxShadow = '0 4px 12px rgba(0, 242, 254, 0.2)';
        }, 3500);
      }

      box.style.display = 'block';
      box.style.color = feedbackType === 'error' ? '#ff7b72' : (feedbackType === 'info' ? '#58a6ff' : '#3fb950');

      var fileDiffs = opts.fileDiffs || [];
      var rawText = String(text || '');

      var isColorEnabled = (typeof LunoSettings !== 'undefined' && typeof LunoSettings.colorizedFeedbackEnabled === 'function')
        ? LunoSettings.colorizedFeedbackEnabled()
        : true;

      var totalAdded = fileDiffs.reduce(function(sum, d) { return sum + (d.linesAdded || 0); }, 0);
      var totalRemoved = fileDiffs.reduce(function(sum, d) { return sum + (d.linesRemoved || 0); }, 0);
      var totalsBadge = fileDiffs.length > 0
        ? '<span style="font-size:0.68rem; color:#3fb950; background:#0d2818; border:1px solid #238636; padding:0.15rem 0.45rem; border-radius:8px; font-weight:bold;">' + fileDiffs.length + ' file(s) · +' + totalAdded + ' / -' + totalRemoved + ' LOC</span>'
        : '';

      var headerHtml = [
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; border-bottom:1px solid #30363d; padding-bottom:0.35rem; flex-wrap:wrap; gap:0.4rem;">',
        '  <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">',
        '    <span style="font-weight:bold; color:#00f2fe; font-size:0.75rem; font-family:monospace;">⚡ EXECUTION & MODIFICATION FEEDBACK:</span>',
        '    ' + totalsBadge,
        '  </div>',
        '  <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">',
        (fileDiffs.length > 0 && typeof DiffApprovalModal !== 'undefined') ? '    <button id="btn-feedback-inspect-diffs" style="padding:0.25rem 0.6rem; font-size:0.7rem; background:#003847; color:#00f2fe; border:1px solid #00f2fe; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">🔍 Inspect Diffs (' + fileDiffs.length + ')</button>' : '',
        '    <button id="btn-feedback-outbox" style="padding:0.25rem 0.6rem; font-size:0.7rem; background:#271052; color:#d2a8ff; border:1px solid #8257e5; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">📤 Send to Outbox</button>',
        '    <button id="btn-feedback-copy" style="padding:0.25rem 0.6rem; font-size:0.7rem; background:#161b22; color:#58a6ff; border:1px solid #0088cc; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">📋 Copy Output</button>',
        '    <button id="btn-feedback-close" style="padding:0.25rem 0.5rem; font-size:0.7rem; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">✖ Close</button>',
        '  </div>',
        '</div>'
      ].join('\n');

      var colorizedDiffsHtml = '';
      if (isColorEnabled && fileDiffs.length > 0 && typeof CodeDiffer !== 'undefined') {
        colorizedDiffsHtml = '<div id="feedback-diffs-summary" style="display:flex; flex-direction:column; gap:0.35rem; margin-bottom:0.5rem;">';
        colorizedDiffsHtml += '  <div style="font-size:0.72rem; color:#8b949e; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">Applied File Modifications (click to inspect individual diff):</div>';

        fileDiffs.forEach(function(diffItem, dIdx) {
          var fileName = diffItem.filePath.split('/').pop() || diffItem.filePath;
          var pills = CodeDiffer.createStatsPills(diffItem.linesRemoved || 0, diffItem.linesAdded || 0, diffItem.byteDelta || 0);
          var isServer = (diffItem.mode === 'server-script');
          var isPatch = (diffItem.mode === 'surgical-patch' || diffItem.mode === 'direct-ast-apply');
          var modeBadge = isServer ? '<span style="color:#e3b341; font-size:0.68rem; font-weight:bold;">[Server Script]</span>' : (isPatch ? '<span style="color:#00f2fe; font-size:0.68rem; font-weight:bold;">[AST Patch]</span>' : '<span style="color:#58a6ff; font-size:0.68rem;">[Full File]</span>');

          colorizedDiffsHtml += [
            '<div class="feedback-file-diff-row" data-diff-index="' + dIdx + '" style="background:#070a13; border:1px solid #21262d; border-radius:6px; padding:0.4rem 0.65rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:border-color 0.15s ease; gap:0.4rem; flex-wrap:wrap;">',
            '  <div style="display:flex; align-items:center; gap:0.45rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">',
            '    <span class="feedback-file-jump-link" data-path="' + diffItem.filePath + '" style="color:#58a6ff; font-weight:bold; font-size:0.78rem; text-decoration:underline; cursor:pointer;" title="Click to view file in File Manager">' + fileName + '</span>',
            '    <span style="color:#8b949e; font-size:0.68rem;">(' + diffItem.filePath + ')</span>',
            '    ' + modeBadge,
            '  </div>',
            '  <div style="display:flex; gap:0.4rem; align-items:center;">',
            '    ' + pills,
            '    <button class="btn-diff-item-preview" data-diff-index="' + dIdx + '" style="padding:0.15rem 0.45rem; font-size:0.68rem; background:#161b22; color:#00f2fe; border:1px solid #00f2fe66; border-radius:4px; cursor:pointer; font-family:monospace; font-weight:bold;">🔍 Diff</button>',
            '  </div>',
            '</div>'
          ].join('\n');
        });
        colorizedDiffsHtml += '</div>';
      }

      var preHtml = '<pre id="feedback-text-area" style="white-space:pre-wrap; word-break:break-all; font-family:monospace; font-size:0.78rem; max-height:240px; overflow-y:auto; margin:0; padding:0.5rem; background:#070a13; border:1px solid #21262d; border-radius:6px;"></pre>';

      box.innerHTML = headerHtml + colorizedDiffsHtml + preHtml;

      var textEl = document.getElementById('feedback-text-area');
      if (textEl) textEl.textContent = rawText;

      var btnInspectAll = document.getElementById('btn-feedback-inspect-diffs');
      if (btnInspectAll && typeof DiffApprovalModal !== 'undefined') {
        btnInspectAll.onclick = function() {
          DiffApprovalModal.open({
            payloadText: rawText,
            fileDiffs: fileDiffs,
            onConfirm: function() {
              ClientApp.showToast('Diff inspection completed.', 'info');
            }
          });
        };
      }

      var diffPreviewBtns = box.querySelectorAll('.btn-diff-item-preview');
      diffPreviewBtns.forEach(function(btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          var idx = parseInt(btn.dataset.diffIndex, 10);
          var item = fileDiffs[idx];
          if (item && typeof DiffApprovalModal !== 'undefined') {
            DiffApprovalModal.open({
              fileDiffs: [item],
              onConfirm: function() {}
            });
          }
        };
      });

      var jumpLinks = box.querySelectorAll('.feedback-file-jump-link');
      jumpLinks.forEach(function(link) {
        link.onclick = function(e) {
          e.stopPropagation();
          var path = link.dataset.path;
          if (path && typeof DiskBrowser !== 'undefined' && DiskBrowser.openFileEditorModal) {
            if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
              LunoSpaDock.mountView('browser').then(function() {
                DiskBrowser.openFileEditorModal(path);
              });
            } else {
              DiskBrowser.openFileEditorModal(path);
            }
          }
        };
      });

      var btnOutbox = document.getElementById('btn-feedback-outbox');
      if (btnOutbox) {
        btnOutbox.onclick = function() {
          if (rawText && typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
            OutboxQueue.addBundle('Storage Execution Response Output', rawText, { priority: 'high' });
            ClientApp.showToast('Sent execution feedback directly to Outbox!', 'success', '📤');
          }
        };
      }

      var btnCopy = document.getElementById('btn-feedback-copy');
      if (btnCopy) {
        btnCopy.onclick = function() {
          if (rawText && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rawText).then(function() {
              ClientApp.showToast('Copied execution feedback to clipboard!', 'success', '📋');
            });
          }
        };
      }

      var btnClose = document.getElementById('btn-feedback-close');
      if (btnClose) {
        btnClose.onclick = function() {
          if (parentCard) parentCard.style.display = 'none';
          else box.style.display = 'none';
        };
      }
    }
  static renderErrorRecoveryUI(err) {
    var errStack = (err && (err.stack || err.message)) || String(err);
    var root = document.getElementById('app-root') || document.body;
    root.innerHTML = '';

    var card = document.createElement('div');
    card.style.cssText = 'padding:1.25rem; background:#161b22; color:#c9d1d9; font-family:monospace; min-height:100vh; display:flex; flex-direction:column; gap:1rem; box-sizing:border-box;';

    var h = document.createElement('h2');
    h.style.cssText = 'color:#f85149; margin:0; font-size:1.1rem;';
    h.textContent = '⚠️ Workspace Rendering Exception Detected';

    var box = document.createElement('div');
    box.style.cssText = 'background:#0d1117; border:1px solid #da3633; padding:1rem; border-radius:8px; color:#ff7b72; font-size:0.82rem; white-space:pre-wrap; word-break:break-all; max-height:320px; overflow-y:auto;';
    box.textContent = errStack;

    card.appendChild(h);
    card.appendChild(box);
    root.appendChild(card);
  }

  static async switchExclusiveTargetProject(projectName) {
    var pName = projectName || 'Luno';
    var isLunoSelf = (pName === 'Luno');
    var isLibrary = (pName === 'Library' || pName.toLowerCase() === 'library');
    var openTabs = (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.getOpenProjectTabs)
      ? LunoSpaHeaderNav.getOpenProjectTabs()
      : [];

    var tabsToClose = (isLunoSelf || isLibrary) ? openTabs : openTabs.filter(function(t) { return t !== pName; });

    // Clean up DOM nodes and iframe caches for all closed tabs
    if (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.cleanupProjectTab) {
      tabsToClose.forEach(function(t) {
        LunoSpaHeaderNav.cleanupProjectTab(t);
      });
    }

    // If selecting Luno or Library, stay on the workspace home (do NOT mount a preview iframe)
    if (isLunoSelf || isLibrary) {
      if (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.saveOpenProjectTabs) {
        LunoSpaHeaderNav.saveOpenProjectTabs([]);
      }
      ClientApp.setTargetProject(pName);
      if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
        await LunoSpaDock.mountView('workspace');
      }
      if (typeof ClientApp.showToast === 'function') {
        var label = isLibrary ? 'Target set to [Library] (Shared Hub) — Home view active' : 'Target set to [Luno] (Self-Improve) — Home view active';
        ClientApp.showToast(label, 'success', isLibrary ? '📚' : '⚡');
      }
      return;
    }

    // For runnable sibling apps, retain target in open tabs and mount preview
    if (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.saveOpenProjectTabs) {
      LunoSpaHeaderNav.saveOpenProjectTabs([pName]);
    }

    ClientApp.setTargetProject(pName, { openTab: true });

    if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
      await LunoSpaDock.mountView('app_' + pName);
    }

    if (tabsToClose.length > 0 && typeof ClientApp.showToast === 'function') {
      ClientApp.showToast('Switched to [' + pName + ']', 'info', '🎯');
    }
  }
}

globalThis.ClientApp = ClientApp;
if (typeof module !== 'undefined' && module.exports) module.exports = ClientApp;