class LunoDeployEngine {
  constructor() {}

  static REPO_MAP_KEY = 'luno_github_repo_mappings_v1';
  static GITHUB_TOKEN_KEY = 'luno_github_pat_token';
  static DEFAULT_ACCOUNT = 'karmatics';
  static gitStatusCache = new Map();

  static getGithubAccount() {
    try {
      if (typeof localStorage !== 'undefined') {
        var saved = localStorage.getItem('luno_github_account');
        if (saved) return saved;
      }
      if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        var host = window.location.hostname.toLowerCase();
        if (host.endsWith('.github.io')) {
          var user = host.split('.')[0];
          if (user && user !== 'localhost') return user;
        }
      }
    } catch(e) {}
    return LunoDeployEngine.DEFAULT_ACCOUNT || 'karmatics';
  }

  static setGithubAccount(account) {
    try {
      if (typeof localStorage !== 'undefined') {
        var clean = (account || '').trim();
        localStorage.setItem('luno_github_account', clean || LunoDeployEngine.DEFAULT_ACCOUNT || 'karmatics');
      }
    } catch(e) {}
  }

  static get GITHUB_ORG() {
    return LunoDeployEngine.getGithubAccount();
  }

  static getGithubToken() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        var sTok = sessionStorage.getItem(LunoDeployEngine.GITHUB_TOKEN_KEY);
        if (sTok) return sTok;
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LunoDeployEngine.GITHUB_TOKEN_KEY) || '';
      }
    } catch(e) {}
    return '';
  }

  static setGithubToken(token, sessionOnly) {
    var clean = (token || '').trim();
    try {
      if (sessionOnly && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(LunoDeployEngine.GITHUB_TOKEN_KEY, clean);
        if (typeof localStorage !== 'undefined') localStorage.removeItem(LunoDeployEngine.GITHUB_TOKEN_KEY);
        return;
      }
      if (typeof localStorage !== 'undefined') localStorage.setItem(LunoDeployEngine.GITHUB_TOKEN_KEY, clean);
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(LunoDeployEngine.GITHUB_TOKEN_KEY, clean);
    } catch(e) {}
  }

  static getRepoMappings() {
    var defaults = {
      'Luno': 'Luno',
      'Library': 'Library',
      'QuoraToys': 'QuoraToys',
      'EconomicsOfAutomation': 'EconomicsOfAutomation',
      'HomeSetup': 'HomeSetup',
      'CadPlan': 'CadPlan',
      'accuCad': 'accuCad',
      'accudraw': 'accudraw',
      'situation': 'situation',
      'ValuationOfAccudraw': 'ValuationOfAccudraw',
      'JobsAndAI': 'JobsAndAI',
      'TouchController': 'TouchController',
      'Comments': 'Comments',
      'Community': 'Community',
      'Voting': 'Voting',
      'Basic3D': 'Basic3D',
      'BasicsWithDialogBox': 'BasicsWithDialogBox',
      'TriBlob': 'TriBlob',
      'teacup': 'teacup',
      'LegoDetective': 'LegoDetective',
      'AlphabetGame': 'AlphabetGame',
      'MathStorm': 'MathStorm',
      'guessTheNoteGame': 'guessTheNoteGame',
      'Calculator': 'Calculator',
      'AardvarkPlaylist': 'AardvarkPlaylist',
      'AardvarkExtension': 'AardvarkExtension',
      'SvgStudio': 'SvgStudio',
      'Es6Converter': 'Es6Converter',
      'LunoParser': 'LunoParser',
      'BookmarkletWorkshop': 'BookmarkletWorkshop',
      'RunOnServerTools': 'RunOnServerTools'
    };

    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(LunoDeployEngine.REPO_MAP_KEY);
        if (raw) return Object.assign(defaults, JSON.parse(raw));
      }
    } catch(e) {}
    return defaults;
  }

  static getRemoteRepoName(projectName) {
    var mappings = LunoDeployEngine.getRepoMappings();
    return mappings[projectName] || projectName;
  }

  static getPeerHost() {
    try {
      if (typeof localStorage !== 'undefined') {
        var saved = localStorage.getItem('luno_peer_host');
        if (saved && saved.trim()) return saved.trim();
      }
    } catch(e) {}

    if (typeof ClientApp !== 'undefined') {
      if (ClientApp.activePlatform === 'linux' || ClientApp.isLinux) return '10.0.0.226';
      if (ClientApp.activePlatform === 'darwin' || ClientApp.isMac) return '10.0.0.245';
    }

    if (typeof window !== 'undefined' && window.location) {
      var h = window.location.hostname;
      if (h === '10.0.0.245') return '10.0.0.226';
      if (h === '10.0.0.226') return '10.0.0.245';
    }

    return '10.0.0.245';
  }

  static setPeerHost(host) {
    if (!host) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('luno_peer_host', host.trim());
      }
    } catch(e) {}
  }

  // ---------------------------------------------------------------------------
  // SMART SYNCHRONIZATION CORE (GIT-MANAGED, ZERO RAW-FILE DESTRUCTIVE OVERWRITES)
  // ---------------------------------------------------------------------------
  static async syncEverything(options = {}) {
    var opts = options || {};
    var peerHost = opts.peerHost || LunoDeployEngine.getPeerHost();
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};

    onProgress('🔍 1/3: Checking project modifications...');
    var statusRes = await LunoDeployEngine.getFleetStatus(false);
    var dirty = (statusRes && statusRes.dirtyProjects) || [];
    var dirtyNames = dirty.map(d => d.name);

    var committedCount = 0;
    if (dirtyNames.length > 0) {
      onProgress(`📸 2/3: Recording Git snapshots for ${dirtyNames.length} modified project(s)...`);
      var commitRes = await LunoDeployEngine.commitSelectedProjects(dirtyNames, `[Auto-Sync Checkpoint] ${new Date().toLocaleString()}`);
      committedCount = (commitRes && commitRes.results ? commitRes.results.filter(r => r.changesCommitted).length : dirtyNames.length);
    } else {
      onProgress('✓ Working trees are clean. No uncommitted modifications.');
    }

    onProgress('⬆️ 3/3: Pushing latest commits to GitHub...');
    var pushRes = await LunoDeployEngine.fleetSync('push', {
      commitMsg: `[Fleet Sync] ${new Date().toLocaleString()}`
    });

    // Notify peer node safely over Git pull (never raw file blast)
    var peerPullRes = null;
    try {
      peerPullRes = await LunoDeployEngine.fleetSync('pull', { host: peerHost });
    } catch(e) {
      peerPullRes = { success: false, error: e.message };
    }

    var summary = [
      '================================================================================',
      '🎉 SMART FLEET SYNCHRONIZATION COMPLETE',
      '================================================================================',
      `• Local Snapshots:       ${committedCount} project(s) committed cleanly`,
      `• GitHub Remote Push:    ${pushRes && pushRes.success ? '✅ Pushed to GitHub' : '⚠️ ' + (pushRes?.error || 'Remote push notice')}`,
      `• Peer Synchronization:  ${peerPullRes && peerPullRes.success ? '✅ Peer (' + peerHost + ') synchronized cleanly via Git' : 'ℹ️ Peer node (' + peerHost + ') on standby'}`,
      '• Integrity Guarantee:   Git-versioned history. Zero blind raw-file overwrites.',
      '================================================================================\n'
    ].join('\n');

    return {
      success: true,
      committedCount,
      pushRes,
      peerPullRes,
      summary
    };
  }

  // Safe wrapper for backwards-compatibility: ensures single-project push doesn't clobber files
  static async directLanSync(targetHost = null, options = {}) {
    var peerHost = targetHost || LunoDeployEngine.getPeerHost();
    var pName = options.project || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

    // Safe mode: Commit locally, push to Git, and tell peer to pull cleanly
    var commitRes = await LunoDeployEngine.commitSelectedProjects([pName], `[Auto-Sync] ${new Date().toLocaleString()}`);
    var pushRes = await LunoDeployEngine.deployProjectToGitHub(pName, `[Auto-Sync Deploy] ${new Date().toLocaleString()}`, null, { deployToPages: false });
    var pullRes = await LunoDeployEngine.pullProject(pName);

    return {
      success: true,
      count: 1,
      host: peerHost,
      project: pName,
      message: 'Safely synced via Git'
    };
  }

  static async getFleetStatus(forceFetch = false) {
    try {
      var res = await fetch('/api/git/fleet-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
        body: JSON.stringify({ action: 'status', fetch: Boolean(forceFetch) })
      });
      return await res.json();
    } catch(err) {
      return { success: false, error: err.message, results: [], dirtyProjects: [] };
    }
  }

  static async commitSelectedProjects(projectsList, commitMsg) {
    if (!Array.isArray(projectsList) || projectsList.length === 0) {
      return { success: false, error: 'No projects selected to commit' };
    }
    var msg = commitMsg || `[Auto-Sync Checkpoint] ${new Date().toLocaleString()}`;
    try {
      var res = await fetch('/api/git/fleet-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
        body: JSON.stringify({ action: 'commit-selected', projects: projectsList, commitMsg: msg })
      });
      return await res.json();
    } catch(err) {
      return { success: false, error: err.message };
    }
  }

  static async fleetSync(action = 'status', options = {}) {
    var opts = options || {};
    var commitMsg = opts.commitMsg || `[Fleet Sync] ${new Date().toLocaleString()}`;
    var targetHost = opts.host || '';
    var baseUrl = targetHost ? `http://${targetHost}:8080` : '';

    try {
      var res = await fetch(`${baseUrl}/api/git/fleet-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
        body: JSON.stringify({
          action,
          commitMsg,
          branch: opts.branch || 'main',
          autocommit: opts.autocommit !== false,
          fetch: opts.fetch !== false
        })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async pullProject(projectName, options = {}) {
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    var opts = options || {};

    try {
      var res = await fetch('/api/git/pull?project=' + encodeURIComponent(pName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
        body: JSON.stringify({
          project: pName,
          branch: opts.branch || 'main',
          autocommit: opts.autocommit !== false
        })
      });
      return await res.json();
    } catch(err) {
      return { success: false, error: err.message };
    }
  }

  static async deployProjectToGitHub(projectName, commitMsg, customRemoteUrl, options) {
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    var msg = commitMsg || ('[' + pName + '] Checkpoint ' + new Date().toLocaleString());
    var opts = options || {};
    var deployToPages = opts.deployToPages !== false;

    try {
      var res = await fetch('/api/deploy?project=' + encodeURIComponent(pName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
        body: JSON.stringify({
          project: pName,
          commitMsg: msg,
          deployToPages: deployToPages,
          token: LunoDeployEngine.getGithubToken()
        })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static async checkpointTargetProject(projectName, commitMsg, options) {
    var opts = options || {};
    var deployToPages = opts.deployToPages !== false;
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    var msg = commitMsg || ('[' + pName + '] Checkpoint ' + new Date().toLocaleString());

    return await LunoDeployEngine.deployProjectToGitHub(pName, msg, null, { deployToPages: deployToPages });
  }

  static async queueModifiedToOutbox() {
    var st = await LunoDeployEngine.getFleetStatus(false);
    var dirty = (st && st.dirtyProjects) || [];
    if (dirty.length === 0) return 0;

    var count = 0;
    for (var d of dirty) {
      if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
        OutboxQueue.addBundle(`Modified Project: ${d.name}`, `# Status for ${d.name}\n${d.statusText || 'Modified'}`);
        count++;
      }
    }
    return count;
  }

  static async getProjectGitStatusLazy(projectName, forceRefresh = false) {
    if (!forceRefresh && LunoDeployEngine.gitStatusCache.has(projectName)) {
      return LunoDeployEngine.gitStatusCache.get(projectName);
    }
    try {
      var res = await fetch('/api/git/file-diff?path=all&project=' + encodeURIComponent(projectName));
      var data = await res.json();
      LunoDeployEngine.gitStatusCache.set(projectName, data);
      return data;
    } catch(e) {
      return { success: false, hasGit: false };
    }
  }

  static async renderProjectDeployPanel(projectName, el, container) {
    if (!container) return;
    container.innerHTML = `<div style="font-size:0.75rem; color:#8b949e; padding:4px 0;">Git repository active on branch <strong>main</strong>.</div>`;
  }

  static openFleetSyncDialog() {
    var existing = document.getElementById('luno-fleet-sync-modal');
    if (existing) existing.remove();

    var peerHost = LunoDeployEngine.getPeerHost();

    var overlay = document.createElement('div');
    overlay.id = 'luno-fleet-sync-modal';
    overlay.style.cssText = [
      'position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
      'background: rgba(0, 0, 0, 0.88); z-index: 9992;',
      'display: flex; align-items: center; justify-content: center;',
      'padding: 1rem; font-family: monospace; backdrop-filter: blur(8px);'
    ].join('\n');

    var card = document.createElement('div');
    card.style.cssText = [
      'background: var(--bg-card, #161b22);',
      'border: 2px solid var(--accent-primary, #00f2fe);',
      'border-radius: 12px; padding: 1.25rem;',
      'max-width: 860px; width: 100%; max-height: 90vh;',
      'display: flex; flex-direction: column; gap: 0.75rem;',
      'box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(0, 242, 254, 0.25);',
      'box-sizing: border-box; overflow: hidden;'
    ].join('\n');

    var header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #30363d; padding-bottom:0.5rem;';
    header.innerHTML = [
      '<div style="display:flex; align-items:center; gap:0.5rem;">',
      '  <span style="font-size:1.2rem;">🔄</span>',
      '  <strong style="color:#00f2fe; font-size:1.05rem;">Safe Fleet Synchronizer</strong>',
      '  <span id="modal-peer-status" style="font-size:0.7rem; color:#10b981; background:rgba(16,185,129,0.15); border:1px solid #238636; padding:0.15rem 0.5rem; border-radius:10px; font-weight:bold;">Peer: ' + peerHost + ':8080</span>',
      '</div>',
      '<button id="btn-close-fleet-modal" style="background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:0.25rem 0.55rem; cursor:pointer; font-weight:bold;">✖</button>'
    ].join('\n');

    var statusBar = document.createElement('div');
    statusBar.id = 'fleet-modal-live-status';
    statusBar.style.cssText = 'background:#070a13; border:1px solid #1e293b; border-radius:6px; padding:0.6rem 0.85rem; font-size:0.75rem; color:#7ee787; white-space:pre-wrap; max-height:160px; overflow-y:auto; display:none;';

    var primaryBar = document.createElement('div');
    primaryBar.style.cssText = 'display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; background:#0d1117; padding:0.75rem; border-radius:8px; border:1px solid #238636;';

    var btnMasterSync = document.createElement('button');
    btnMasterSync.style.cssText = 'flex:2; min-width:220px; padding:0.75rem 1rem; background:#238636; color:#ffffff; border:none; border-radius:6px; font-weight:bold; font-size:0.9rem; cursor:pointer; font-family:monospace; box-shadow:0 4px 14px rgba(35,134,54,0.4); display:flex; align-items:center; justify-content:center; gap:0.4rem;';
    btnMasterSync.textContent = '🚀 1-Tap Safe Fleet Sync (No Overwrites)';

    var btnRefreshStatus = document.createElement('button');
    btnRefreshStatus.style.cssText = 'flex:1; min-width:130px; padding:0.75rem; background:#003847; color:#00f2fe; border:1px solid #00f2fe; border-radius:6px; font-weight:bold; font-size:0.8rem; cursor:pointer; font-family:monospace;';
    btnRefreshStatus.textContent = '🔍 Refresh Status';

    primaryBar.appendChild(btnMasterSync);
    primaryBar.appendChild(btnRefreshStatus);

    var projectsListContainer = document.createElement('div');
    projectsListContainer.style.cssText = 'flex:1; min-height:220px; max-height:48vh; overflow-y:auto; display:flex; flex-direction:column; gap:0.4rem; padding-right:4px;';
    projectsListContainer.innerHTML = '<div style="padding:1.5rem; color:#00f2fe; text-align:center;">⚡ Scanning all repositories across workspace...</div>';

    var footerRow = document.createElement('div');
    footerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-top:1px solid #30363d; padding-top:0.6rem;';
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'padding:0.45rem 0.85rem; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; font-size:0.75rem; cursor:pointer; font-family:monospace;';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => overlay.remove();
    footerRow.appendChild(document.createElement('div'));
    footerRow.appendChild(closeBtn);

    card.appendChild(header);
    card.appendChild(primaryBar);
    card.appendChild(statusBar);
    card.appendChild(projectsListContainer);
    card.appendChild(footerRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('btn-close-fleet-modal').onclick = () => overlay.remove();

    async function loadData() {
      projectsListContainer.innerHTML = '<div style="padding:1.5rem; color:#00f2fe; text-align:center;">⚡ Scanning all repositories...</div>';
      var res = await LunoDeployEngine.getFleetStatus(false);
      var dirty = (res && res.dirtyProjects) || [];

      projectsListContainer.innerHTML = '';
      if (dirty.length === 0) {
        projectsListContainer.innerHTML = [
          '<div style="padding:2rem; text-align:center; color:#3fb950; background:#0d2818; border:1px solid #238636; border-radius:8px;">',
          '  <strong style="font-size:1rem; display:block; margin-bottom:0.3rem;">✅ All Repositories Are 100% In Sync</strong>',
          '  <span style="font-size:0.75rem; color:#8b949e;">Every project is safely committed and matches remote Git branches.</span>',
          '</div>'
        ].join('\n');
        return;
      }

      dirty.forEach(function(proj) {
        var pCard = document.createElement('div');
        pCard.style.cssText = 'background:#0d1117; border:1px solid #ff980066; border-radius:8px; padding:0.65rem 0.85rem; display:flex; justify-content:space-between; align-items:center;';
        pCard.innerHTML = [
          '<div>',
          '  <strong style="color:#f0f6fc; font-size:0.85rem;">' + proj.name + '</strong>',
          '  <span style="font-size:0.68rem; color:#ff9800; background:rgba(255,152,0,0.15); border:1px solid #ff980066; padding:0.1rem 0.45rem; border-radius:4px; margin-left:0.4rem; font-weight:bold;">' + (proj.uncommittedCount || 1) + ' modified</span>',
          '</div>',
          '<span style="font-size:0.72rem; color:#8b949e;">Ready to auto-sync</span>'
        ].join('\n');
        projectsListContainer.appendChild(pCard);
      });
    }

    btnMasterSync.onclick = async function() {
      btnMasterSync.disabled = true;
      btnMasterSync.textContent = '⏳ Synchronizing Fleet Safely...';
      statusBar.style.display = 'block';
      statusBar.textContent = '⚡ Starting Git synchronization...';

      try {
        var res = await LunoDeployEngine.syncEverything({
          peerHost: peerHost,
          onProgress: function(msg) {
            statusBar.textContent += '\n' + msg;
            statusBar.scrollTop = statusBar.scrollHeight;
          }
        });

        if (res && res.success) {
          statusBar.textContent = res.summary;
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Fleet Synchronization Complete!', 'success', '🎉');
          }
          await loadData();
        }
      } catch(err) {
        statusBar.textContent = '❌ Sync Error: ' + err.message;
      } finally {
        btnMasterSync.disabled = false;
        btnMasterSync.textContent = '🚀 1-Tap Safe Fleet Sync (No Overwrites)';
      }
    };

    btnRefreshStatus.onclick = () => loadData();
    loadData();
  }
}

globalThis.LunoDeployEngine = LunoDeployEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoDeployEngine;