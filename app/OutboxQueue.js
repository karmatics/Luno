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
    var pName = projName || 'Project';
    var maxBytes = Math.max(1500000, OutboxQueue.getMaxPackageSize());
    var includeInstructions = opts.includeInstructions !== false;
    var includeProjectLibrary = (opts.includeProjectLibrary !== false);
    var includeAllLibrary = Boolean(opts.includeAllLibrary);
    var includeTopology = opts.includeTopology !== false;

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

    var instructionPreamble = '';
    if (includeInstructions && typeof LunoPromptInstructions !== 'undefined') {
      instructionPreamble = LunoPromptInstructions.assembleFullInstructions() + '\n';
    }

    var topologyHeader = '';
    if (includeTopology) {
      var topologyLines = [
        '================================================================================',
        '🗺️ CODEBASE CLASS & METHOD TOPOLOGY INDEX [' + pName + ']',
        '================================================================================'
      ];
      var foundAny = false;

      for (var fPath in filesMap) {
        if (!Object.prototype.hasOwnProperty.call(filesMap, fPath)) continue;
        var fContent = filesMap[fPath];
        if (!fContent || (!fPath.endsWith('.js') && !fPath.endsWith('.mjs'))) continue;

        var classesInFile = [];
        if (typeof LunoClassPatcher !== 'undefined' && typeof LunoClassPatcher.extractFileTopology === 'function') {
          classesInFile = LunoClassPatcher.extractFileTopology(fContent, fPath);
        }

        if (classesInFile && classesInFile.length > 0) {
          classesInFile.forEach(function(cls) {
            var methods = cls.methods || [];
            var unverifiedTag = cls.isUnverified ? ' ⚠️ unverified (parse error) — regex fallback' : '';
            foundAny = true;
            topologyLines.push('📁 ' + fPath + ' ➔ class ' + cls.className + unverifiedTag + ' (' + methods.length + ' methods):');
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

    var primaryHeader = instructionPreamble + topologyHeader;
    var parts = [];
    var currentPartText = primaryHeader;
    var currentPartFiles = 0;
    var totalFiles = 0;

    for (var rawPath in filesMap) {
      if (!Object.prototype.hasOwnProperty.call(filesMap, rawPath)) continue;

      var normPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
      var canonicalPath = normPath;

      if (canonicalPath.startsWith('Library/') || canonicalPath.startsWith('library/')) {
        if (!includeAllLibrary && !includeProjectLibrary && pName.toLowerCase() !== 'library') continue;
        canonicalPath = 'Library/' + canonicalPath.replace(/^(?:Library|library)\//, '');
      } else if (!canonicalPath.startsWith(pName + '/')) {
        canonicalPath = pName + '/' + canonicalPath;
      }

      var content = filesMap[rawPath];
      var ext = canonicalPath.split('.').pop().toLowerCase();
      var safeContent = content || '';
      var block = '';

      if (ext === 'css') {
        safeContent = safeContent.split(closeStyle).join(escapeStyle);
        block = '<' + STYLE_WORD + ' data-file="' + canonicalPath + '">\n' + safeContent + '\n' + closeStyle + '\n\n';
      } else if (ext === 'html' || ext === 'htm') {
        safeContent = safeContent.split(closeTemplate).join(escapeTemplate);
        block = '<' + TEMPLATE_WORD + ' data-file="' + canonicalPath + '">\n' + safeContent + '\n' + closeTemplate + '\n\n';
      } else if (ext === 'json') {
        safeContent = safeContent.split(closeScript).join(escapeScript);
        block = '<' + SCRIPT_WORD + ' type="application/json" data-file="' + canonicalPath + '">\n' + safeContent + '\n' + closeScript + '\n\n';
      } else if (ext === 'md' || ext === 'txt') {
        safeContent = safeContent.split(closeScript).join(escapeScript);
        block = '<' + SCRIPT_WORD + ' type="text/plain" data-file="' + canonicalPath + '">\n' + safeContent + '\n' + closeScript + '\n\n';
      } else if (ext === 'svg') {
        safeContent = safeContent.split(closeSvg).join(escapeSvg);
        block = '<' + SVG_WORD + ' data-file="' + canonicalPath + '">\n' + safeContent + '\n' + closeSvg + '\n\n';
      } else {
        safeContent = safeContent.split(closeScript).join(escapeScript);
        block = '<' + SCRIPT_WORD + ' data-file="' + canonicalPath + '">\n' + safeContent + '\n' + closeScript + '\n\n';
      }

      totalFiles++;

      if ((currentPartText.length + block.length) > maxBytes && currentPartFiles > 0) {
        parts.push(currentPartText.trim() + '\n\n');
        var continuationHeader = '/* 📦 Codebase Package: Part ' + (parts.length + 1) + ' Continuation for [' + pName + '] */\n\n';
        currentPartText = continuationHeader + block;
        currentPartFiles = 1;
      } else {
        currentPartText += block;
        currentPartFiles++;
      }
    }

    if (currentPartFiles > 0) {
      parts.push(currentPartText.trim() + '\n\n');
    }

    // Deduplicate and clear stale bundles
    OutboxQueue.queue = OutboxQueue.queue.filter(function(i) {
      if (!i || !i.title) return false;
      return !(i.title.startsWith('Codebase Package: ' + pName) || i.title.startsWith('Smart Bundle: ' + pName) || i.title.startsWith('Luno Protocol Master Instructions'));
    });

    for (var i = 0; i < parts.length; i++) {
      var partTitle = 'Codebase Package: ' + pName + (parts.length > 1 ? (' (Part ' + (i + 1) + '/' + parts.length + ')') : '');
      OutboxQueue.addBundle(partTitle, parts[i], { priority: 'high' });
    }

    return { fileCount: totalFiles, totalParts: parts.length, projTitle: pName };
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
      var lunoMeta = {};
      try {
        var dataMeta = await LunoApiClient.fetchFsRead('luno.json', targetProj);
        if (dataMeta && dataMeta.content) lunoMeta = JSON.parse(dataMeta.content);
      } catch (e) {}

      var projName = lunoMeta.name || targetProj || 'Project';
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
        ClientApp.showToast('Bundled ' + result.fileCount + ' file(s) for [' + projName + ']' + partNotice + ' into Outbox!', 'success', '⚡');
      }
      return result;
    } catch (err) {
      console.error('[OutboxQueue] Smart Bundle Exception:', err);
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast('Bundle Error: ' + err.message, 'error', '❌');
      }
    }
  }
}

globalThis.OutboxQueue = OutboxQueue;
if (typeof module !== 'undefined' && module.exports) module.exports = OutboxQueue;