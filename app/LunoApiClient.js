class LunoApiClient {
  constructor() {}

  static isStaticMode() {
      if (LunoApiClient.getExecTargetHost && LunoApiClient.getExecTargetHost()) {
        return false;
      }
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
      var targetHost = LunoApiClient.getExecTargetHost ? LunoApiClient.getExecTargetHost() : '';
      var isActuallyStatic = (typeof LunoFileSystem !== 'undefined' && typeof LunoFileSystem.isStaticHosting === 'function')
        ? LunoFileSystem.isStaticHosting()
        : false;

      if (targetHost && typeof url === 'string' && url.startsWith('/api/') && !url.startsWith('/api/peer/')) {
        var cleanHost = targetHost.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        var hostWithPort = cleanHost.includes(':') ? cleanHost : (cleanHost + ':8080');

        if (isActuallyStatic) {
          const directRes = await fetch('http://' + hostWithPort + url, options);
          const directText = await directRes.text();
          const directTrim = directText.trim();
          if (directTrim.startsWith('<') || directTrim.startsWith('<!DOCTYPE') || directTrim.startsWith('<html')) {
            throw new Error('Endpoint returned HTML instead of JSON (' + directRes.status + ') for: ' + url);
          }
          return JSON.parse(directText);
        }

        const relayRes = await fetch('/api/peer/relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
          body: JSON.stringify({
            targetHost: hostWithPort,
            path: url,
            method: (options && options.method) || 'GET',
            body: (options && options.body) || null
          })
        });
        const relayText = await relayRes.text();
        const parsedRelay = JSON.parse(relayText);
        if (!parsedRelay.success && parsedRelay.error && parsedRelay.data === undefined) {
          throw new Error('Peer Relay [' + hostWithPort + ']: ' + parsedRelay.error);
        }
        return parsedRelay.data !== undefined ? parsedRelay.data : parsedRelay;
      }

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
        return { status: 'online', mode: 'indexedDb-static', rootDir: 'Project Root', version: 'v3.8.0' };
      }
      try {
        return await LunoApiClient.safeJsonFetch('/api/ping');
      } catch(e) {
        return { status: 'offline', mode: 'indexedDb-static', rootDir: 'Project Root', version: 'v3.8.0' };
      }
  }

  static async fetchProjectsList() {
      if (LunoApiClient.isStaticMode()) {
        const adapter = LunoFileSystem.getAdapter();
        let idbProjects = [];
        if (adapter && adapter.listProjects) {
          try {
            const res = await adapter.listProjects();
            idbProjects = (res && res.projects) || [];
          } catch (e) {}
        }

        const catalog = [
          { name: 'Portal', version: '2.0.0', description: 'Public Portal, Partial Document Composer & In-Place SPA' },
          { name: 'Opus', version: '1.4.0', description: '4-Quadrant Master Living Navigation Portal' },
          { name: 'HomeSetup', version: '2.5.0', description: 'Multi-Node Fleet & Universal Speech Dossier' },
          { name: 'Comments', version: '1.1.0', description: 'Federated Comments Engine & Community Oracle' },
          { name: 'CadPlan', version: '1.0.0', description: 'Master CAD Specification & 3D AccuDraw Lab' },
          { name: 'QuoraToys', version: '1.0.0', description: 'Kinetic Curve & Image Markup Studio' },
          { name: 'accuCad', version: '1.0.0', description: 'Computer-aided drafting constraint system' },
          { name: 'accudraw', version: '1.0.0', description: '30-Year Historical Archive & Patents' },
          { name: 'situation', version: '1.0.0', description: 'Executive career dossier and valuation portfolio' },
          { name: 'ValuationOfAccudraw', version: '1.0.0', description: 'Forensic enterprise valuation counterfactuals' },
          { name: 'EconomicsOfAutomation', version: '1.0.0', description: 'Interactive visual essay and economics simulator' },
          { name: 'JobsAndAI', version: '1.0.0', description: 'Automation horizon empirical analysis' },
          { name: 'Luno', version: '3.8.0', description: 'Luno Workspace cockpit core' },
          { name: 'Library', isLibrary: true, version: '1.0.0', description: 'Central shared dependencies hub' }
        ];

        const mergedMap = new Map();
        catalog.forEach(p => mergedMap.set(p.name, p));
        idbProjects.forEach(p => {
          if (!mergedMap.has(p.name)) {
            mergedMap.set(p.name, Object.assign({ version: '1.0.0', description: 'Custom browser project' }, p));
          }
        });

        return { success: true, projects: Array.from(mergedMap.values()) };
      }

      try {
        return await LunoApiClient.safeJsonFetch('/api/projects/list');
      } catch (e) {
        const adapter = (typeof LunoFileSystem !== 'undefined') ? LunoFileSystem.getAdapter() : null;
        if (adapter && adapter.listProjects) return await adapter.listProjects();
        return { success: true, projects: [{ name: 'Portal' }, { name: 'Luno' }, { name: 'Library' }] };
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
        let effectiveProject = project;

        const firstSegment = cleanFile.split('/')[0];
        const knownSiblings = [
          'Comments', 'Community', 'Voting', 'CadPlan', 'Luno', 'Library',
          'vibes', 'aardvarkBookmarklet', 'AardvarkExtension', 'AardvarkPlaylist', 'AlphabetGame',
          'Basic3D', 'BasicsWithDialogBox', 'BookmarkletWorkshop', 'BulbAndButton', 'Calculator',
          'Es6Converter', 'LegoDetective', 'LunoParser', 'LunoTests', 'MathStorm', 'Penrose', 'PleasureAndPain',
          'RobotDividend', 'SvgStudio', 'TriBlob', 'ValuationOfAccudraw', 'accuCad', 'accudraw',
          'guessTheNoteGame', 'situation', 'squircle', 'Squircle', 'teacup',
          'TouchController', 'CompassApp', 'KeyCommandApp', 'HomeSetup', 'Opus', 'JobsAndAI', 'QuoraToys'
        ];

        if (knownSiblings.includes(firstSegment)) {
          effectiveProject = firstSegment;
        }

        if (LunoApiClient.isStaticMode()) {
          const adapter = LunoFileSystem.getAdapter();
          if (adapter && adapter.read) {
            const r = await adapter.read(cleanFile, effectiveProject);
            if (r.success) {
              if (cleanFile.endsWith('luno.json') && effectiveProject && effectiveProject !== 'Luno') {
                try {
                  const meta = JSON.parse(r.content);
                  if (meta.name === 'Luno' || (meta.entrypoint && meta.entrypoint.class === 'ClientApp')) {
                    // Discard poisoned manifest
                  } else {
                    return r;
                  }
                } catch(e) {
                  return r;
                }
              } else {
                return r;
              }
            }
          }
          try {
            const fetchUrl = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.resolveStaticUrl)
              ? LunoFileSystem.resolveStaticUrl(cleanFile, effectiveProject)
              : ('./' + cleanFile);

            let res = await fetch(fetchUrl);
            const isLib = cleanFile.startsWith('Library/') || cleanFile.startsWith('library/') || effectiveProject === 'Library';

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
                await adapter.write(cleanFile, content, effectiveProject);
              }
              return { success: true, content, size: content.length };
            }
          } catch(fetchErr) {}
          return { success: false, error: 'File not found in storage: ' + cleanFile };
        }

        const pParam = effectiveProject ? ('&project=' + encodeURIComponent(effectiveProject)) : '';
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

        // Strip redundant projectName/ prefix so path resolutions remain clean
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
          if (adapter && Array.isArray(payloadObj.files)) {
            if (typeof adapter.writeBatch === 'function') {
              const res = await adapter.writeBatch(payloadObj.files, targetProj);
              modified = res.count || 0;
            } else if (adapter.write) {
              for (const file of payloadObj.files) {
                if (file.filePath && file.content !== undefined) {
                  await adapter.write(file.filePath, file.content, targetProj);
                  modified++;
                }
              }
            }
          }
          return {
            success: true,
            count: modified,
            modifiedCount: modified,
            llmFeedback: '✅ Saved ' + modified + ' file(s) cleanly to browser IndexedDB storage.'
          };
        }

        const pParam = targetProj ? ('?project=' + encodeURIComponent(targetProj)) : '';
        return await LunoApiClient.safeJsonFetch('/api/save' + pParam, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Luno-Client': '1' },
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

  static async fetchFileDiff(filePath, project = '') {
      const cleanFile = LunoApiClient.cleanPath(filePath);
      const proj = project || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

      if (!LunoApiClient.isStaticMode()) {
        try {
          const res = await LunoApiClient.safeJsonFetch('/api/git/file-diff?path=' + encodeURIComponent(cleanFile) + '&project=' + encodeURIComponent(proj));
          if (res && res.success && res.hasGit) {
            return res;
          }
        } catch (e) {}
      }

      // Static mode / fallback to LunoHistoryManager
      if (typeof LunoHistoryManager !== 'undefined' && typeof LunoHistoryManager.getAllRecords === 'function') {
        try {
          const records = await LunoHistoryManager.getAllRecords(proj);
          const match = records.find(function(r) {
            if (!r || !r.filePath) return false;
            var norm1 = r.filePath.replace(/\\/g, '/');
            var norm2 = cleanFile.replace(/\\/g, '/');
            return norm1 === norm2 || norm1.endsWith('/' + norm2) || norm2.endsWith('/' + norm1);
          });

          if (match && match.oldContent !== undefined) {
            return {
              success: true,
              hasGit: false,
              isModified: (match.oldContent !== match.newContent),
              oldContent: match.oldContent,
              newContent: match.newContent,
              timestamp: match.timestamp
            };
          }
        } catch (hErr) {}
      }

      return { success: true, hasGit: false, isModified: false };
    }

  static async fetchGitLog(project = '', filePath = '') {
      const proj = project || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      const cleanFile = filePath ? LunoApiClient.cleanPath(filePath) : '';

      if (!LunoApiClient.isStaticMode()) {
        try {
          const query = '?project=' + encodeURIComponent(proj) + (cleanFile ? ('&file=' + encodeURIComponent(cleanFile)) : '');
          return await LunoApiClient.safeJsonFetch('/api/git/log' + query);
        } catch (e) {}
      }

      return { success: true, hasGit: false, commits: [] };
    }

  static async fetchGitCommit(hash, project = '', filePath = '') {
      const proj = project || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      const cleanFile = filePath ? LunoApiClient.cleanPath(filePath) : '';

      if (!LunoApiClient.isStaticMode()) {
        try {
          const query = '?hash=' + encodeURIComponent(hash) + '&project=' + encodeURIComponent(proj) + (cleanFile ? ('&file=' + encodeURIComponent(cleanFile)) : '');
          return await LunoApiClient.safeJsonFetch('/api/git/commit' + query);
        } catch (e) {}
      }

      return { success: false, error: 'Git inspection unavailable in this environment' };
    }

  static getExecTargetHost() {
      try {
        if (typeof localStorage !== 'undefined') {
          return (localStorage.getItem('luno_exec_target_host') || '').trim();
        }
      } catch (e) {}
      return '';
    }

  static setExecTargetHost(host) {
      var clean = (host || '').trim();
      try {
        if (typeof localStorage !== 'undefined') {
          if (clean) localStorage.setItem('luno_exec_target_host', clean);
          else localStorage.removeItem('luno_exec_target_host');
        }
      } catch (e) {}
      return clean;
    }
}

globalThis.LunoApiClient = LunoApiClient;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoApiClient;