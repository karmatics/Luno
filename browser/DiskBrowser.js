class DiskBrowser {
  constructor() {}

  static currentPath = "";
  static parentPath = "";
  static browserMode = "project";
  static viewMode = "flat";
  static sortBy = "size";
  static sortDirection = "desc";
  static searchQuery = "";
  static flatFilesList = [];
  static directoriesList = [];
  static selectedFiles = new Set();
  static fileContentCache = {};
  static activeManifest = { main: [], local: [], library: [] };
  static projectsList = [];

  static showToast(message, type, icon) {
    if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
      ClientApp.showToast(message, type || 'info', icon || '✨');
    }
  }

  static formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  static formatTailPath(fullPath, maxChars) {
    if (!fullPath || typeof fullPath !== 'string') return '';
    var limit = maxChars || 28;
    var norm = fullPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (norm.startsWith('Luno Workspace/')) norm = norm.slice(15).trim();

    if (norm.startsWith('Luno/')) norm = norm.slice(5);

    var parts = norm.split('/');
    if (parts.length <= 1) {
      return '';
    }

    var dirPart = parts.slice(0, -1).join('/');
    if (dirPart.length <= limit) {
      return dirPart + '/';
    }

    var tail = dirPart.slice(-limit + 4);
    var slashIdx = tail.indexOf('/');
    if (slashIdx !== -1 && slashIdx < 12) {
      tail = tail.slice(slashIdx);
    }
    return '...' + tail + '/';
  }

  static sortItems(itemsList, sortBy, sortDirection) {
      var mode = sortBy || DiskBrowser.sortBy || 'size';
      var dir = sortDirection || DiskBrowser.sortDirection || 'desc';
      var mult = dir === 'asc' ? 1 : -1;

      return itemsList.slice().sort(function(a, b) {
        if (mode === 'size') {
          var sizeA = a.size || 0;
          var sizeB = b.size || 0;
          if (sizeA !== sizeB) return (sizeA - sizeB) * mult;
          return a.name.localeCompare(b.name);
        } else if (mode === 'ext') {
          var extA = (a.name.split('.').pop() || '').toLowerCase();
          var extB = (b.name.split('.').pop() || '').toLowerCase();
          if (extA !== extB) return extA.localeCompare(extB) * mult;
          return a.name.localeCompare(b.name);
        } else if (mode === 'date' || mode === 'mtime') {
          var timeA = a.mtimeMs || 0;
          var timeB = b.mtimeMs || 0;
          if (timeA !== timeB) return (timeA - timeB) * mult;
          return a.name.localeCompare(b.name);
        } else {
          return a.name.localeCompare(b.name) * mult;
        }
      });
    }
  static makeElement(...args) {
    if (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement) {
      return LunoUIComponents.makeElement(...args);
    }
    var el = document.createElement(args[0] || 'div');
    return el;
  }

  static renderHeader(activeProjName) {
    var m = DiskBrowser.makeElement;
    var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';

    var validProjects = DiskBrowser.projectsList.filter(function(p) {
      return !p.isLibrary && p.name.toLowerCase() !== 'library';
    });

    var projectOptions = validProjects.map(function(p) {
      var isCurrent = (p.name === currentTarget);
      var displayLabel = p.name === 'Luno' ? 'Luno (Core)' : p.name;
      return m('option', {
        value: p.name,
        selected: isCurrent
      }, '📁 ' + displayLabel + ' (' + (p.fileCount || 0) + ' files)');
    });

    var projectSelect = m('select', {
      style: {
        background: '#0d1117', color: '#00f2fe', border: '1px solid #00f2fe',
        padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem',
        fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
      },
      onchange: async function(e) {
        var targetName = e.target.value;
        if (targetName && typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
          ClientApp.setTargetProject(targetName);
          DiskBrowser.currentPath = '';
          DiskBrowser.selectedFiles.clear();
          DiskBrowser.fileContentCache = {};
          var mainRoot = document.getElementById('luno-spa-content-area') || document.body;
          await DiskBrowser.mountUI(mainRoot);
        }
      }
    }, projectOptions);

    return m('header', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #30363d', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }
    },
      m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' } },
        m('h1', { style: { color: '#00f2fe', fontSize: '1.1rem', margin: '0', display: 'flex', alignItems: 'center', gap: '0.3rem' } }, '🛠️ Files & Disk Navigation'),
        m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.3rem' } },
          m('span', { style: { fontSize: '0.72rem', color: '#8b949e', fontWeight: 'bold' } }, 'Target Project:'),
          projectSelect
        )
      ),
      m('div', { style: { display: 'flex', gap: '0.3rem', flexWrap: 'wrap' } },
        m('button', {
          style: { padding: '0.35rem 0.65rem', background: '#238636', color: '#fff', border: '1px solid #3fb950', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' },
          onclick: function() { DiskBrowser.loadDirectory(); }
        }, 'Refresh')
      )
    );
  }

  static async mountUI(container) {
    if (!container) return;
    container.innerHTML = '';

    var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';

    await Promise.all([
      DiskBrowser.loadActiveManifest(),
      DiskBrowser.loadProjectsList()
    ]);

    try {
      var m = DiskBrowser.makeElement;
      var isProjectMode = (DiskBrowser.browserMode === 'project');

      var btnModeProject = m('button', {
        style: { padding: '0.35rem 0.75rem', background: isProjectMode ? '#238636' : '#161b22', color: isProjectMode ? '#fff' : '#c9d1d9', border: '1px solid ' + (isProjectMode ? '#3fb950' : '#30363d'), borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' },
        onclick: function() {
          DiskBrowser.browserMode = 'project';
          DiskBrowser.currentPath = '';
          DiskBrowser.selectedFiles.clear();
          DiskBrowser.mountUI(container);
        }
      }, '📁 Project Files');

      var btnModeLibrary = m('button', {
        style: { padding: '0.35rem 0.75rem', background: !isProjectMode ? '#8257e5' : '#161b22', color: !isProjectMode ? '#fff' : '#c9d1d9', border: '1px solid ' + (!isProjectMode ? '#d2a8ff' : '#30363d'), borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' },
        onclick: function() {
          DiskBrowser.browserMode = 'library';
          DiskBrowser.currentPath = '';
          DiskBrowser.selectedFiles.clear();
          DiskBrowser.mountUI(container);
        }
      }, '📚 Shared Library');

      var btnNewFile = m('button', {
        style: { padding: '0.35rem 0.75rem', background: '#003847', color: '#00f2fe', border: '1px solid #00f2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' },
        onclick: function() {
          DiskBrowser.createNewFileModal();
        }
      }, '➕ New File');

      var searchInput = m('input', {
        id: 'search-input',
        value: DiskBrowser.searchQuery,
        placeholder: isProjectMode ? '🔍 Search files in [' + currentTarget + ']...' : '🔍 Search shared Library files...',
        style: { flex: '1 1 140px', background: '#0d1117', border: '1px solid #30363d', color: '#00f2fe', padding: '0.4rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.75rem', outline: 'none' },
        oninput: function(e) {
          DiskBrowser.searchQuery = e.target.value.toLowerCase().trim();
          var listContainer = document.getElementById('item-list-container');
          if (listContainer) DiskBrowser.renderFlatLayout(listContainer, isProjectMode ? currentTarget : 'Library');
        }
      });

      var navigationBar = m('div', {
        style: { display: 'flex', gap: '0.35rem', marginBottom: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }
      },
        btnModeProject,
        btnModeLibrary,
        btnNewFile,
        searchInput
      );

      var dirContainer = m('div', { id: 'item-list-container', style: { width: '100%', boxSizing: 'border-box' } });

      container.appendChild(DiskBrowser.renderHeader(currentTarget));
      container.appendChild(navigationBar);
      container.appendChild(dirContainer);

      await DiskBrowser.loadDirectory();
    } catch (err) {
      container.innerHTML = '<div style="padding:0.75rem; color:#f85149; background:#3c1418; font-family:monospace;">Render error: ' + err.message + '</div>';
    }
  }

  static async loadDirectory() {
      var container = document.getElementById('item-list-container');
      if (!container) return;

      var isLibMode = (DiskBrowser.browserMode === 'library');
      var queryTarget = isLibMode ? 'Library' : ((typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '');

      try {
        container.innerHTML = '<div style="padding:1rem; text-align:center; color:#00f2fe; font-family:monospace;">⚡ Indexing project files for flat view...</div>';

        DiskBrowser.modifiedFilesMap = new Map();

        // 1. Check local Git status if server is active
        if (typeof LunoApiClient !== 'undefined' && !LunoApiClient.isStaticMode()) {
          try {
            var gitRes = await LunoApiClient.safeJsonFetch('/api/git/file-diff?path=all&project=' + encodeURIComponent(queryTarget));
            if (gitRes && Array.isArray(gitRes.modifiedFiles)) {
              gitRes.modifiedFiles.forEach(function(m) {
                var cleanRel = m.path.replace(/\\/g, '/');
                DiskBrowser.modifiedFilesMap.set(cleanRel, m);
                DiskBrowser.modifiedFilesMap.set(cleanRel.split('/').pop(), m);
              });
            }
          } catch (gitErr) {}
        }

        // 2. Query IndexedDB history snapshots
        if (typeof LunoHistoryManager !== 'undefined' && typeof LunoHistoryManager.getAllRecords === 'function') {
          try {
            DiskBrowser.cachedHistoryRecords = await LunoHistoryManager.getAllRecords(queryTarget);
            DiskBrowser.cachedHistoryRecords.forEach(function(r) {
              if (r && r.filePath) {
                var cleanRel = r.filePath.replace(/\\/g, '/');
                if (!DiskBrowser.modifiedFilesMap.has(cleanRel)) {
                  DiskBrowser.modifiedFilesMap.set(cleanRel, { path: cleanRel, isHistory: true });
                  DiskBrowser.modifiedFilesMap.set(cleanRel.split('/').pop(), { path: cleanRel, isHistory: true });
                }
              }
            });
          } catch (e) {
            DiskBrowser.cachedHistoryRecords = [];
          }
        }

        var data = await LunoApiClient.fetchFsListRecursive('', queryTarget);
        var rawItems = (data && data.items) || [];

        var files = [];
        var dirsMap = new Map();

        for (var i = 0; i < rawItems.length; i++) {
          var it = rawItems[i];
          var rel = it.relativePath || it.name;
          var norm = rel.replace(/\\/g, '/').replace(/^\/+/, '');
          if (norm.startsWith('Luno Workspace/')) norm = norm.slice(15).trim();

          if (queryTarget && norm.startsWith(queryTarget + '/')) {
            norm = norm.slice(queryTarget.length + 1);
          }

          if (!isLibMode && (norm.toLowerCase().startsWith('library/') || norm.toLowerCase().startsWith('library\\'))) {
            continue;
          }

          if (it.isDirectory) {
            dirsMap.set(norm, { name: it.name, relativePath: norm, size: it.size || 0 });
          } else {
            var parts = norm.split('/');
            var fileName = parts.pop();
            var dirPath = parts.join('/');

            files.push({
              name: fileName,
              relativePath: norm,
              dirPath: dirPath,
              size: it.size || 0,
              mtimeMs: it.mtimeMs || 0
            });

            if (dirPath && !dirsMap.has(dirPath)) {
              dirsMap.set(dirPath, { name: parts[parts.length - 1], relativePath: dirPath, size: 0 });
            }
          }
        }

        DiskBrowser.flatFilesList = files;
        DiskBrowser.directoriesList = Array.from(dirsMap.values()).sort(function(a, b) {
          return a.relativePath.localeCompare(b.relativePath);
        });

        DiskBrowser.renderFlatLayout(container, queryTarget);
      } catch (err) {
        container.innerHTML = '<div style="padding:0.75rem; color:#ff7b72; background:#3c1418; border-radius:6px; font-family:monospace;">❌ Load Error: ' + err.message + '</div>';
        DiskBrowser.showToast('Load error: ' + err.message, 'error', '❌');
      }
    }
  static setupFloatingEditorDrag(card, titleBar, savedGeo) {
    var isDragging = false;
    var startX = 0, startY = 0, origLeft = 0, origTop = 0;

    var startDrag = function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.classList.contains('luno-editor-resize-handle')) return;
      isDragging = true;
      titleBar.style.cursor = 'grabbing';
      var evt = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
      startX = evt.clientX;
      startY = evt.clientY;
      origLeft = card.offsetLeft;
      origTop = card.offsetTop;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };

    var doDrag = function(e) {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      var evt = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
      var dx = evt.clientX - startX;
      var dy = evt.clientY - startY;

      var minLeft = 8;
      var maxLeft = window.innerWidth - 60;
      var minTop = 8;
      var maxTop = window.innerHeight - 50;

      var newLeft = Math.max(minLeft, Math.min(maxLeft, origLeft + dx));
      var newTop = Math.max(minTop, Math.min(maxTop, origTop + dy));
      card.style.left = newLeft + 'px';
      card.style.top = newTop + 'px';
    };

    var stopDrag = function() {
      if (!isDragging) return;
      isDragging = false;
      titleBar.style.cursor = 'grab';
      var geo = {};
      try { geo = JSON.parse(localStorage.getItem('luno_file_editor_geo') || '{}'); } catch(e){}
      geo.top = card.offsetTop;
      geo.left = card.offsetLeft;
      geo.width = card.offsetWidth;
      geo.height = card.offsetHeight;
      try { localStorage.setItem('luno_file_editor_geo', JSON.stringify(geo)); } catch(e){}
    };

    titleBar.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);

    titleBar.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', doDrag);
    window.addEventListener('touchend', stopDrag);
  }

  static createNewFileModal() {
    var targetProj = (DiskBrowser.browserMode === 'library') ? 'Library' : ((typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '');
    var defaultPrefix = (DiskBrowser.browserMode === 'library') ? '' : 'src/';
    var rawPath = prompt('Enter new file relative path (e.g. ' + defaultPrefix + 'MyNewComponent.js):', defaultPrefix + 'NewFile.js');
    if (!rawPath || !rawPath.trim()) return;

    var cleanPath = rawPath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.startsWith('Luno Workspace/')) cleanPath = cleanPath.slice(15).trim();
    var fileName = cleanPath.split('/').pop();
    var ext = (fileName.split('.').pop() || '').toLowerCase();

    var initialContent = '// New file: ' + cleanPath + '\n';
    if (ext === 'js' || ext === 'mjs') {
      var clsName = fileName.replace(/\.[^/.]+$/, '');
      clsName = clsName.charAt(0).toUpperCase() + clsName.slice(1);
      initialContent = 'class ' + clsName + ' {\n  constructor() {}\n}\n\nglobalThis.' + clsName + ' = ' + clsName + ';\nif (typeof module !== "undefined" && module.exports) module.exports = ' + clsName + ';\n';
    } else if (ext === 'css') {
      initialContent = '/* Stylesheet: ' + cleanPath + ' */\n';
    } else if (ext === 'html') {
      initialContent = '<div id="' + fileName.replace(/\.[^/.]+$/, '') + '">\n  <!-- HTML Template -->\n</div>\n';
    } else if (ext === 'json') {
      initialContent = '{\n  "name": "' + fileName + '"\n}\n';
    }

    DiskBrowser.openFileEditorModal(cleanPath);
    setTimeout(function() {
      var textarea = document.getElementById('floating-file-editor-textarea');
      if (textarea) {
        textarea.value = initialContent;
        var statusEl = document.getElementById('editor-file-status');
        if (statusEl) {
          statusEl.textContent = '● New file (Unsaved - Click Save to write to storage)';
          statusEl.style.color = '#00f2fe';
        }
      }
    }, 150);
  }

  static async openFileEditorModal(filePath) {
      if (typeof document === 'undefined') return;

      var targetProj = (DiskBrowser.browserMode === 'library') ? 'Library' : ((typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '');
      var existing = document.getElementById('luno-floating-file-editor');
      if (existing) existing.remove();

      var screenW = window.innerWidth || 360;
      var screenH = window.innerHeight || 640;
      var dialogW = Math.min(screenW - 16, 720);
      var dialogH = Math.min(screenH - 30, 530);
      var dialogL = Math.max(8, (screenW - dialogW) / 2);
      var dialogT = Math.max(16, (screenH - dialogH) / 2);

      var card = document.createElement('div');
      card.id = 'luno-floating-file-editor';
      card.style.cssText = [
        'position: fixed;',
        'top: ' + dialogT + 'px;',
        'left: ' + dialogL + 'px;',
        'width: ' + dialogW + 'px;',
        'height: ' + dialogH + 'px;',
        'max-width: calc(100vw - 16px);',
        'max-height: calc(100vh - 24px);',
        'min-width: 280px;',
        'min-height: 220px;',
        'background: var(--bg-card, #161b22);',
        'color: var(--text-primary, #c9d1d9);',
        'border: 2px solid var(--accent-primary, #00f2fe);',
        'border-radius: 12px;',
        'z-index: 9940;',
        'box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 24px var(--glow-color, rgba(0,242,254,0.25));',
        'display: flex;',
        'flex-direction: column;',
        'font-family: monospace;',
        'box-sizing: border-box;',
        'overflow: hidden;',
        'backdrop-filter: blur(12px);'
      ].join('\n');

      var fileName = filePath.split('/').pop();
      var ext = (fileName.split('.').pop() || '').toUpperCase();
      var isLib = (DiskBrowser.browserMode === 'library');

      var titleBar = document.createElement('div');
      titleBar.id = 'floating-file-editor-header';
      titleBar.style.cssText = 'background:linear-gradient(135deg, #003847 0%, #161b22 100%); color:#00f2fe; padding:0.45rem 0.65rem; user-select:none; font-weight:bold; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:grab; border-radius:10px 10px 0 0; flex-shrink:0; border-bottom:1px solid #00f2fe44; gap:0.4rem;';
      titleBar.innerHTML = [
        '<div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">',
        '  <span style="font-size:0.68rem; background:#003847; color:#00f2fe; border:1px solid #00f2fe66; padding:0.1rem 0.35rem; border-radius:4px; font-weight:bold;">' + ext + '</span>',
        '  <span style="color:#00f2fe; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + fileName + '</span>',
        '  <span style="font-size:0.68rem; color:#8b949e;">(' + filePath + ')</span>',
        '</div>',
        '<div style="display:flex; gap:0.3rem; align-items:center; flex-shrink:0;">',
        '  <button id="btn-close-file-editor" style="background:#21262d; border:1px solid #da3633; color:#ff7b72; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem; padding:0.15rem 0.45rem; line-height:1;">✖</button>',
        '</div>'
      ].join('\n');

      var body = document.createElement('div');
      body.id = 'floating-file-editor-body';
      body.style.cssText = 'padding:0.55rem; display:flex; flex-direction:column; gap:0.45rem; flex:1; overflow:hidden; box-sizing:border-box;';

      var metricsBar = document.createElement('div');
      metricsBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#8b949e; flex-shrink:0;';
      metricsBar.innerHTML = '<span id="editor-file-status">⚡ Loading file contents...</span><span id="editor-file-metrics">0 lines | 0 B</span>';

      var textarea = document.createElement('textarea');
      textarea.id = 'floating-file-editor-textarea';
      textarea.style.cssText = 'width:100%; flex:1; background:#070a13; color:#7ee787; border:1px solid #30363d; border-radius:8px; padding:0.55rem; font-family:monospace; font-size:0.78rem; line-height:1.45; outline:none; box-sizing:border-box; resize:none; min-height:80px;';

      var initialLoadedContent = '';

      var updateMetrics = function() {
        var val = textarea.value;
        var lines = val ? val.split('\n').length : 0;
        var bytes = val ? val.length : 0;
        var metricsEl = document.getElementById('editor-file-metrics');
        if (metricsEl) metricsEl.textContent = lines + ' line(s) | ' + DiskBrowser.formatBytes(bytes);
      };

      textarea.oninput = function() {
        updateMetrics();
        var statusEl = document.getElementById('editor-file-status');
        if (statusEl) {
          var isModified = (textarea.value !== initialLoadedContent);
          statusEl.textContent = isModified ? '● Unsaved edits (Ctrl+S to save)' : '✓ Unchanged';
          statusEl.style.color = isModified ? '#ff9800' : '#7ee787';
        }
      };

      var doSave = async function() {
        var btnSave = document.getElementById('btn-editor-save-disk');
        if (btnSave) { btnSave.disabled = true; btnSave.textContent = 'Saving...'; }
        try {
          var content = textarea.value;
          var filePrefix = isLib ? ('Library/' + filePath.replace(/^Library\//i, '')) : (targetProj ? (targetProj + '/' + filePath.replace(new RegExp('^' + targetProj + '/'), '')) : filePath);
          var savePayload = {
            files: [{ filePath: filePrefix, content: content, action: 'direct' }],
            serverScript: '',
            project: targetProj
          };

          var data = await LunoApiClient.savePayload(savePayload, targetProj);
          if (data && data.success) {
            initialLoadedContent = content;
            var statusEl = document.getElementById('editor-file-status');
            if (statusEl) { statusEl.textContent = '✓ Saved to storage'; statusEl.style.color = '#3fb950'; }
            DiskBrowser.showToast('Saved ' + fileName + ' successfully!', 'success', '💾');
          } else {
            alert('Save failed: ' + ((data && data.error) || 'Storage error'));
          }
        } catch(err) {
          alert('Save error: ' + err.message);
        } finally {
          if (btnSave) { btnSave.disabled = false; btnSave.textContent = '💾 Save (Ctrl+S)'; }
        }
      };

      textarea.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave(); }
      });

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex; gap:0.35rem; flex-shrink:0; flex-wrap:wrap;';

      var btnSave = document.createElement('button');
      btnSave.id = 'btn-editor-save-disk';
      btnSave.style.cssText = 'flex:2; min-width:110px; padding:0.45rem; background:#238636; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.75rem; font-family:monospace;';
      btnSave.textContent = '💾 Save (Ctrl+S)';
      btnSave.onclick = doSave;

      var btnDiff = document.createElement('button');
      btnDiff.style.cssText = 'flex:1.2; min-width:85px; padding:0.45rem; background:#003847; color:#00f2fe; border:1px solid #00f2fe; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.72rem; font-family:monospace;';
      btnDiff.textContent = '🔍 View Diff';
      btnDiff.onclick = async function() {
        btnDiff.textContent = '...';
        var diffRes = await LunoApiClient.fetchFileDiff(filePath, targetProj);
        btnDiff.textContent = '🔍 View Diff';

        var baseContent = (diffRes && diffRes.isModified && diffRes.oldContent !== undefined)
          ? diffRes.oldContent
          : initialLoadedContent;

        if (typeof DiffApprovalModal !== 'undefined' && typeof CodeDiffer !== 'undefined') {
          var diffAnalysis = CodeDiffer.analyzeDiff(baseContent, textarea.value, filePath);
          DiffApprovalModal.open({
            fileDiffs: [{
              filePath: filePath,
              target: filePath,
              mode: (diffRes && diffRes.hasGit) ? 'git-baseline' : 'snapshot-baseline',
              oldContent: baseContent,
              newContent: textarea.value,
              linesAdded: diffAnalysis.linesAdded,
              linesRemoved: diffAnalysis.linesRemoved,
              byteDelta: diffAnalysis.byteDelta
            }],
            onConfirm: function() {}
          });
        }
      };

      var btnHistory = document.createElement('button');
      btnHistory.style.cssText = 'padding:0.45rem 0.65rem; background:#271052; color:#d2a8ff; border:1px solid #8257e5; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.72rem; font-family:monospace;';
      btnHistory.textContent = '⏳ History';
      btnHistory.title = 'Inspect Git commits and revision history for this file';
      btnHistory.onclick = function() {
        if (typeof LunoTimelineDialog !== 'undefined') {
          LunoTimelineDialog.open({ project: targetProj, filePath: filePath });
        }
      };

      var btnOutbox = document.createElement('button');
      btnOutbox.style.cssText = 'flex:1; min-width:75px; padding:0.45rem; background:#271052; color:#d2a8ff; border:1px solid #8257e5; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.72rem; font-family:monospace;';
      btnOutbox.textContent = '📤 Outbox';
      btnOutbox.onclick = function() {
        var content = textarea.value;
        var filePrefix = isLib ? ('Library/' + filePath.replace(/^Library\//i, '')) : (targetProj ? (targetProj + '/' + filePath.replace(new RegExp('^' + targetProj + '/'), '')) : filePath);
        var closeScript = '<' + '/script>';
        var payload = '<script data-file="' + filePrefix + '">\n' + content + '\n' + closeScript;
        if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
          OutboxQueue.addBundle((isLib ? 'Library: ' : 'File: ') + fileName, payload);
          DiskBrowser.showToast('Queued ' + fileName + ' to Outbox!', 'success', '📤');
        }
      };

      var btnClose = document.createElement('button');
      btnClose.style.cssText = 'padding:0.45rem 0.65rem; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; cursor:pointer; font-size:0.72rem; font-family:monospace;';
      btnClose.textContent = 'Close';
      btnClose.onclick = function() { card.remove(); };

      btnRow.appendChild(btnSave);
      btnRow.appendChild(btnDiff);
      btnRow.appendChild(btnHistory);
      btnRow.appendChild(btnOutbox);
      btnRow.appendChild(btnClose);

      body.appendChild(metricsBar);
      body.appendChild(textarea);
      body.appendChild(btnRow);
      card.appendChild(titleBar);
      card.appendChild(body);
      document.body.appendChild(card);

      document.getElementById('btn-close-file-editor').onclick = function() { card.remove(); };
      DiskBrowser.setupFloatingEditorDrag(card, titleBar, { top: dialogT, left: dialogL, width: dialogW, height: dialogH });

      try {
        var data = await LunoApiClient.fetchFsRead(filePath, targetProj);
        if (data && data.success && data.content !== undefined) {
          initialLoadedContent = data.content;
          textarea.value = data.content;
          var statusEl = document.getElementById('editor-file-status');
          if (statusEl) { statusEl.textContent = '✓ Ready to edit (Ctrl+S to save)'; statusEl.style.color = '#7ee787'; }
          updateMetrics();
        } else {
          textarea.value = '// Error loading file: ' + ((data && data.error) || 'Not found');
        }
      } catch(err) {
        textarea.value = '// Load exception: ' + err.message;
      }
    }
  static renderFlatLayout(container, queryTarget) {
      if (!container) return;
      container.innerHTML = '';
      var m = DiskBrowser.makeElement;
      var isLibMode = (DiskBrowser.browserMode === 'library');

      var allFiles = DiskBrowser.flatFilesList || [];
      var allDirs = DiskBrowser.directoriesList || [];
      var activeDir = DiskBrowser.selectedDirectory || '';
      var activeType = DiskBrowser.filterType || 'all';

      var filteredFiles = DiskBrowser.filterItems(allFiles);
      var sortedFiles = DiskBrowser.sortItems(filteredFiles, DiskBrowser.sortBy, DiskBrowser.sortDirection);

      var modifiedMap = DiskBrowser.modifiedFilesMap || new Map();

      // 1. Breadcrumb & Active Folder Banner
      var breadcrumbItems = [
        m('span', {
          style: { color: activeDir ? '#58a6ff' : '#00f2fe', cursor: 'pointer', fontWeight: 'bold' },
          onclick: function() {
            DiskBrowser.selectedDirectory = '';
            DiskBrowser.renderFlatLayout(container, queryTarget);
          }
        }, '📁 ' + (queryTarget || 'Project'))
      ];

      if (activeDir) {
        var parts = activeDir.split('/');
        var accum = '';
        parts.forEach(function(part) {
          accum += (accum ? '/' : '') + part;
          var targetPart = accum;
          breadcrumbItems.push(m('span', { style: { color: '#8b949e' } }, ' / '));
          breadcrumbItems.push(m('span', {
            style: { color: (targetPart === activeDir) ? '#00f2fe' : '#58a6ff', cursor: 'pointer', fontWeight: 'bold' },
            onclick: function() {
              DiskBrowser.selectedDirectory = targetPart;
              DiskBrowser.renderFlatLayout(container, queryTarget);
            }
          }, part));
        });

        breadcrumbItems.push(m('button', {
          style: { marginLeft: 'auto', padding: '0.15rem 0.5rem', background: '#21262d', color: '#ff7b72', border: '1px solid #da3633', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' },
          onclick: function() {
            DiskBrowser.selectedDirectory = '';
            DiskBrowser.renderFlatLayout(container, queryTarget);
          }
        }, '✖ Clear Folder Filter'));
      }

      var breadcrumbBar = m('div', {
        style: { display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#070a13', border: '1px solid #30363d', borderRadius: '6px', padding: '0.4rem 0.65rem', marginBottom: '0.45rem', fontSize: '0.75rem', flexWrap: 'wrap' }
      }, ...breadcrumbItems);

      // 2. Type Filter Chips
      var types = [
        { key: 'all', label: 'All Files (' + allFiles.length + ')' },
        { key: 'js', label: 'JS / TS' },
        { key: 'html', label: 'HTML' },
        { key: 'css', label: 'CSS' },
        { key: 'json', label: 'JSON' },
        { key: 'media', label: 'Media / SVG' }
      ];

      var typeFilterRow = m('div', {
        style: { display: 'flex', gap: '0.3rem', marginBottom: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem' }
      }, ...types.map(function(t) {
        var isActive = (activeType === t.key);
        return m('button', {
          style: {
            padding: '0.2rem 0.55rem',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            borderRadius: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: isActive ? '#003847' : '#161b22',
            color: isActive ? '#00f2fe' : '#8b949e',
            border: '1px solid ' + (isActive ? '#00f2fe' : '#30363d')
          },
          onclick: function() {
            DiskBrowser.filterType = t.key;
            DiskBrowser.renderFlatLayout(container, queryTarget);
          }
        }, t.label);
      }));

      // 3. Sorting Controls Bar
      var makeSortBtn = function(label, mode) {
        var isCurrent = (DiskBrowser.sortBy === mode);
        var arrow = isCurrent ? (DiskBrowser.sortDirection === 'desc' ? ' ▼' : ' ▲') : '';
        return m('button', {
          style: {
            padding: '0.2rem 0.5rem',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            background: isCurrent ? '#238636' : '#0d1117',
            color: isCurrent ? '#fff' : '#8b949e',
            border: '1px solid ' + (isCurrent ? '#3fb950' : '#30363d')
          },
          onclick: function() {
            if (DiskBrowser.sortBy === mode) {
              DiskBrowser.sortDirection = DiskBrowser.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
              DiskBrowser.sortBy = mode;
              DiskBrowser.sortDirection = (mode === 'size' || mode === 'date') ? 'desc' : 'asc';
            }
            DiskBrowser.renderFlatLayout(container, queryTarget);
          }
        }, label + arrow);
      };

      var modifiedCount = Array.from(modifiedMap.keys()).length;
      var sortBar = m('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '0.4rem 0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }
      },
        m('div', { style: { display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' } },
          m('span', { style: { fontSize: '0.72rem', color: '#8b949e', fontWeight: 'bold' } }, 'Sort:'),
          makeSortBtn('📦 Size', 'size'),
          makeSortBtn('🔤 Name', 'name'),
          makeSortBtn('🕒 Date', 'date'),
          makeSortBtn('🏷️ Ext', 'ext')
        ),
        m('div', { style: { display: 'flex', gap: '0.4rem', alignItems: 'center' } },
          modifiedCount > 0 ? m('span', { style: { fontSize: '0.68rem', color: '#ff9800', background: 'rgba(255,152,0,0.15)', border: '1px solid #ff980066', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' } }, modifiedCount + ' modified') : null,
          m('span', { style: { fontSize: '0.72rem', color: '#00f2fe', fontWeight: 'bold' } }, sortedFiles.length + ' file(s)')
        )
      );

      // 4. File Rows: Diffs only on modified files + one-tap History access
      var fileRows = sortedFiles.map(function(file) {
        var ext = (file.name.split('.').pop() || '').toLowerCase();
        var isHighlighted = (DiskBrowser.jumpHighlightPath && (file.relativePath === DiskBrowser.jumpHighlightPath || file.name === DiskBrowser.jumpHighlightPath));

        var badgeColor = '#8b949e';
        if (ext === 'js' || ext === 'mjs') badgeColor = '#f7df1e';
        else if (ext === 'html' || ext === 'htm') badgeColor = '#ff7b72';
        else if (ext === 'css') badgeColor = '#58a6ff';
        else if (ext === 'json') badgeColor = '#3fb950';

        var badge = m('span', {
          style: { fontSize: '0.65rem', fontWeight: 'bold', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: badgeColor, border: '1px solid ' + badgeColor + '55', flexShrink: 0 }
        }, ext.toUpperCase());

        var isFileModified = modifiedMap.has(file.relativePath) || modifiedMap.has(file.name);
        var modTag = isFileModified
          ? m('span', { style: { fontSize: '0.62rem', fontWeight: 'bold', color: '#ff9800', background: 'rgba(255,152,0,0.18)', border: '1px solid #ff980088', padding: '0.08rem 0.35rem', borderRadius: '3px' } }, 'MODIFIED')
          : m('span', { style: { fontSize: '0.65rem', color: '#3fb950', opacity: 0.55 } }, '✓');

        var btnDiff = null;
        if (isFileModified) {
          btnDiff = m('button', {
            style: { padding: '0.15rem 0.5rem', background: '#003847', color: '#00f2fe', border: '1px solid #00f2fe', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' },
            title: 'Inspect real diff against Git HEAD or baseline snapshot',
            onclick: async function(e) {
              e.stopPropagation();
              btnDiff.textContent = '...';
              var diffRes = await LunoApiClient.fetchFileDiff(file.relativePath, queryTarget);
              btnDiff.textContent = '🔍 Diff';

              if (diffRes && diffRes.isModified && typeof DiffApprovalModal !== 'undefined') {
                var oldCode = diffRes.oldContent || '';
                var newCode = diffRes.newContent || '';
                var analysis = (typeof CodeDiffer !== 'undefined') ? CodeDiffer.analyzeDiff(oldCode, newCode, file.relativePath) : { linesAdded: 0, linesRemoved: 0, byteDelta: 0 };
                DiffApprovalModal.open({
                  fileDiffs: [{
                    filePath: file.relativePath,
                    target: file.relativePath,
                    mode: diffRes.hasGit ? 'git-baseline' : 'snapshot-baseline',
                    oldContent: oldCode,
                    newContent: newCode,
                    linesAdded: analysis.linesAdded,
                    linesRemoved: analysis.linesRemoved,
                    byteDelta: analysis.byteDelta
                  }],
                  onConfirm: function() {}
                });
              } else {
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                  ClientApp.showToast(file.name + ' matches baseline cleanly.', 'info', '✓');
                }
              }
            }
          }, '🔍 Diff');
        }

        var btnFileHistory = m('button', {
          style: { padding: '0.15rem 0.35rem', background: '#161b22', color: '#d2a8ff', border: '1px solid #8257e566', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' },
          title: 'View Git commits and revision history for ' + file.name,
          onclick: function(e) {
            e.stopPropagation();
            if (typeof LunoTimelineDialog !== 'undefined') {
              LunoTimelineDialog.open({ project: queryTarget, filePath: file.relativePath });
            }
          }
        }, '⏳');

        var btnOutbox = m('button', {
          style: { padding: '0.15rem 0.45rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' },
          title: 'Send to Outbox',
          onclick: function(e) {
            e.stopPropagation();
            DiskBrowser.pushSingleFileToOutbox(file.relativePath, btnOutbox);
          }
        }, '📤 Outbox');

        var tail = DiskBrowser.formatTailPath(file.relativePath, 24);

        return m('div', {
          className: 'luno-file-browser-row' + (isHighlighted ? ' luno-file-jump-highlighted' : ''),
          style: {
            background: isHighlighted ? 'rgba(0, 242, 254, 0.15)' : (isFileModified ? 'rgba(255,152,0,0.04)' : '#0d1117'),
            border: '1px solid ' + (isHighlighted ? '#00f2fe' : (isFileModified ? '#ff980055' : '#21262d')),
            boxShadow: isHighlighted ? '0 0 14px rgba(0, 242, 254, 0.4)' : 'none',
            borderRadius: '6px',
            padding: '0.4rem 0.65rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          },
          onclick: function() {
            DiskBrowser.openFileEditorModal(file.relativePath);
          }
        },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', flex: 1, minWidth: 0 } },
            badge,
            m('strong', { style: { color: isFileModified ? '#ffb74d' : (isLibMode ? '#d2a8ff' : '#f0f6fc'), fontSize: '0.8rem', whiteSpace: 'nowrap' } }, file.name),
            modTag,
            tail ? m('span', { style: { color: '#8b949e', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tail) : null
          ),
          m('div', { style: { display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 } },
            m('span', { style: { color: '#8b949e', fontSize: '0.68rem', fontFamily: 'monospace' } }, DiskBrowser.formatBytes(file.size)),
            btnDiff,
            btnFileHistory,
            btnOutbox
          )
        );
      });

      var filesContainer = m('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '360px', overflowY: 'auto', marginBottom: '0.75rem' }
      }, fileRows.length > 0 ? fileRows : m('div', { style: { padding: '1rem', color: '#8b949e', textAlign: 'center', fontSize: '0.75rem' } }, 'No files matched your filter.'));

      // 5. Interactive Click-to-Drill Directory List
      var dirRows = allDirs.map(function(d) {
        var isCurrent = (activeDir === d.relativePath);
        var count = allFiles.filter(function(f) { return (f.relativePath || '').startsWith(d.relativePath + '/'); }).length;

        return m('div', {
          style: {
            background: isCurrent ? '#003847' : '#0d1117',
            border: '1px solid ' + (isCurrent ? '#00f2fe' : '#21262d'),
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          },
          onclick: function() {
            DiskBrowser.selectedDirectory = isCurrent ? '' : d.relativePath;
            DiskBrowser.renderFlatLayout(container, queryTarget);
          }
        },
          m('span', { style: { color: isCurrent ? '#00f2fe' : '#58a6ff', fontWeight: 'bold' } }, '📁 ' + d.relativePath),
          m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, count + ' file(s)')
        );
      });

      var dirsSection = m('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }
      },
        m('div', { style: { fontSize: '0.75rem', fontWeight: 'bold', color: '#d2a8ff', marginBottom: '0.2rem' } }, '📁 Project Directories (click to filter):'),
        dirRows.length > 0 ? dirRows : m('div', { style: { padding: '0.4rem', color: '#8b949e', fontSize: '0.72rem' } }, 'Root folder only.')
      );

      container.appendChild(breadcrumbBar);
      container.appendChild(typeFilterRow);
      container.appendChild(sortBar);
      container.appendChild(filesContainer);
      container.appendChild(dirsSection);
    }
  static async loadProjectsList() {
    try {
      var res = await LunoApiClient.fetchProjectsList();
      DiskBrowser.projectsList = res.projects || [];
    } catch (e) {}
  }

  static async loadActiveManifest() {
    try {
      var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '';
      var res = await LunoApiClient.fetchFsRead('luno.json', currentTarget);
      if (res && res.content) DiskBrowser.activeManifest = JSON.parse(res.content);
    } catch (e) {}
  }

  static async pushSingleFileToOutbox(relPath, originElement) {
    try {
      var isLibMode = (DiskBrowser.browserMode === 'library');
      var target = isLibMode ? 'Library' : ((typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '');
      var res = await LunoApiClient.fetchFsRead(relPath, target);

      if (res && res.content !== undefined) {
        var fileName = relPath.split('/').pop();
        var ext = (fileName.split('.').pop() || '').toLowerCase();
        var closeTag = (ext === 'css') ? ('<' + '/style>') : (ext === 'html' || ext === 'htm' ? ('<' + '/template>') : (ext === 'svg' ? ('<' + '/svg>') : ('<' + '/script>')));
        var openTag = (ext === 'css') ? '<style' : (ext === 'html' || ext === 'htm' ? '<template' : (ext === 'svg' ? '<svg' : '<script'));

        var filePathPrefix = isLibMode ? ('Library/' + relPath.replace(/^Library\//i, '')) : (target ? (target + '/' + relPath.replace(new RegExp('^' + target + '/'), '')) : relPath);
        var payload = openTag + ' data-file="' + filePathPrefix + '">\n' + res.content + '\n' + closeTag;

        if (originElement && typeof LunoAnimationEngine !== 'undefined') {
          var outboxCard = document.querySelector('.outbox-card');
          LunoAnimationEngine.flyElement(originElement, outboxCard, {
            label: '📄 ' + fileName,
            color: '#d2a8ff',
            glowColor: 'rgba(130, 87, 229, 0.85)',
            icon: '📤',
            duration: 500
          });
        }

        if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
          OutboxQueue.addBundle((isLibMode ? 'Library Module: ' : 'File: ') + relPath, payload);
          DiskBrowser.showToast('Queued ' + relPath + ' to Outbox!', 'success', '📤');
        }
      } else {
        DiskBrowser.showToast('Failed to read file for Outbox: ' + relPath, 'error', '❌');
      }
    } catch (e) {
      DiskBrowser.showToast('Error reading ' + relPath + ': ' + e.message, 'error', '❌');
    }
  }

  static filterItems(files) {
      var query = (DiskBrowser.searchQuery || '').toLowerCase().trim();
      var selectedDir = (DiskBrowser.selectedDirectory || '').toLowerCase().trim();
      var typeFilter = DiskBrowser.filterType || 'all';

      return (files || []).filter(function(file) {
        var rel = (file.relativePath || file.name || '').toLowerCase();
        var name = (file.name || '').toLowerCase();
        var ext = name.split('.').pop();

        // 1. Directory Filter
        if (selectedDir && !rel.startsWith(selectedDir + '/') && file.dirPath.toLowerCase() !== selectedDir) {
          return false;
        }

        // 2. Type Filter
        if (typeFilter === 'js' && ext !== 'js' && ext !== 'mjs') return false;
        if (typeFilter === 'html' && ext !== 'html' && ext !== 'htm') return false;
        if (typeFilter === 'css' && ext !== 'css') return false;
        if (typeFilter === 'json' && ext !== 'json') return false;
        if (typeFilter === 'media' && !['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext)) return false;

        // 3. Search Query
        if (query && !name.includes(query) && !rel.includes(query)) {
          return false;
        }

        return true;
      });
    }

  static jumpToFile(filePath) {
      if (!filePath) return;
      var clean = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      if (clean.startsWith('Luno Workspace/')) clean = clean.slice(15).trim();

      DiskBrowser.jumpHighlightPath = clean;
      DiskBrowser.selectedDirectory = '';
      DiskBrowser.filterType = 'all';
      DiskBrowser.searchQuery = '';

      var targetProj = (DiskBrowser.browserMode === 'library') ? 'Library' : ((typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '');
      var container = document.getElementById('item-list-container');
      if (container) {
        DiskBrowser.renderFlatLayout(container, targetProj);
      }

      DiskBrowser.openFileEditorModal(clean);

      setTimeout(function() {
        var highlightedRow = document.querySelector('.luno-file-jump-highlighted');
        if (highlightedRow) {
          highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
}

globalThis.DiskBrowser = DiskBrowser;
if (typeof window !== 'undefined') window.DiskBrowser = DiskBrowser;
if (typeof module !== 'undefined' && module.exports) module.exports = DiskBrowser;