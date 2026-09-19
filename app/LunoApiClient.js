class LunoApiClient {
  constructor() {}

  static isStaticMode() {
    if (typeof LunoFileSystem !== 'undefined' && typeof LunoFileSystem.isStaticHosting === 'function') {
      return LunoFileSystem.isStaticHosting();
    }
    if (typeof LunoLoader !== 'undefined' && typeof LunoLoader.isStaticHosting === 'function') {
      return LunoLoader.isStaticHosting();
    }
    return false;
  }

  static cleanPath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') return '';
    var clean = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (clean.startsWith('Luno Workspace/')) clean = clean.slice(15).trim();
    if (clean.startsWith('./')) clean = clean.slice(2).trim();
    return clean;
  }

  static async safeJsonFetch(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    const trimmed = text.trim();

    if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      throw new Error('Endpoint returned HTML document instead of JSON (' + res.status + ') for: ' + url);
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Server returned non-JSON response (' + res.status + '): ' + text.slice(0, 100));
    }
  }

  static async ping() {
    if (LunoApiClient.isStaticMode()) {
      return { status: 'online', mode: 'indexedDb-static', rootDir: 'Project Root', version: 'v3.6.7' };
    }
    try {
      return await LunoApiClient.safeJsonFetch('/api/ping');
    } catch(e) {
      return { status: 'offline', mode: 'indexedDb-static', rootDir: 'Project Root', version: 'v3.6.7' };
    }
  }

  static async fetchProjectsList() {
    if (LunoApiClient.isStaticMode()) {
      const adapter = LunoFileSystem.getAdapter();
      if (adapter && adapter.listProjects) {
        return await adapter.listProjects();
      }
    }
    try {
      return await LunoApiClient.safeJsonFetch('/api/projects/list');
    } catch(e) {
      const adapter = (typeof LunoFileSystem !== 'undefined') ? LunoFileSystem.getAdapter() : null;
      if (adapter && adapter.listProjects) return await adapter.listProjects();
      return { success: true, projects: [{ name: 'Luno' }, { name: 'Library' }] };
    }
  }

  static async fetchFsListRecursive(targetPath = '', project = '') {
    const cleanTarget = LunoApiClient.cleanPath(targetPath);
    if (LunoApiClient.isStaticMode()) {
      const adapter = LunoFileSystem.getAdapter();
      if (adapter && adapter.list) {
        return await adapter.list(cleanTarget, project);
      }
    }
    try {
      const pParam = project ? ('&project=' + encodeURIComponent(project)) : '';
      return await LunoApiClient.safeJsonFetch('/api/fs/ls?recursive=true&path=' + encodeURIComponent(cleanTarget) + pParam);
    } catch(e) {
      const adapter = (typeof LunoFileSystem !== 'undefined') ? LunoFileSystem.getAdapter() : null;
      if (adapter && adapter.list) return await adapter.list(cleanTarget, project);
      return { success: true, items: [] };
    }
  }

  static async fetchFsRead(filePath = '', project = '') {
      const cleanFile = LunoApiClient.cleanPath(filePath);
      if (LunoApiClient.isStaticMode()) {
        const adapter = LunoFileSystem.getAdapter();
        if (adapter && adapter.read) {
          const r = await adapter.read(cleanFile, project);
          if (r.success) return r;
        }
        try {
          const fetchUrl = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.resolveStaticUrl)
            ? LunoFileSystem.resolveStaticUrl(cleanFile, project)
            : ('./' + cleanFile);

          let res = await fetch(fetchUrl);
          const isLib = cleanFile.startsWith('Library/') || cleanFile.startsWith('library/') || project === 'Library';

          // Resilient fallback for library files on GitHub Pages
          if (!res.ok && isLib) {
            const cleanLib = cleanFile.replace(/^(?:Library|library)\//, '');
            const fallbackUrl = 'https://karmatics.github.io/Library/' + cleanLib;
            if (fetchUrl !== fallbackUrl) {
              res = await fetch(fallbackUrl);
            }
          }

          if (res.ok) {
            const content = await res.text();
            const trimmed = content.trim();
            const isHtmlFile = cleanFile.toLowerCase().endsWith('.html') || cleanFile.toLowerCase().endsWith('.htm');
            if (!isHtmlFile && (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html'))) {
              return { success: false, error: 'File not found: ' + cleanFile };
            }
            if (adapter && adapter.write) {
              await adapter.write(cleanFile, content, project);
            }
            return { success: true, content, size: content.length };
          }
        } catch(fetchErr) {}
        return { success: false, error: 'File not found in storage: ' + cleanFile };
      }
      const pParam = project ? ('&project=' + encodeURIComponent(project)) : '';
      return await LunoApiClient.safeJsonFetch('/api/fs/read?path=' + encodeURIComponent(cleanFile) + pParam);
    }
  static async fetchAllCode(project = '', options = {}) {
    const proj = project || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    const opts = (typeof options === 'boolean') ? { includeAllLibrary: options } : (options || {});
    const includeProjectLibrary = (opts.includeProjectLibrary !== false); // Default: include manifest-declared libraries
    const includeAllLibrary = Boolean(opts.includeAllLibrary || opts.includeLibrary);

    if (!LunoApiClient.isStaticMode()) {
      try {
        const params = [];
        if (proj) params.push('project=' + encodeURIComponent(proj));
        if (includeAllLibrary) {
          params.push('allLibrary=true');
        } else if (includeProjectLibrary) {
          params.push('projectLibrary=true');
        }
        const q = params.length > 0 ? ('?' + params.join('&')) : '';
        const data = await LunoApiClient.safeJsonFetch('/api/all-code' + q);
        if (data && data.success && data.filesMap && Object.keys(data.filesMap).length > 0) {
          return data;
        }
      } catch (serverErr) {
        console.warn('[LunoApiClient] /api/all-code fallback to manifest assembly:', serverErr.message);
      }
    }

    const manifest = [];
    const filesMap = {};

    let meta = {};
    try {
      const metaRes = await LunoApiClient.fetchFsRead('luno.json', proj);
      if (metaRes && metaRes.content) {
        meta = JSON.parse(metaRes.content);
      }
    } catch(e) {}

    const discovered = new Set(['luno.json', 'index.html']);
    [].concat(meta.main || []).forEach(p => { if (p) discovered.add(p); });
    [].concat(meta.styles || []).forEach(p => { if (p) discovered.add(p); });
    [].concat(meta.docs || []).forEach(p => { if (p) discovered.add(p); });
    [].concat(meta.files || []).forEach(p => { if (p) discovered.add(p); });
    if (meta.entrypoint && meta.entrypoint.file) discovered.add(meta.entrypoint.file);

    // Include manifest-declared library dependencies by default
    if (includeProjectLibrary || includeAllLibrary || proj.toLowerCase() === 'library') {
      [].concat(meta.library || []).forEach(p => {
        if (p) {
          const cleanLib = p.replace(/^(?:Library|library)\//, '');
          discovered.add('Library/' + cleanLib);
        }
      });
    }

    const fileList = Array.from(discovered);
    for (const rawFile of fileList) {
      const cleanRel = LunoApiClient.cleanPath(rawFile);
      const isLibFile = cleanRel.startsWith('Library/');
      const readProject = isLibFile ? 'Library' : proj;
      const readPath = isLibFile ? cleanRel.slice(8) : cleanRel;

      const readRes = await LunoApiClient.fetchFsRead(readPath, readProject);
      if (readRes && readRes.success && readRes.content !== undefined) {
        let canonicalKey = cleanRel;
        if (!canonicalKey.startsWith('Library/') && !canonicalKey.startsWith(proj + '/')) {
          canonicalKey = proj + '/' + canonicalKey;
        }
        manifest.push(canonicalKey);
        filesMap[canonicalKey] = readRes.content;
      }
    }

    return {
      success: true,
      activeProjectName: proj,
      activeRootDir: LunoApiClient.isStaticMode() ? 'IndexedDB Storage' : 'Project Root',
      manifest: manifest,
      filesMap: filesMap
    };
  }

  static async savePayload(payload, project = '') {
      let payloadObj = payload;
      if (typeof payload === 'string') {
        try { payloadObj = JSON.parse(payload); } catch (e) { payloadObj = { files: [], rawText: payload }; }
      }
      if (payloadObj && typeof payloadObj === 'object' && project) {
        payloadObj.project = project;
      }

      var targetProj = project || (payloadObj && payloadObj.project) || '';

      // Strip redundant projectName/ prefix so server path.join never creates duplicate nested folders
      if (payloadObj && Array.isArray(payloadObj.files)) {
        payloadObj.files.forEach(f => {
          if (f.filePath) {
            f.filePath = LunoApiClient.cleanPath(f.filePath);
            if (targetProj && f.filePath.startsWith(targetProj + '/')) {
              f.filePath = f.filePath.slice(targetProj.length + 1);
            }
          }
        });
      }

      if (LunoApiClient.isStaticMode()) {
        const adapter = LunoFileSystem.getAdapter();
        let modified = 0;
        if (adapter && adapter.write && Array.isArray(payloadObj.files)) {
          for (const file of payloadObj.files) {
            if (file.filePath && file.content !== undefined) {
              await adapter.write(file.filePath, file.content, targetProj);
              modified++;
            }
          }
        }
        return {
          success: true,
          count: modified,
          modifiedCount: modified,
          llmFeedback: '✅ Saved ' + modified + ' file(s) successfully.'
        };
      }

      const pParam = targetProj ? ('?project=' + encodeURIComponent(targetProj)) : '';
      return await LunoApiClient.safeJsonFetch('/api/save' + pParam, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadObj)
      });
    }
  static async forkProject(sourceProject, newProject) {
    if (LunoApiClient.isStaticMode()) {
      const adapter = LunoFileSystem.getAdapter();
      if (adapter && adapter.fork) {
        return await adapter.fork(sourceProject, newProject);
      }
    }
    return await LunoApiClient.safeJsonFetch('/api/projects/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceProject, newProjectName: newProject })
    });
  }
}

globalThis.LunoApiClient = LunoApiClient;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoApiClient;