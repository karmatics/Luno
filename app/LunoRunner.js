class LunoRunner {
  constructor() {}

  static activeScripts = new Map();

  static async runScript(scriptPath) {
      try {
        var fileData = null;
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
          fileData = await LunoApiClient.fetchFsRead(scriptPath);
        } else {
          var res = await fetch('/api/fs/read?path=' + encodeURIComponent(scriptPath));
          fileData = await res.json();
        }

        var code = (fileData && fileData.content) || '';
        if (!code.trim()) {
          console.warn('[LunoRunner] File empty or not found:', scriptPath);
          return { success: false, error: 'Empty script content' };
        }

        if (LunoRunner.activeScripts.has(scriptPath)) {
          var oldInfo = LunoRunner.activeScripts.get(scriptPath);
          if (oldInfo.scriptEl && oldInfo.scriptEl.parentNode) {
            oldInfo.scriptEl.parentNode.removeChild(oldInfo.scriptEl);
          }
          if (oldInfo.blobUrl) {
            URL.revokeObjectURL(oldInfo.blobUrl);
          }
        }

        var blob = new Blob([code], { type: 'application/javascript' });
        var blobUrl = URL.createObjectURL(blob);
        var scriptEl = document.createElement('script');
        scriptEl.src = blobUrl;
        scriptEl.dataset.lunoScriptPath = scriptPath;

        document.head.appendChild(scriptEl);
        LunoRunner.activeScripts.set(scriptPath, { scriptEl, blobUrl, path: scriptPath });

        return { success: true, scriptPath, blobUrl };
      } catch (err) {
        console.error('[LunoRunner Error] Failed to execute script:', scriptPath, err);
        return { success: false, error: err.message };
      }
  }
  static async preloadScriptList(scriptList = []) {
    for (const item of scriptList) {
      await LunoRunner.runScript(item);
    }
  }
}

globalThis.LunoRunner = LunoRunner;
if (typeof module !== "undefined" && module.exports) module.exports = LunoRunner;