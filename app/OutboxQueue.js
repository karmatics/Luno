class OutboxQueue {
  constructor() {}

  static STORAGE_KEY = 'luno_outbox_queue_v1';
  static activeClearClock = null;
  static activeExpandedId = null;

  static loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(OutboxQueue.STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('[OutboxQueue] Corrupted localStorage queue reset:', e);
    }
    return [];
  }

  static queue = OutboxQueue.loadQueue();

  static saveQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        var sanitizedQueue = (OutboxQueue.queue || []).slice(-10).map(function(item) {
          var payloadStr = String(item.payload || '');
          return {
            id: item.id,
            title: item.title,
            timestamp: item.timestamp,
            priority: item.priority,
            lines: item.lines,
            estTokens: item.estTokens,
            payload: payloadStr.length > 60000 ? payloadStr.slice(0, 500) + '... [Full in Memory]' : payloadStr,
            isMemoryOnly: payloadStr.length > 60000
          };
        });
        localStorage.setItem(OutboxQueue.STORAGE_KEY, JSON.stringify(sanitizedQueue));
      }
    } catch (e) {
      try {
        var minimalQueue = (OutboxQueue.queue || []).slice(-5).map(function(i) {
          return { id: i.id, title: i.title, timestamp: i.timestamp, priority: i.priority, lines: i.lines, estTokens: i.estTokens };
        });
        localStorage.setItem(OutboxQueue.STORAGE_KEY, JSON.stringify(minimalQueue));
      } catch (e2) {}
    }
  }

  static notifyTargetPage(title, payloadText) {
    try {
      var envelope = {
        type: 'LUNO_OUTBOX_NOTIFY',
        target: 'aistudio.google.com',
        timestamp: new Date().toISOString(),
        payload: { title: title, text: payloadText }
      };

      if (typeof window !== 'undefined') {
        var win = window.opener || window.parent;
        if (win && typeof win.postMessage === 'function') {
          win.postMessage(envelope, '*');
        }
      }
    } catch (e) {}
  }

  static addBundle(title, payloadText, options) {
      // Ensure cross-window message listener is running
      OutboxQueue.initMessageListener();

      var opts = options || {};
      var payload = payloadText || '';
      var item = {
        id: 'outbox_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title: title || 'Outbox Item',
        payload: payload,
        timestamp: new Date().toLocaleTimeString(),
        priority: opts.priority || 'normal',
        lines: payload.split('\n').length,
        estTokens: Math.ceil(payload.length / 4)
      };

      OutboxQueue.queue.push(item);
      if (OutboxQueue.queue.length > 15) OutboxQueue.queue.shift();

      OutboxQueue.saveQueue();
      OutboxQueue.notifyTargetPage(item.title, payload);

      var outboxCard = document.querySelector('.outbox-card');
      if (outboxCard && typeof LunoAnimationEngine !== 'undefined') {
        LunoAnimationEngine.pulseTarget(outboxCard, {
          color: '#d2a8ff',
          glowColor: 'rgba(130, 87, 229, 0.75)'
        });
        if (typeof LunoAnimationEngine.wavePulse === 'function') {
          LunoAnimationEngine.wavePulse(outboxCard, '#8257e5');
        }
      }

      if (typeof ClientAppUI !== 'undefined') {
        ClientAppUI.outboxExpanded = true;
        var content = typeof document !== 'undefined' ? document.getElementById('outbox-card-content') : null;
        if (content) content.style.display = 'block';
      }

      if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
        OutboxWidgetRenderer.renderWidget('outbox-queue-container');
      }
      return item;
    }
  static togglePriority(id) {
    var item = OutboxQueue.queue.find(function(i) { return i && i.id === id; });
    if (item) {
      item.priority = item.priority === 'high' ? 'normal' : 'high';
      OutboxQueue.queue.sort(function(a, b) { return (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0); });
      OutboxQueue.saveQueue();
      if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
        OutboxWidgetRenderer.renderWidget('outbox-queue-container');
      }
    }
  }

  static removeItem(id) {
    OutboxQueue.queue = OutboxQueue.queue.filter(function(i) { return i && i.id !== id; });
    OutboxQueue.saveQueue();
    if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
      OutboxWidgetRenderer.renderWidget('outbox-queue-container');
    }
  }

  static updateItem(id, newTitle, newPayload) {
    var item = OutboxQueue.queue.find(function(i) { return i && i.id === id; });
    if (item) {
      item.title = newTitle;
      item.payload = newPayload;
      item.lines = newPayload.split('\n').length;
      item.estTokens = Math.ceil(newPayload.length / 4);
      OutboxQueue.saveQueue();
      if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
        OutboxWidgetRenderer.renderWidget('outbox-queue-container');
      }
    }
  }

  static getMaxPackageSize() {
    var maxBytes = 500000;
    try {
      if (typeof LunoSettings !== 'undefined') {
        var settingVal = parseInt(LunoSettings.getItem(LunoSettings.KEYS.maxPackageSize, '500000'), 10);
        if (!isNaN(settingVal) && settingVal >= 20000) maxBytes = settingVal;
      } else if (typeof localStorage !== 'undefined') {
        var lsVal = parseInt(localStorage.getItem('luno_max_pkg_size') || '500000', 10);
        if (!isNaN(lsVal) && lsVal >= 20000) maxBytes = lsVal;
      }
    } catch (e) {}
    return maxBytes;
  }

  static bundleAndQueueCodebase(filesMap, manifest, projName, options) {
    var opts = options || {};
    var pName = (projName === 'Luno Workspace' || !projName) ? 'Luno' : projName;
    if (pName.startsWith('Luno Workspace/')) pName = pName.slice(15);
    if (pName === 'Luno Workspace') pName = 'Luno';

    var maxBytes = Math.max(1500000, OutboxQueue.getMaxPackageSize());
    var includeInstructions = opts.includeInstructions !== false;
    var includeProjectLibrary = (opts.includeProjectLibrary !== false);
    var includeAllLibrary = Boolean(opts.includeAllLibrary);
    var includeTopology = opts.includeTopology !== false;
    var visibilitySetName = opts.visibilitySetName || null;
    var allowedFilePaths = Array.isArray(opts.allowedFilePaths) ? new Set(opts.allowedFilePaths.map(p => p.replace(/^\/+/, ''))) : null;

    var SCRIPT_WORD = 'scr' + 'ipt';
    var STYLE_WORD = 'sty' + 'le';
    var TEMPLATE_WORD = 'temp' + 'late';
    var SVG_WORD = 'sv' + 'g';

    var closeStyle = '</' + STYLE_WORD + '>';
    var closeTemplate = '</' + TEMPLATE_WORD + '>';
    var closeScript = '</' + SCRIPT_WORD + '>';
    var closeSvg = '</' + SVG_WORD + '>';

    var escapeStyle = '<\\/' + STYLE_WORD + '>';
    var escapeTemplate = '<\\/' + TEMPLATE_WORD + '>';
    var escapeScript = '<\\/' + SCRIPT_WORD + '>';
    var escapeSvg = '<\\/' + SVG_WORD + '>';

    // Clear existing items for this project before re-bundling
    OutboxQueue.queue = OutboxQueue.queue.filter(function(i) {
      if (!i || !i.title) return false;
      return !(
        i.title.startsWith('Codebase Package: ' + pName) ||
        i.title.startsWith('Smart Bundle: ' + pName) ||
        i.title.startsWith('📚 Library Dependencies') ||
        i.title.startsWith('📋 Luno Protocol Instructions')
      );
    });

    // 1. SEPARATE ITEM: Protocol Instructions (Added first to Outbox)
    if (includeInstructions && typeof LunoPromptInstructions !== 'undefined') {
      var instructionsText = LunoPromptInstructions.assembleFullInstructions() + '\n';
      OutboxQueue.addBundle('📋 Luno Protocol Instructions', instructionsText, { priority: 'high' });
    }

    // Helper to format a file container
    function formatFileContainer(filePath, content) {
      var ext = filePath.split('.').pop().toLowerCase();
      var safe = content || '';
      if (ext === 'css') {
        return '<' + STYLE_WORD + ' data-file="' + filePath + '">\n' + safe.split(closeStyle).join(escapeStyle) + '\n' + closeStyle + '\n\n';
      } else if (ext === 'html' || ext === 'htm') {
        return '<' + TEMPLATE_WORD + ' data-file="' + filePath + '">\n' + safe.split(closeTemplate).join(escapeTemplate) + '\n' + closeTemplate + '\n\n';
      } else if (ext === 'json') {
        return '<' + SCRIPT_WORD + ' type="application/json" data-file="' + filePath + '">\n' + safe.split(closeScript).join(escapeScript) + '\n' + closeScript + '\n\n';
      } else if (ext === 'md' || ext === 'txt') {
        return '<' + SCRIPT_WORD + ' type="text/plain" data-file="' + filePath + '">\n' + safe.split(closeScript).join(escapeScript) + '\n' + closeScript + '\n\n';
      } else if (ext === 'svg') {
        return '<' + SVG_WORD + ' data-file="' + filePath + '">\n' + safe.split(closeSvg).join(escapeSvg) + '\n' + closeSvg + '\n\n';
      }
      return '<' + SCRIPT_WORD + ' data-file="' + filePath + '">\n' + safe.split(closeScript).join(escapeScript) + '\n' + closeScript + '\n\n';
    }

    // Segregate library files and project files
    var libraryFilesMap = {};
    var projectFilesMap = {};

    for (var rawPath in filesMap) {
      if (!Object.prototype.hasOwnProperty.call(filesMap, rawPath)) continue;
      var norm = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
      if (norm.startsWith('Luno Workspace/')) norm = norm.slice(15).trim();

      if (norm.startsWith('Library/') || norm.startsWith('library/')) {
        libraryFilesMap[norm] = filesMap[rawPath];
      } else {
        projectFilesMap[norm] = filesMap[rawPath];
      }
    }

    // 2. SEPARATE ITEM: Shared Library Code (with deduplication tracking)
    OutboxQueue._alreadyShownLibraries = OutboxQueue._alreadyShownLibraries || new Set();

    if ((includeProjectLibrary || includeAllLibrary) && pName.toLowerCase() !== 'library') {
      var libBlocks = '';
      var libFilesMeta = [];

      for (var libPath in libraryFilesMap) {
        if (!Object.prototype.hasOwnProperty.call(libraryFilesMap, libPath)) continue;

        var canonicalLib = 'Library/' + libPath.replace(/^(?:Library|library)\//, '');
        var content = libraryFilesMap[libPath] || '';
        var contentHash = (typeof CodeDiffer !== 'undefined' && CodeDiffer.fastHash) ? CodeDiffer.fastHash(content) : content.length;
        var trackKey = canonicalLib + '@' + contentHash;

        // Skip repeating library code that has already been shown in this session
        if (!opts.forceAllLibrary && OutboxQueue._alreadyShownLibraries.has(trackKey)) {
          continue;
        }

        libBlocks += formatFileContainer(canonicalLib, content);
        libFilesMeta.push({
          filePath: canonicalLib,
          size: content.length,
          lines: content.split('\n').length,
          tagName: canonicalLib.endsWith('.css') ? 'style' : 'script'
        });
        OutboxQueue._alreadyShownLibraries.add(trackKey);
      }

      if (libFilesMeta.length > 0) {
        var libItem = OutboxQueue.addBundle(
          '📚 Library Dependencies: ' + pName + ' (' + libFilesMeta.length + ' files)',
          libBlocks.trim() + '\n\n',
          { priority: 'normal' }
        );
        libItem.files = libFilesMeta;
      }
    }

    // 3. Topology Header for Project Code
    var topologyHeader = '';
    if (includeTopology) {
      var scopeLabel = visibilitySetName ? (' [Set: ' + visibilitySetName + ']') : '';
      var topologyLines = [
        '================================================================================',
        '🗺️ CODEBASE CLASS & METHOD TOPOLOGY INDEX [' + pName + scopeLabel + ']',
        '================================================================================'
      ];
      var foundAny = false;

      for (var fPath in projectFilesMap) {
        if (!Object.prototype.hasOwnProperty.call(projectFilesMap, fPath)) continue;
        var fContent = projectFilesMap[fPath];
        if (!fContent || (!fPath.endsWith('.js') && !fPath.endsWith('.mjs'))) continue;

        var cleanFPath = fPath.replace(/\\/g, '/');
        var checkKey = cleanFPath.replace(/^\/+/, '');
        if (pName && checkKey.startsWith(pName + '/')) checkKey = checkKey.slice(pName.length + 1);

        if (allowedFilePaths && !allowedFilePaths.has(checkKey) && !allowedFilePaths.has(cleanFPath) && !allowedFilePaths.has('/' + cleanFPath)) {
          continue;
        }

        var classesInFile = [];
        if (typeof LunoClassPatcher !== 'undefined' && typeof LunoClassPatcher.extractFileTopology === 'function') {
          classesInFile = LunoClassPatcher.extractFileTopology(fContent, cleanFPath);
        }

        if (classesInFile && classesInFile.length > 0) {
          classesInFile.forEach(function(cls) {
            var methods = cls.methods || [];
            foundAny = true;
            topologyLines.push('📁 ' + cleanFPath + ' ➔ class ' + cls.className + ' (' + methods.length + ' methods):');
            if (methods.length > 0) {
              topologyLines.push(methods.slice(0, 15).join('\n') + (methods.length > 15 ? ('\n  • ... (' + (methods.length - 15) + ' more methods)') : ''));
            }
          });
        }
      }

      if (foundAny) {
        topologyLines.push('================================================================================\n');
        topologyHeader = topologyLines.join('\n') + '\n';
      }
    }

    // 4. SEPARATE ITEM(S): Project Codebase
    var parts = [];
    var currentPartText = topologyHeader;
    var currentPartMeta = [];
    var totalProjectFiles = 0;

    for (var rawProjPath in projectFilesMap) {
      if (!Object.prototype.hasOwnProperty.call(projectFilesMap, rawProjPath)) continue;

      var canonicalPath = rawProjPath;
      if (pName === 'Luno') {
        if (!canonicalPath.startsWith('Luno/')) canonicalPath = 'Luno/' + canonicalPath;
      } else if (!canonicalPath.startsWith(pName + '/')) {
        canonicalPath = pName + '/' + canonicalPath;
      }

      var fileRelToProj = canonicalPath;
      if (pName && fileRelToProj.startsWith(pName + '/')) fileRelToProj = fileRelToProj.slice(pName.length + 1);

      if (allowedFilePaths && !allowedFilePaths.has(fileRelToProj) && !allowedFilePaths.has(canonicalPath) && !allowedFilePaths.has('/' + canonicalPath)) {
        continue;
      }

      var content = projectFilesMap[rawProjPath] || '';
      var block = formatFileContainer(canonicalPath, content);
      var lineCount = content.split('\n').length;
      var ext = canonicalPath.split('.').pop().toLowerCase();

      var fileMeta = {
        filePath: canonicalPath,
        size: content.length,
        lines: lineCount,
        tagName: (ext === 'css' ? 'style' : (ext === 'html' ? 'template' : 'script'))
      };

      totalProjectFiles++;

      if ((currentPartText.length + block.length) > maxBytes && currentPartMeta.length > 0) {
        parts.push({ text: currentPartText.trim() + '\n\n', files: currentPartMeta });
        currentPartText = '/* 📦 Codebase Package: Part ' + (parts.length + 1) + ' Continuation for [' + pName + '] */\n\n' + block;
        currentPartMeta = [fileMeta];
      } else {
        currentPartText += block;
        currentPartMeta.push(fileMeta);
      }
    }

    if (currentPartMeta.length > 0) {
      parts.push({ text: currentPartText.trim() + '\n\n', files: currentPartMeta });
    }

    var titleScope = visibilitySetName ? (' [Set: ' + visibilitySetName + ']') : '';
    for (var i = 0; i < parts.length; i++) {
      var partTitle = 'Codebase Package: ' + pName + titleScope + (parts.length > 1 ? (' (Part ' + (i + 1) + '/' + parts.length + ')') : '');
      var pkgItem = OutboxQueue.addBundle(partTitle, parts[i].text, { priority: 'high' });
      pkgItem.files = parts[i].files;
    }

    OutboxQueue.saveQueue();
    return { fileCount: totalProjectFiles, totalParts: parts.length, projTitle: pName, visibilitySetName: visibilitySetName };
  }
  static getCombinedPackageText(itemId) {
    if (OutboxQueue.queue.length === 0) return '';

    if (itemId) {
      var target = OutboxQueue.queue.find(function(i) { return i && i.id === itemId; });
      if (target) return target.payload.trim();
    }

    var packageText = '';
    var hasPreamble = false;
    var preambleMarker = '🌙 LUNO WORKSPACE - LLM RESPONSE PROTOCOL INSTRUCTIONS';

    OutboxQueue.queue.forEach(function(item) {
      if (item && item.payload) {
        var p = item.payload.trim();
        if (p.includes(preambleMarker)) {
          if (hasPreamble) {
            // Strip duplicate preamble from second/third items
            var endMarkerIdx = p.indexOf('================================================================================\n\n');
            if (endMarkerIdx !== -1) {
              p = p.slice(endMarkerIdx + 82).trim();
            }
          } else {
            hasPreamble = true;
          }
        }
        if (p) {
          if (packageText) packageText += '\n\n';
          packageText += p;
        }
      }
    });

    return packageText.trim() + '\n\n';
  }
  static copyPackageToClipboard(itemId) {
    if (!OutboxQueue.queue || OutboxQueue.queue.length === 0) {
      if (typeof ClientApp !== 'undefined') ClientApp.showToast('Outbox is empty!', 'info');
      return;
    }

    var packageText = '';
    var toastMsg = 'Copied Outbox Package to clipboard!';

    if (itemId) {
      var item = OutboxQueue.queue.find(function(i) { return i && i.id === itemId; });
      if (item) {
        packageText = item.payload.trim();
        toastMsg = 'Copied ' + item.title + ' to clipboard!';
      }
    }

    if (!packageText) {
      packageText = OutboxQueue.getCombinedPackageText();
      toastMsg = 'Copied Outbox Package (' + OutboxQueue.queue.length + ' items) to clipboard!';
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(packageText);
      }
    } catch (e) {}

    var outboxCard = document.querySelector('.outbox-card');
    if (outboxCard && typeof LunoAnimationEngine !== 'undefined') {
      var rect = outboxCard.getBoundingClientRect();
      LunoAnimationEngine.burstSparks(rect.left + (rect.width / 2), rect.top + 30, '#3fb950', 20);
      LunoAnimationEngine.pulseTarget(outboxCard, { color: '#3fb950', glowColor: 'rgba(63, 185, 80, 0.85)' });
      if (typeof LunoAnimationEngine.wavePulse === 'function') {
        LunoAnimationEngine.wavePulse(outboxCard, '#3fb950');
      }
    }

    if (typeof OutboxQueue.notifyTargetPage === 'function') {
      OutboxQueue.notifyTargetPage(itemId ? 'Single Item' : 'Outbox Package', packageText);
    }

    if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
      ClientApp.showToast(toastMsg, 'success', '📋');
    }

    if (typeof OutboxQueue.showClearCountdownBanner === 'function') {
      OutboxQueue.showClearCountdownBanner(10000, itemId);
    }
  }

  static async executeSmartBundle(bundleOptions) {
        try {
          var opts = (typeof bundleOptions === 'object' && bundleOptions !== null)
            ? bundleOptions
            : { includeInstructions: true, includeProjectLibrary: true, includeAllLibrary: false };

          var targetProj = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
          if (targetProj === 'Luno Workspace') targetProj = 'Luno';

          var lunoMeta = {};
          try {
            var dataMeta = await LunoApiClient.fetchFsRead('luno.json', targetProj);
            if (dataMeta && dataMeta.content) lunoMeta = JSON.parse(dataMeta.content);
          } catch (e) {}

          var projName = targetProj || 'Luno';
          if (projName === 'Luno Workspace') projName = 'Luno';

          var dataCode = await LunoApiClient.fetchAllCode(targetProj, {
            includeProjectLibrary: opts.includeProjectLibrary !== false,
            includeAllLibrary: Boolean(opts.includeAllLibrary)
          });

          if (!dataCode || !dataCode.success || !dataCode.filesMap) {
            throw new Error((dataCode && dataCode.error) || 'Failed to fetch codebase from storage');
          }

          var filesMap = dataCode.filesMap || {};
          var result = OutboxQueue.bundleAndQueueCodebase(filesMap, lunoMeta, projName, opts);

          if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
            OutboxWidgetRenderer.renderWidget('outbox-queue-container');
          }

          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            var partNotice = result.totalParts > 1 ? (' (Split into ' + result.totalParts + ' parts)') : '';
            var setNotice = result.visibilitySetName ? (' [Set: ' + result.visibilitySetName + ']') : '';
            ClientApp.showToast('Bundled ' + result.fileCount + ' file(s) for [' + projName + ']' + setNotice + partNotice + ' into Outbox!', 'success', '⚡');
          }
          return result;
        } catch (err) {
          console.error('[OutboxQueue] Smart Bundle Exception:', err);
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Bundle Error: ' + err.message, 'error', '❌');
          }
        }
    }

  static initMessageListener() {
      if (typeof window === 'undefined' || window._lunoOutboxListenerInitialized) return;
      window._lunoOutboxListenerInitialized = true;

      window.addEventListener('message', (e) => {
        if (!e.data || typeof e.data !== 'object') return;
        if (e.data.type === 'LUNO_ADD_OUTBOX_BUNDLE') {
          const title = e.data.title || 'Inbound Outbox Bundle';
          const payload = e.data.payload || '';
          if (payload) {
            OutboxQueue.addBundle(title, payload, { priority: e.data.priority || 'high' });
            if (typeof ClientApp !== 'undefined' && typeof ClientApp.showToast === 'function') {
              ClientApp.showToast(`Received "${title}" into Outbox!`, 'success', '📤');
            }
          }
        }
      });
    }

  static removeFileFromItem(itemId, filePath) {
    var item = OutboxQueue.queue.find(function(i) { return i && i.id === itemId; });
    if (!item) return;

    var cleanTarget = filePath.replace(/\\/g, '/');
    var rawPayload = item.payload;

    var regex = new RegExp('<(script|style|template|svg)\\b[^>]*data-file=["\']' + cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>[\\s\\S]*?<\\/\\1>\\s*', 'i');
    var match = rawPayload.match(regex);

    if (match) {
      item.payload = rawPayload.slice(0, match.index) + rawPayload.slice(match.index + match[0].length);
    } else {
      var altPath = cleanTarget.split('/').slice(1).join('/');
      if (altPath) {
        var altRegex = new RegExp('<(script|style|template|svg)\\b[^>]*data-file=["\'][^"\']*' + altPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>[\\s\\S]*?<\\/\\1>\\s*', 'i');
        var altMatch = rawPayload.match(altRegex);
        if (altMatch) {
          item.payload = rawPayload.slice(0, altMatch.index) + rawPayload.slice(altMatch.index + altMatch[0].length);
        }
      }
    }

    if (Array.isArray(item.files)) {
      item.files = item.files.filter(function(f) {
        return f.filePath !== filePath && f.filePath !== cleanTarget;
      });
    }

    if (!item.payload.trim() || (item.files && item.files.length === 0)) {
      OutboxQueue.removeItem(itemId);
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast('Removed ' + filePath + ' (package item now empty)', 'info', '🗑️');
      }
      return;
    }

    item.lines = item.payload.split('\n').length;
    item.estTokens = Math.ceil(item.payload.length / 4);
    OutboxQueue.saveQueue();

    if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
      OutboxWidgetRenderer.renderWidget('outbox-queue-container');
    }

    if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
      var fileName = filePath.split('/').pop() || filePath;
      ClientApp.showToast('Removed ' + fileName + ' from ' + item.title, 'success', '✂️');
    }
  }
}

globalThis.OutboxQueue = OutboxQueue;
if (typeof module !== 'undefined' && module.exports) module.exports = OutboxQueue;