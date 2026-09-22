class LunoSpaDock {
  constructor() {}

  static activeDockView = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_active_dock_view')) || 'workspace';
  static _iframeCache = {};

  static toggleDock(viewKey) {
    var vk = viewKey || 'browser';
    LunoSpaDock.activeDockView = vk;
    LunoSpaDock.mountView(vk);
  }

  static renderHeaderNav(viewKey) {
    if (typeof LunoSpaHeaderNav !== 'undefined') {
      return LunoSpaHeaderNav.render(viewKey);
    }
    var el = document.createElement('header');
    el.textContent = 'Luno Home';
    return el;
  }

  static async generateVirtualPreviewHtml(projectName) {
      var pName = projectName || 'Luno';
      var codeData = null;

      try {
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchAllCode) {
          codeData = await LunoApiClient.fetchAllCode(pName, { includeProjectLibrary: true });
        }
      } catch (e) {
        console.warn('[LunoSpaDock] Virtual preview assembly error:', e);
      }

      if (!codeData || !codeData.filesMap || Object.keys(codeData.filesMap).length === 0) {
        return [
          '<!DOCTYPE html>',
          '<html>',
          '<head>',
          '  <meta charset="UTF-8">',
          '  <title>' + pName + ' Preview</title>',
          '  <style>html, body { background: #0d1117; color: #c9d1d9; font-family: monospace; padding: 1.5rem; margin: 0; min-height: 100vh; }</style>',
          '</head>',
          '<body>',
          '  <div id="app-container">',
          '    <div style="padding: 1.5rem; background: #161b22; border: 2px solid #00f2fe; border-radius: 8px; text-align: center; max-width: 540px; margin: 2rem auto; box-shadow: 0 4px 16px rgba(0,242,254,0.25); font-family: monospace;">',
          '      <h3 style="color: #00f2fe; margin-top: 0;">📱 App Preview: [' + pName + ']</h3>',
          '      <p style="font-size: 0.82rem; color: #8b949e; line-height: 1.4;">Project files are initializing from storage. Tap Reload in toolbar once saved.</p>',
          '    </div>',
          '  </div>',
          '</body>',
          '</html>'
        ].join('\n');
      }

      var filesMap = codeData.filesMap;
      var lunoMeta = {};

      for (var fKey in filesMap) {
        if (fKey.endsWith('luno.json')) {
          try { lunoMeta = JSON.parse(filesMap[fKey]); } catch (e) {}
          break;
        }
      }

      var stylesHtml = '';
      var scriptsHtml = '';

      for (var relPath in filesMap) {
        if (!Object.prototype.hasOwnProperty.call(filesMap, relPath)) continue;
        var fileContent = filesMap[relPath] || '';

        if (relPath.endsWith('.css')) {
          stylesHtml += '<style data-file="' + relPath + '">\n' + fileContent.split('</style>').join('<\\/style>') + '\n</style>\n';
        } else if (relPath.endsWith('.js') || relPath.endsWith('.mjs')) {
          if (!relPath.endsWith('LunoLoader.js')) {
            scriptsHtml += '<script data-file="' + relPath + '">\n' + fileContent.split('</' + 'script>').join('<\\/' + 'script>') + '\n</' + 'script>\n';
          }
        }
      }

      var entrypoint = lunoMeta.entrypoint || {};
      var entryClass = entrypoint.class || lunoMeta.mainClass || 'App';
      var entryMethod = entrypoint.method || 'run';

      var bootScript = [
        '<script>',
        'document.addEventListener("DOMContentLoaded", async function() {',
        '  var container = document.getElementById("app-container") || document.body;',
        '  try {',
        '    var TargetClass = globalThis["' + entryClass + '"];',
        '    if (!TargetClass) {',
        '      throw new Error("Entrypoint class [' + entryClass + '] not found in preview bundle.");',
        '    }',
        '    var inst = new TargetClass();',
        '    if (typeof inst["' + entryMethod + '"] === "function") {',
        '      await inst["' + entryMethod + '"]({ container: container, meta: ' + JSON.stringify(lunoMeta) + ' });',
        '    } else if (typeof TargetClass["' + entryMethod + '"] === "function") {',
        '      await TargetClass["' + entryMethod + '"]({ container: container, meta: ' + JSON.stringify(lunoMeta) + ' });',
        '    }',
        '  } catch (err) {',
        '    container.innerHTML = "<div style=\\"padding:1rem; background:#2c080a; color:#ff7b72; border:2px solid #f85149; border-radius:8px; font-family:monospace; margin:1rem;\\"><h3>⚠️ Preview Launch Exception</h3><pre>" + err.message + "\\n" + (err.stack || "") + "</pre></div>";',
        '  }',
        '});',
        '</' + 'script>'
      ].join('\n');

      return [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <title>' + pName + ' Live Preview</title>',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        stylesHtml,
        '</head>',
        '<body>',
        '  <div id="app-container"></div>',
        scriptsHtml,
        bootScript,
        '</body>',
        '</html>'
      ].join('\n');
  }
  static async reloadActivePreviewIframe(projectName) {
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : '');
    if (!pName) return;

    if (!LunoSpaDock._iframeCache) {
      LunoSpaDock._iframeCache = {};
    }

    var isStatic = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.getActiveMode() !== 'server') || (typeof LunoLoader !== 'undefined' && LunoLoader.isStaticHosting());
    var iframeUrl = '/app-preview?project=' + encodeURIComponent(pName) + '&v=' + Date.now();
    var persistentAppRoot = document.getElementById('luno-persistent-app-root');

    if (persistentAppRoot) {
      if (LunoSpaDock._iframeCache[pName]) {
        var oldHolder = LunoSpaDock._iframeCache[pName];
        if (oldHolder && oldHolder.parentNode) {
          oldHolder.parentNode.removeChild(oldHolder);
        }
        delete LunoSpaDock._iframeCache[pName];
      }

      var newHolder = document.createElement('div');
      newHolder.id = 'iframe-holder-' + pName;
      newHolder.style.cssText = 'width:100%; height:100%; display:block;';

      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%; height:100%; border:1px solid #30363d; border-radius:8px; background:#0d1117;';
      iframe.setAttribute('allow', 'fullscreen; autoplay; midi');

      if (!isStatic) {
        iframe.src = iframeUrl;
      } else {
        var srcdocContent = await LunoSpaDock.generateVirtualPreviewHtml(pName);
        iframe.srcdoc = srcdocContent;
      }

      newHolder.appendChild(iframe);
      persistentAppRoot.appendChild(newHolder);
      LunoSpaDock._iframeCache[pName] = newHolder;

      Object.entries(LunoSpaDock._iframeCache).forEach(function(entry) {
        if (entry[0] === pName) {
          entry[1].style.display = 'block';
        } else {
          entry[1].style.display = 'none';
        }
      });
    }

    var allIframes = document.querySelectorAll('iframe');
    for (var i = 0; i < allIframes.length; i++) {
      var ifr = allIframes[i];
      try {
        if (ifr.src && (ifr.src.includes('project=' + encodeURIComponent(pName)) || ifr.src.includes('/' + pName + '/'))) {
          if (!isStatic) {
            ifr.src = iframeUrl;
          } else {
            ifr.srcdoc = await LunoSpaDock.generateVirtualPreviewHtml(pName);
          }
        }
      } catch (e) {}
    }
  }

  static async mountView(viewKey) {
      let effectiveKey = viewKey || 'workspace';
      if (effectiveKey === 'deploy') effectiveKey = 'projects';

      LunoSpaDock.activeDockView = effectiveKey;
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem('luno_active_dock_view', effectiveKey); } catch (e) {}
      }
      var mainApp = document.getElementById('app-root') || document.body;
      if (!mainApp) return;

      if (!LunoSpaDock._iframeCache) {
        LunoSpaDock._iframeCache = {};
      }

      var persistentAppRoot = document.getElementById('luno-persistent-app-root');
      if (!persistentAppRoot) {
        persistentAppRoot = document.createElement('div');
        persistentAppRoot.id = 'luno-persistent-app-root';
        persistentAppRoot.style.cssText = 'display:none; position:fixed; z-index:8000; box-sizing:border-box;';
        document.body.appendChild(persistentAppRoot);
      }

      var isAppView = effectiveKey.startsWith('app_') || effectiveKey === 'app';

      if (!isAppView) {
        persistentAppRoot.style.display = 'none';
        Object.values(LunoSpaDock._iframeCache).forEach(function(holder) {
          if (holder && holder.style) holder.style.display = 'none';
        });

        if (effectiveKey === 'workspace') {
          if (typeof ClientAppUI !== 'undefined') {
            ClientAppUI.renderOutboxFirstLayout(mainApp);
          }
          return;
        }
      }

      mainApp.innerHTML = '';
      mainApp.style.width = '100%';
      mainApp.style.maxWidth = '100%';

      var container = document.createElement('div');
      container.id = 'luno-spa-view-container';
      var padStyle = isAppView ? '0.35rem 0.65rem 0 0.65rem' : '0.6rem 1.25rem';
      container.style.cssText = 'font-family:monospace; padding:' + padStyle + '; width:100%; max-width:100%; margin:0; min-height:100vh; background:#0d1117; color:#c9d1d9; box-sizing:border-box;';

      var targetProj = '';
      if (isAppView) {
        if (effectiveKey.startsWith('app_')) {
          targetProj = effectiveKey.replace(/^app_/, '');
        } else {
          targetProj = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
        }

        var invalidNames = ['web', 'storage', 'emulated', 'LunoWeb', '0', 'Library'];
        if (!targetProj || invalidNames.includes(targetProj)) {
          targetProj = 'Luno';
        }

        if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
          ClientApp.setTargetProject(targetProj, { openTab: true });
        }
      }

      var navBar = LunoSpaDock.renderHeaderNav(effectiveKey);
      var contentArea = document.createElement('div');
      contentArea.id = 'luno-spa-content-area';
      contentArea.style.cssText = 'width:100%; min-height:82vh; position:relative;';

      container.appendChild(navBar);
      container.appendChild(contentArea);
      mainApp.appendChild(container);

      if (isAppView && targetProj) {
        var isStatic = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.getActiveMode() !== 'server') || (typeof LunoLoader !== 'undefined' && LunoLoader.isStaticHosting());
        var toolbar = document.createElement('div');
        toolbar.id = 'luno-app-preview-toolbar';
        toolbar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#161b22; border:1px solid #30363d; border-radius:8px; padding:0.4rem 0.75rem; margin-bottom:0.4rem; flex-wrap:wrap; gap:0.4rem; font-family:monospace;';

        var leftInfo = document.createElement('div');
        leftInfo.style.cssText = 'display:flex; align-items:center; gap:0.4rem; font-size:0.8rem;';
        leftInfo.innerHTML = '<span style="color:#00f2fe; font-weight:bold;">📱 App Preview:</span> <span style="color:#3fb950; font-weight:bold;">' + targetProj + '</span>';

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;';

        var btnReload = document.createElement('button');
        btnReload.style.cssText = 'padding:0.3rem 0.65rem; background:#21262d; color:#00f2fe; border:1px solid #00f2fe; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
        btnReload.innerHTML = '🔄 Reload';
        btnReload.title = 'Reload app preview iframe';
        btnReload.onclick = function() {
          LunoSpaDock.reloadActivePreviewIframe(targetProj);
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Refreshed [' + targetProj + '] preview!', 'info', '🔄');
          }
        };

        // Pop out live in-memory preview in standalone tab
        var btnPopOut = document.createElement('button');
        btnPopOut.style.cssText = 'padding:0.3rem 0.65rem; background:#271052; color:#d2a8ff; border:1px solid #8257e5; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
        btnPopOut.innerHTML = '↗ Pop Out Tab';
        btnPopOut.title = 'Open live in-memory preview in full standalone window';
        btnPopOut.onclick = async function() {
          try {
            var htmlContent = await LunoSpaDock.generateVirtualPreviewHtml(targetProj);
            var blob = new Blob([htmlContent], { type: 'text/html' });
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          } catch(e) {
            alert('Could not pop out preview: ' + e.message);
          }
        };

        var btnNewTab = document.createElement('button');
        btnNewTab.style.cssText = 'padding:0.3rem 0.65rem; background:#238636; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace; box-shadow:0 2px 8px rgba(35,134,54,0.3);';
        btnNewTab.innerHTML = isStatic ? '🌐 Live Pages Site' : '🖥️ Standalone URL';
        btnNewTab.title = isStatic ? 'Open live deployed GitHub Pages repository site' : 'Open app via local server port';
        btnNewTab.onclick = function() {
          if (!isStatic) {
            window.open('/' + encodeURIComponent(targetProj) + '/', '_blank');
          } else {
            var remoteRepo = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getRemoteRepoName(targetProj) : targetProj;
            var account = (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.getGithubAccount) ? LunoDeployEngine.getGithubAccount() : 'karmatics';
            window.open('https://' + account.toLowerCase() + '.github.io/' + remoteRepo + '/', '_blank');
          }
        };

        btnRow.appendChild(btnReload);
        btnRow.appendChild(btnPopOut);
        btnRow.appendChild(btnNewTab);
        toolbar.appendChild(leftInfo);
        toolbar.appendChild(btnRow);
        contentArea.appendChild(toolbar);

        persistentAppRoot.style.display = 'block';

        if (!LunoSpaDock._hasResizeListener) {
          LunoSpaDock._hasResizeListener = true;
          window.addEventListener('resize', function() {
            LunoSpaDock.syncAppPreviewLayout();
          });
        }

        LunoSpaDock.syncAppPreviewLayout();
        setTimeout(function() { LunoSpaDock.syncAppPreviewLayout(); }, 60);

        if (!LunoSpaDock._iframeCache[targetProj]) {
          await LunoSpaDock.reloadActivePreviewIframe(targetProj);
        } else {
          Object.entries(LunoSpaDock._iframeCache).forEach(function(entry) {
            if (entry[0] === targetProj) {
              entry[1].style.display = 'block';
            } else {
              entry[1].style.display = 'none';
            }
          });
        }
      } else if (effectiveKey === 'projects' && typeof LunoProjectTemplates !== 'undefined' && typeof LunoProjectTemplates.mountFullPageView === 'function') {
        LunoProjectTemplates.mountFullPageView(contentArea);
      } else if (effectiveKey === 'checkpoint') {
        if (typeof LunoCheckpointView !== 'undefined' && typeof LunoCheckpointView.mountUI === 'function') {
          LunoCheckpointView.mountUI(contentArea);
        } else {
          if (typeof localStorage !== 'undefined') localStorage.setItem('luno_active_dock_view', 'workspace');
          if (typeof ClientAppUI !== 'undefined') ClientAppUI.renderOutboxFirstLayout(mainApp);
        }
      } else if (effectiveKey === 'browser' && typeof DiskBrowser !== 'undefined') {
        DiskBrowser.mountUI(contentArea);
      } else if (effectiveKey === 'docs' && typeof LunoDocs !== 'undefined') {
        LunoDocs.mountUI(contentArea);
      } else if (effectiveKey === 'test' && typeof LunoTestRunner !== 'undefined') {
        LunoTestRunner.mountUI(contentArea);
      }
  }
  static syncAppPreviewLayout() {
      var contentArea = document.getElementById('luno-spa-content-area');
      var persistentAppRoot = document.getElementById('luno-persistent-app-root');
      var toolbar = document.getElementById('luno-app-preview-toolbar');
      if (!contentArea || !persistentAppRoot || persistentAppRoot.style.display === 'none') return;

      var rect = contentArea.getBoundingClientRect();
      var toolbarHeight = toolbar ? toolbar.offsetHeight + 8 : 44;
      var topPos = (rect.top > 0 ? rect.top : 52) + toolbarHeight;
      var leftPos = Math.max(0, rect.left);
      var widthPos = Math.max(200, rect.width || (window.innerWidth - leftPos - 12));
      var heightPos = Math.max(150, window.innerHeight - topPos - 10);

      persistentAppRoot.style.top = topPos + 'px';
      persistentAppRoot.style.left = leftPos + 'px';
      persistentAppRoot.style.width = widthPos + 'px';
      persistentAppRoot.style.height = heightPos + 'px';
    }
}

globalThis.LunoSpaDock = LunoSpaDock;
if (typeof module !== "undefined" && module.exports) module.exports = LunoSpaDock;