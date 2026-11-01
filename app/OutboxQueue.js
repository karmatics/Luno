class OutboxQueue {
  static STORAGE_KEY = 'luno_outbox_queue_v2';
  static activeExpandedId = null;
  static _listeners = new Set();

  static get queue() {
    try {
      const raw = localStorage.getItem(OutboxQueue.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[OutboxQueue] Error reading queue from localStorage:', e);
    }
    return [];
  }

  static set queue(val) {
    OutboxQueue.saveQueue(val);
  }

  static saveQueue(q) {
    try {
      const safeQueue = Array.isArray(q) ? q : [];
      localStorage.setItem(OutboxQueue.STORAGE_KEY, JSON.stringify(safeQueue));
      OutboxQueue._notify();
      if (typeof OutboxWidgetRenderer !== 'undefined' && typeof OutboxWidgetRenderer.renderWidget === 'function') {
        OutboxWidgetRenderer.renderWidget('outbox-queue-container');
      }
    } catch (e) {
      console.error('[OutboxQueue] Error saving queue to localStorage:', e);
    }
  }

  static addBundle(title, payload, options = {}) {
    if (!payload && !title) return null;

    const id = (options && options.id) || ('bundle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawPayload = String(payload || '');
    const lines = rawPayload.split('\n').length;
    const estTokens = Math.round(rawPayload.length / 4);

    const item = {
      id: id,
      title: title || 'Outbox Item',
      payload: rawPayload,
      priority: (options && options.priority) || 'normal',
      type: (options && options.type) || 'general',
      timestamp: timeStr,
      files: (options && options.files) || [],
      lines: lines,
      estTokens: estTokens,
      meta: (options && options.meta) || {}
    };

    const q = OutboxQueue.queue;
    q.unshift(item);
    OutboxQueue.saveQueue(q);

    return item;
  }

  static updateItem(id, title, payload) {
    const q = OutboxQueue.queue;
    const item = q.find(it => it.id === id);
    if (item) {
      if (title) item.title = title;
      if (payload != null) {
        item.payload = String(payload);
        item.lines = item.payload.split('\n').length;
        item.estTokens = Math.round(item.payload.length / 4);
      }
      const now = new Date();
      item.timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      OutboxQueue.saveQueue(q);
      return item;
    }
    return null;
  }

  static removeItem(id) {
    let q = OutboxQueue.queue;
    q = q.filter(it => it.id !== id);
    OutboxQueue.saveQueue(q);
  }

  static removeFileFromItem(id, filePath) {
    const q = OutboxQueue.queue;
    const item = q.find(it => it.id === id);
    if (!item) return;

    const normTarget = (filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (Array.isArray(item.files)) {
      item.files = item.files.filter(f => {
        const p = typeof f === 'string' ? f : ((f && (f.filePath || f.name)) || '');
        return p.replace(/\\/g, '/').replace(/^\/+/, '') !== normTarget;
      });
    }

    if (item.payload && typeof item.payload === 'string') {
      const containerRegex = /<(script|style|template|svg)\b[^>]*\bdata-file=["']([^"']+)["'][^>]*>[\s\S]*?<\/\1>/gi;
      let newPayload = item.payload.replace(containerRegex, (match, tag, fPath) => {
        const cleanPath = fPath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (cleanPath === normTarget || cleanPath.endsWith('/' + normTarget) || normTarget.endsWith('/' + cleanPath)) {
          return '';
        }
        return match;
      }).trim();

      newPayload = newPayload.replace(/```html\s*```/g, '').trim();

      if (!newPayload || (Array.isArray(item.files) && item.files.length === 0)) {
        OutboxQueue.removeItem(id);
        return;
      }

      item.payload = newPayload;
      item.lines = newPayload.split('\n').length;
      item.estTokens = Math.round(newPayload.length / 4);
    }

    OutboxQueue.saveQueue(q);
  }

  static togglePriority(id) {
    const q = OutboxQueue.queue;
    const item = q.find(it => it.id === id);
    if (item) {
      item.priority = item.priority === 'high' ? 'normal' : 'high';
      OutboxQueue.saveQueue(q);
      return item;
    }
    return null;
  }

  static clearQueue() {
    OutboxQueue.saveQueue([]);
  }

  static clear() {
    OutboxQueue.clearQueue();
  }

  static async executeSmartBundle(options = {}) {
      const currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      const includeInstructions = options.includeInstructions !== false;
      const includeProjectLibrary = options.includeProjectLibrary !== false;
      const includeAllLibrary = Boolean(options.includeAllLibrary);
      const allowedFilePaths = options.allowedFilePaths || null;
      const visibilitySetName = options.visibilitySetName || null;

      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast(`Analyzing codebase for [${currentTarget}]...`, 'info', '⚡');
      }

      let codeData = null;
      if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchAllCode) {
        codeData = await LunoApiClient.fetchAllCode(currentTarget, {
          includeProjectLibrary: includeProjectLibrary,
          includeAllLibrary: includeAllLibrary
        });
      }

      if (!codeData || !codeData.filesMap || Object.keys(codeData.filesMap).length === 0) {
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast(`Bundling failed: No files returned for [${currentTarget}].`, 'error', '⚠️');
        }
        return null;
      }

      const filesMap = codeData.filesMap;
      const q = OutboxQueue.queue;
      let addedCount = 0;

      // 1. Separate Protocol Instructions item with idempotency guard
      const getInst = (typeof LunoPromptInstructions !== 'undefined') &&
        (LunoPromptInstructions.getSystemInstructions || LunoPromptInstructions.assembleFullInstructions);

      if (includeInstructions && getInst) {
        const alreadyHasInstructions = q.some(it => it.type === 'instructions' || it.title.includes('Protocol Instructions'));
        if (!alreadyHasInstructions) {
          const instText = getInst.call(LunoPromptInstructions).trim() + '\n';
          OutboxQueue.addBundle('📋 Modular Protocol Instructions', instText, {
            priority: 'high',
            type: 'instructions',
            meta: { category: 'instructions' }
          });
          addedCount++;
        }
      }

      // Index all files currently present in any existing Outbox item to prevent duplicate payloads
      const existingQueuedFiles = new Set();
      q.forEach(it => {
        if (Array.isArray(it.files)) {
          it.files.forEach(fp => {
            const clean = (typeof fp === 'string' ? fp : ((fp && (fp.filePath || fp.name)) || '')).replace(/\\/g, '/').replace(/^\/+/, '');
            if (clean) existingQueuedFiles.add(clean);
          });
        }
      });

      const libraryFiles = {};
      const projectFiles = {};

      Object.keys(filesMap).forEach(fPath => {
        const cleanPath = fPath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (Array.isArray(allowedFilePaths) && allowedFilePaths.length > 0) {
          const matchesSet = allowedFilePaths.some(p => {
            const cp = p.replace(/\\/g, '/').replace(/^\/+/, '');
            return cleanPath === cp || cleanPath.endsWith('/' + cp) || cp.endsWith('/' + cleanPath);
          });
          if (!matchesSet) return;
        }

        if (cleanPath.startsWith('Library/') || cleanPath.toLowerCase().includes('/library/')) {
          libraryFiles[cleanPath] = filesMap[fPath];
        } else {
          projectFiles[cleanPath] = filesMap[fPath];
        }
      });

      const formatFilesContainer = (fMap) => {
        const keys = Object.keys(fMap);
        if (keys.length === 0) return '';
        let out = '```html\n';
        keys.forEach(fp => {
          const content = fMap[fp];
          const isStyle = fp.endsWith('.css');
          const isHtml = fp.endsWith('.html');
          const isJson = fp.endsWith('.json');
          const tag = isStyle ? 'style' : (isHtml ? 'template' : (isJson ? 'script type="application/json"' : 'script'));
          const closingTag = isStyle ? 'style' : (isHtml ? 'template' : 'script');
          out += `<${tag} data-file="${fp}">\n${content}\n<\/${closingTag}>\n\n`;
        });
        out += '```\n';
        return out;
      };

      // 2. Shared Library Bundle with smart deduplication
      const libKeys = Object.keys(libraryFiles);
      if (libKeys.length > 0) {
        const newLibKeys = libKeys.filter(k => !existingQueuedFiles.has(k));
        const dupLibCount = libKeys.length - newLibKeys.length;

        if (dupLibCount > 0 && typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast(`Deduplicated: ${dupLibCount} shared library file(s) already in Outbox`, 'info', '🛡️');
        }

        if (newLibKeys.length > 0) {
          const filteredLibFiles = {};
          newLibKeys.forEach(k => { filteredLibFiles[k] = libraryFiles[k]; });
          const libPayload = formatFilesContainer(filteredLibFiles);
          OutboxQueue.addBundle(`📚 Shared Library Code [${currentTarget}] (${newLibKeys.length} files)`, libPayload, {
            priority: 'normal',
            type: 'library',
            files: newLibKeys,
            meta: { category: 'library', project: currentTarget }
          });
          addedCount++;
          newLibKeys.forEach(k => existingQueuedFiles.add(k));
        }
      }

      // 3. Project Source Bundle with smart deduplication
      const projKeys = Object.keys(projectFiles);
      if (projKeys.length > 0) {
        const newProjKeys = projKeys.filter(k => !existingQueuedFiles.has(k));
        const dupProjCount = projKeys.length - newProjKeys.length;

        if (dupProjCount > 0 && typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast(`Deduplicated: ${dupProjCount} project file(s) already in Outbox`, 'info', '🛡️');
        }

        if (newProjKeys.length > 0) {
          const filteredProjFiles = {};
          newProjKeys.forEach(k => { filteredProjFiles[k] = projectFiles[k]; });
          const setNotice = visibilitySetName ? ` [Set: ${visibilitySetName}]` : ` [Full]`;
          const projPayload = formatFilesContainer(filteredProjFiles);
          OutboxQueue.addBundle(`📁 Project Source: ${currentTarget}${setNotice} (${newProjKeys.length} files)`, projPayload, {
            priority: 'high',
            type: 'project',
            files: newProjKeys,
            meta: { category: 'project', project: currentTarget, visibilitySet: visibilitySetName }
          });
          addedCount++;
        }
      }

      if (addedCount > 0 && typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast(`Added ${addedCount} bundle item(s) to Outbox!`, 'success', '📦');
      }

      return addedCount;
    }
  static copyPackageToClipboard(targetIdOrCategory = 'all') {
    const q = OutboxQueue.queue;
    if (!q || q.length === 0) {
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast('Outbox is empty. Type a prompt, dictate notes, or bundle code first.', 'info', 'ℹ️');
      } else {
        alert('Outbox is empty. Type a prompt, dictate notes, or bundle code first.');
      }
      return false;
    }

    let itemsToCopy = [];
    let isSingleItem = false;
    const singleTarget = q.find(it => it.id === targetIdOrCategory);

    if (singleTarget) {
      itemsToCopy = [singleTarget];
      isSingleItem = true;
    } else {
      itemsToCopy = [...q].sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0));
    }

    let compiled = '';
    if (isSingleItem) {
      compiled = String(singleTarget.payload || '').trim();
    } else {
      itemsToCopy.forEach((item, idx) => {
        compiled += `\n<!-- ============================================================ -->\n`;
        compiled += `<!-- ITEM ${idx + 1} OF ${itemsToCopy.length}: ${item.title} -->\n`;
        compiled += `<!-- ============================================================ -->\n\n`;
        compiled += String(item.payload || '').trim() + '\n\n';
      });
      compiled = compiled.trim();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(compiled);
      const label = isSingleItem ? `"${singleTarget.title}"` : `Outbox package (${itemsToCopy.length} item${itemsToCopy.length === 1 ? '' : 's'})`;
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast(`✓ Copied ${label} to clipboard!`, 'success', '📋');
      } else {
        alert(`✓ Copied ${label} to clipboard!`);
      }

      if (typeof OutboxClearBanner !== 'undefined' && typeof OutboxClearBanner.showClearCountdownBanner === 'function') {
        OutboxClearBanner.showClearCountdownBanner(10000, isSingleItem ? singleTarget.id : null);
      }
      return true;
    }
    return false;
  }

  static subscribe(fn) {
    OutboxQueue._listeners.add(fn);
    return () => OutboxQueue._listeners.delete(fn);
  }

  static _notify() {
    const q = OutboxQueue.queue;
    OutboxQueue._listeners.forEach(fn => {
      try { fn(q); } catch (e) {}
    });
  }
}

globalThis.OutboxQueue = OutboxQueue;
if (typeof module !== 'undefined' && module.exports) module.exports = OutboxQueue;