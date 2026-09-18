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

  static showFeedback(text, type) {
    var feedbackType = type || 'info';
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

    var headerHtml = [
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; border-bottom:1px solid #30363d; padding-bottom:0.35rem; flex-wrap:wrap; gap:0.4rem;">',
      '  <span style="font-weight:bold; color:#00f2fe; font-size:0.75rem; font-family:monospace;">⚡ OUTPUT & EXECUTION FEEDBACK:</span>',
      '  <div style="display:flex; gap:0.35rem; align-items:center;">',
      '    <button id="btn-feedback-outbox" style="padding:0.25rem 0.6rem; font-size:0.7rem; background:#271052; color:#d2a8ff; border:1px solid #8257e5; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">📤 Send to Outbox</button>',
      '    <button id="btn-feedback-copy" style="padding:0.25rem 0.6rem; font-size:0.7rem; background:#161b22; color:#58a6ff; border:1px solid #0088cc; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">📋 Copy Output</button>',
      '    <button id="btn-feedback-close" style="padding:0.25rem 0.5rem; font-size:0.7rem; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; cursor:pointer; font-weight:bold; font-family:monospace;">✖ Close</button>',
      '  </div>',
      '</div>',
      '<pre id="feedback-text-area" style="white-space:pre-wrap; word-break:break-all; font-family:monospace; font-size:0.78rem; max-height:280px; overflow-y:auto; margin:0; padding:0.4rem; background:#070a13; border-radius:6px;"></pre>'
    ].join('\n');

    box.innerHTML = headerHtml;

    var textEl = document.getElementById('feedback-text-area');
    if (textEl) textEl.textContent = text;

    var btnOutbox = document.getElementById('btn-feedback-outbox');
    if (btnOutbox) {
      btnOutbox.onclick = function() {
        if (text && typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
          OutboxQueue.addBundle('Storage Execution Response Output', text, { priority: 'high' });
          ClientApp.showToast('Sent execution feedback directly to Outbox!', 'success', '📤');
        }
      };
    }

    var btnCopy = document.getElementById('btn-feedback-copy');
    if (btnCopy) {
      btnCopy.onclick = function() {
        if (text) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
              ClientApp.showToast('Copied execution feedback to clipboard!', 'success', '📋');
            });
          }
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
      var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '';
      var currentActiveView = (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.activeDockView) || '';
      var openTabs = (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.getOpenProjectTabs)
        ? LunoSpaHeaderNav.getOpenProjectTabs()
        : [];

      var tabsToClose = isLunoSelf ? openTabs : openTabs.filter(function(t) { return t !== pName; });

      // Clean up DOM nodes and iframe caches for all closed tabs
      if (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.cleanupProjectTab) {
        tabsToClose.forEach(function(t) {
          LunoSpaHeaderNav.cleanupProjectTab(t);
        });
      }

      if (isLunoSelf) {
        if (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.saveOpenProjectTabs) {
          LunoSpaHeaderNav.saveOpenProjectTabs([]);
        }
        ClientApp.setTargetProject('Luno');
        if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
          await LunoSpaDock.mountView('workspace');
        }
        if (tabsToClose.length > 0 && typeof ClientApp.showToast === 'function') {
          ClientApp.showToast('Target set to [Luno] (Self-Improve) — Home view active', 'success', '⚡');
        }
        return;
      }

      // Retain only the new target in open tabs for sibling apps
      if (typeof LunoSpaHeaderNav !== 'undefined' && LunoSpaHeaderNav.saveOpenProjectTabs) {
        LunoSpaHeaderNav.saveOpenProjectTabs([pName]);
      }

      // Update target project state and active app storage
      ClientApp.setTargetProject(pName, { openTab: true });

      // Mount and focus the target project preview
      if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
        await LunoSpaDock.mountView('app_' + pName);
      }

      // Inform user when other tabs were culled
      if (tabsToClose.length > 0 && typeof ClientApp.showToast === 'function') {
        ClientApp.showToast('Switched to [' + pName + '] (closed ' + tabsToClose.length + ' other preview tab' + (tabsToClose.length === 1 ? '' : 's') + ')', 'info', '🎯');
      }
    }
}

globalThis.ClientApp = ClientApp;
if (typeof module !== 'undefined' && module.exports) module.exports = ClientApp;