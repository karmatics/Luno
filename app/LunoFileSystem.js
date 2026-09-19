class LunoIndexedDbAdapter {
  static DB_NAME = 'luno_vfs_database';
  static STORE_FILES = 'files';
  static STORE_PROJECTS = 'projects';
  static db = null;
  static manifestCache = new Map();

  static toPascalCase(str) {
    if (!str || typeof str !== 'string') return 'App';
    var clean = str.trim().replace(/[-_]+/g, ' ').replace(/[^\w\s]/g, '');
    var parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'App';
    return parts.map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join('');
  }

  static async getDb() {
    if (LunoIndexedDbAdapter.db) return LunoIndexedDbAdapter.db;
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not available in this environment.'));
      }
      const req = indexedDB.open(LunoIndexedDbAdapter.DB_NAME, 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(LunoIndexedDbAdapter.STORE_FILES)) {
          const fileStore = db.createObjectStore(LunoIndexedDbAdapter.STORE_FILES, { keyPath: 'id' });
          fileStore.createIndex('project', 'project', { unique: false });
          fileStore.createIndex('path', 'path', { unique: false });
        }
        if (!db.objectStoreNames.contains(LunoIndexedDbAdapter.STORE_PROJECTS)) {
          db.createObjectStore(LunoIndexedDbAdapter.STORE_PROJECTS, { keyPath: 'name' });
        }
      };
      req.onsuccess = (e) => {
        LunoIndexedDbAdapter.db = e.target.result;
        resolve(LunoIndexedDbAdapter.db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  static async loadProjectManifest(projectName) {
    const proj = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    if (LunoIndexedDbAdapter.manifestCache.has(proj)) {
      return LunoIndexedDbAdapter.manifestCache.get(proj);
    }

    try {
      const lunoUrl = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.resolveStaticUrl)
        ? LunoFileSystem.resolveStaticUrl('luno.json', proj)
        : './luno.json';
      const res = await fetch(lunoUrl);
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        if (!trimmed.startsWith('<') && !trimmed.startsWith('<!DOCTYPE')) {
          const meta = JSON.parse(text);
          const discovered = new Set(['luno.json', 'index.html']);

          [].concat(meta.main || []).forEach(p => discovered.add(p));
          [].concat(meta.styles || []).forEach(p => discovered.add(p));
          [].concat(meta.docs || []).forEach(p => discovered.add(p));
          [].concat(meta.files || []).forEach(p => discovered.add(p));
          [].concat(meta.library || []).forEach(p => discovered.add('library/' + p.replace(/^(?:Library|library)\//, '')));

          if (meta.entrypoint && meta.entrypoint.file) discovered.add(meta.entrypoint.file);

          const items = Array.from(discovered).map(filePath => {
            const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(new RegExp('^' + proj + '/'), '');
            return {
              name: cleanPath.split('/').pop(),
              path: cleanPath,
              size: 1024,
              mtimeMs: Date.now()
            };
          });

          if (items.length > 0) {
            LunoIndexedDbAdapter.manifestCache.set(proj, items);
            return items;
          }
        }
      }
    } catch(e) {}

    return null;
  }

  static normalizeKey(filePath, projectName) {
    const proj = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    let clean = (filePath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (clean.startsWith('Luno Workspace/')) clean = clean.slice(15).trim();
    if (clean.startsWith('./')) clean = clean.slice(2).trim();

    if (clean.startsWith(proj + '/')) {
      clean = clean.slice(proj.length + 1);
    }
    return { id: proj + '::' + clean, project: proj, path: clean };
  }

  static async read(filePath, projectName) {
    const db = await LunoIndexedDbAdapter.getDb();
    const key = LunoIndexedDbAdapter.normalizeKey(filePath, projectName);
    return new Promise((resolve) => {
      const tx = db.transaction(LunoIndexedDbAdapter.STORE_FILES, 'readonly');
      const req = tx.objectStore(LunoIndexedDbAdapter.STORE_FILES).get(key.id);
      req.onsuccess = () => {
        if (req.result) {
          resolve({ success: true, content: req.result.content, size: req.result.content.length });
        } else {
          resolve({ success: false, error: 'File not found in IndexedDB: ' + key.path });
        }
      };
      req.onerror = () => resolve({ success: false, error: 'Read error' });
    });
  }

  static async write(filePath, content, projectName) {
    const db = await LunoIndexedDbAdapter.getDb();
    const key = LunoIndexedDbAdapter.normalizeKey(filePath, projectName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction([LunoIndexedDbAdapter.STORE_FILES, LunoIndexedDbAdapter.STORE_PROJECTS], 'readwrite');
      const fileStore = tx.objectStore(LunoIndexedDbAdapter.STORE_FILES);
      const projStore = tx.objectStore(LunoIndexedDbAdapter.STORE_PROJECTS);

      fileStore.put({
        id: key.id,
        project: key.project,
        path: key.path,
        content: content !== undefined ? content : '',
        size: content ? content.length : 0,
        updatedAt: Date.now()
      });

      projStore.put({
        name: key.project,
        updatedAt: Date.now()
      });

      tx.oncomplete = () => resolve({ success: true, path: key.path, project: key.project });
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  static async list(targetPath = '', projectName = '') {
    const db = await LunoIndexedDbAdapter.getDb();
    const proj = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

    return new Promise(async (resolve) => {
      const tx = db.transaction(LunoIndexedDbAdapter.STORE_FILES, 'readonly');
      const store = tx.objectStore(LunoIndexedDbAdapter.STORE_FILES);
      const index = store.index('project');
      const req = index.getAll(proj);

      req.onsuccess = async () => {
        let files = req.result || [];

        if (files.length === 0 && LunoFileSystem.isStaticHosting()) {
          const manifestItems = await LunoIndexedDbAdapter.loadProjectManifest(proj);
          if (Array.isArray(manifestItems) && manifestItems.length > 0) {
            const cleanTarget = (targetPath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
            const filtered = cleanTarget
              ? manifestItems.filter(f => (f.path || f.relativePath || '').startsWith(cleanTarget))
              : manifestItems;

            const items = filtered.map(f => {
              const p = f.path || f.relativePath || f.name;
              return {
                name: f.name || p.split('/').pop(),
                relativePath: p,
                isDirectory: false,
                size: f.size || 0,
                mtimeMs: f.mtimeMs || Date.now()
              };
            });
            return resolve({ success: true, items });
          }
        }

        const cleanTarget = (targetPath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
        const filtered = cleanTarget
          ? files.filter(f => f.path.startsWith(cleanTarget))
          : files;

        const items = filtered.map(f => ({
          name: f.path.split('/').pop(),
          relativePath: f.path,
          isDirectory: false,
          size: f.size || 0,
          mtimeMs: f.updatedAt || Date.now()
        }));
        resolve({ success: true, items });
      };
      req.onerror = () => resolve({ success: false, items: [] });
    });
  }

  static async listProjects() {
    const db = await LunoIndexedDbAdapter.getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(LunoIndexedDbAdapter.STORE_PROJECTS, 'readonly');
      const req = tx.objectStore(LunoIndexedDbAdapter.STORE_PROJECTS).getAll();
      req.onsuccess = () => {
        const projs = req.result || [];
        const results = projs.map(p => ({
          name: p.name,
          version: '1.0.0',
          description: 'Local IndexedDB application',
          fileCount: 0
        }));
        if (results.length === 0) {
          results.push({ name: 'Luno', version: '1.0.0', description: 'Workspace core', fileCount: 0 });
        }
        resolve({ success: true, projects: results });
      };
      req.onerror = () => resolve({ success: false, projects: [] });
    });
  }

  static async fork(sourceProject, newProject) {
    const db = await LunoIndexedDbAdapter.getDb();
    const filesRes = await LunoIndexedDbAdapter.list('', sourceProject);
    const sourceFiles = filesRes.items || [];

    const tx = db.transaction([LunoIndexedDbAdapter.STORE_FILES, LunoIndexedDbAdapter.STORE_PROJECTS], 'readwrite');
    const fileStore = tx.objectStore(LunoIndexedDbAdapter.STORE_FILES);
    const projStore = tx.objectStore(LunoIndexedDbAdapter.STORE_PROJECTS);

    const newIdentifier = LunoIndexedDbAdapter.toPascalCase(newProject);
    let oldIdentifier = LunoIndexedDbAdapter.toPascalCase(sourceProject);

    const sourceMetaRaw = await new Promise(res => {
      fileStore.get(sourceProject + '::luno.json').onsuccess = (e) => res(e.target.result ? e.target.result.content : '');
    });

    let sourceMeta = {};
    if (sourceMetaRaw) {
      try {
        sourceMeta = JSON.parse(sourceMetaRaw);
        if (sourceMeta.entrypoint && sourceMeta.entrypoint.class) {
          oldIdentifier = sourceMeta.entrypoint.class;
        } else if (sourceMeta.mainClass) {
          oldIdentifier = sourceMeta.mainClass;
        }
      } catch (e) {}
    }

    const renamedFilesMap = {};
    let copiedCount = 0;

    for (const f of sourceFiles) {
      const oldKey = sourceProject + '::' + f.relativePath;
      const fileData = await new Promise(res => {
        fileStore.get(oldKey).onsuccess = (e) => res(e.target.result);
      });

      if (!fileData) continue;

      let targetRelPath = f.relativePath;
      const pathParts = targetRelPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const nameParts = fileName.split('.');
      const baseName = nameParts[0];
      const ext = nameParts.slice(1).join('.');

      if (baseName === oldIdentifier && ext) {
        pathParts[pathParts.length - 1] = newIdentifier + '.' + ext;
        targetRelPath = pathParts.join('/');
        renamedFilesMap[f.relativePath] = targetRelPath;
      }

      const newKey = newProject + '::' + targetRelPath;
      let newContent = fileData.content || '';

      const isTextFile = /\.(js|mjs|json|html|htm|css|md|txt|svg)$/i.test(targetRelPath);
      if (isTextFile && typeof newContent === 'string') {
        if (oldIdentifier && newIdentifier && oldIdentifier !== newIdentifier) {
          const classWordRegex = new RegExp('\\b' + oldIdentifier + '\\b', 'g');
          newContent = newContent.replace(classWordRegex, newIdentifier);
        }
        const oldPrefixRegex = new RegExp('\\b' + sourceProject + '/', 'g');
        newContent = newContent.replace(oldPrefixRegex, newProject + '/');
      }

      if (targetRelPath === 'luno.json') {
        try {
          const meta = JSON.parse(newContent);
          meta.name = newProject;
          meta.description = meta.description
            ? (meta.description + ' (Forked from ' + sourceProject + ')')
            : ('Forked application from ' + sourceProject);
          meta.processedCountSinceCheckpoint = 0;
          meta.lastCheckpointTime = new Date().toISOString();
          meta.pendingCheckpointDescription = 'Clean fork initialized from ' + sourceProject;

          if (meta.entrypoint && typeof meta.entrypoint === 'object') {
            meta.entrypoint.class = newIdentifier;
            if (meta.entrypoint.file) {
              for (const [oldP, newP] of Object.entries(renamedFilesMap)) {
                if (meta.entrypoint.file.endsWith(oldP)) {
                  meta.entrypoint.file = meta.entrypoint.file.replace(new RegExp(oldP + '$'), newP);
                }
              }
            }
          }
          if (meta.mainClass) {
            meta.mainClass = newIdentifier;
          }

          if (Array.isArray(meta.main)) {
            meta.main = meta.main.map(p => {
              let updated = p;
              for (const [oldP, newP] of Object.entries(renamedFilesMap)) {
                if (updated.endsWith(oldP)) updated = updated.replace(new RegExp(oldP + '$'), newP);
              }
              return updated;
            });
          }

          newContent = JSON.stringify(meta, null, 2) + '\n';
        } catch (e) {}
      }

      fileStore.put({
        id: newKey,
        project: newProject,
        path: targetRelPath,
        content: newContent,
        size: newContent.length,
        updatedAt: Date.now()
      });
      copiedCount++;
    }

    projStore.put({
      name: newProject,
      updatedAt: Date.now()
    });

    return {
      success: true,
      project: newProject,
      sourceProject: sourceProject,
      entrypointClass: newIdentifier,
      oldEntrypointClass: oldIdentifier,
      renamedFilesCount: Object.keys(renamedFilesMap).length,
      copiedFilesCount: copiedCount
    };
  }
}

class LunoWebFsApiAdapter {
  static dirHandle = null;

  static async pickDirectory() {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) {
      throw new Error('File System Access API is not supported in this browser.');
    }
    LunoWebFsApiAdapter.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return LunoWebFsApiAdapter.dirHandle;
  }

  static async getFileHandle(filePath, create = false) {
    if (!LunoWebFsApiAdapter.dirHandle) {
      await LunoWebFsApiAdapter.pickDirectory();
    }
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    let curr = LunoWebFsApiAdapter.dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      curr = await curr.getDirectoryHandle(parts[i], { create });
    }
    return await curr.getFileHandle(parts[parts.length - 1], { create });
  }

  static async read(filePath) {
    try {
      const fileHandle = await LunoWebFsApiAdapter.getFileHandle(filePath, false);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return { success: true, content, size: file.size };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  static async write(filePath, content) {
    try {
      const fileHandle = await LunoWebFsApiAdapter.getFileHandle(filePath, true);
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, path: filePath };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  static async list(targetPath = '', projectName = '') {
    try {
      if (!LunoWebFsApiAdapter.dirHandle) {
        await LunoWebFsApiAdapter.pickDirectory();
      }
      const proj = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      const rootDirHandle = LunoWebFsApiAdapter.dirHandle;
      let targetDirHandle = rootDirHandle;

      if (proj) {
        try { targetDirHandle = await rootDirHandle.getDirectoryHandle(proj, { create: false }); } catch(e) {}
      }

      const items = [];
      async function scanDir(handle, relPath = '') {
        const it = handle.values();
        let step = await it.next();
        while (!step.done) {
          const entry = step.value;
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && !entry.name.endsWith('.bak')) {
            const currentRel = relPath ? (relPath + '/' + entry.name) : entry.name;
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              items.push({
                name: entry.name,
                relativePath: currentRel,
                isDirectory: false,
                size: file.size,
                mtimeMs: file.lastModified
              });
            } else if (entry.kind === 'directory') {
              await scanDir(entry, currentRel);
            }
          }
          step = await it.next();
        }
      }

      await scanDir(targetDirHandle, '');
      return { success: true, items: items };
    } catch(err) {
      return { success: false, items: [], error: err.message };
    }
  }

  static async listProjects() {
    try {
      if (!LunoWebFsApiAdapter.dirHandle) {
        await LunoWebFsApiAdapter.pickDirectory();
      }
      const projects = [];
      const it = LunoWebFsApiAdapter.dirHandle.values();
      let step = await it.next();
      while (!step.done) {
        const entry = step.value;
        if (entry.kind === 'directory' && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          projects.push({
            name: entry.name,
            version: '1.0.0',
            description: 'Web File System project',
            fileCount: 0
          });
        }
        step = await it.next();
      }
      if (projects.length === 0) {
        projects.push({ name: 'Luno', version: '1.0.0', description: 'Workspace core', fileCount: 0 });
      }
      return { success: true, projects: projects };
    } catch(err) {
      return { success: false, projects: [], error: err.message };
    }
  }

  static async fork(sourceProject, newProject) {
    if (!LunoWebFsApiAdapter.dirHandle) {
      await LunoWebFsApiAdapter.pickDirectory();
    }
    const rootHandle = LunoWebFsApiAdapter.dirHandle;
    const sourceHandle = await rootHandle.getDirectoryHandle(sourceProject, { create: false });
    const targetHandle = await rootHandle.getDirectoryHandle(newProject, { create: true });

    const toPascal = (typeof LunoIndexedDbAdapter !== 'undefined' && LunoIndexedDbAdapter.toPascalCase)
      ? LunoIndexedDbAdapter.toPascalCase
      : (str) => (str || 'App').replace(/[-_]+/g, ' ').replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'App';

    const newIdentifier = toPascal(newProject);
    let oldIdentifier = toPascal(sourceProject);

    let sourceMeta = {};
    try {
      const metaHandle = await sourceHandle.getFileHandle('luno.json');
      const metaFile = await metaHandle.getFile();
      sourceMeta = JSON.parse(await metaFile.text());
      if (sourceMeta.entrypoint && sourceMeta.entrypoint.class) {
        oldIdentifier = sourceMeta.entrypoint.class;
      } else if (sourceMeta.mainClass) {
        oldIdentifier = sourceMeta.mainClass;
      }
    } catch(e) {}

    let copiedCount = 0;
    const renamedFilesMap = {};

    async function copyDir(srcH, destH, relPath = '') {
      const it = srcH.values();
      let step = await it.next();
      while (!step.done) {
        const entry = step.value;
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && !entry.name.endsWith('.bak')) {
          if (entry.kind === 'directory') {
            const subDest = await destH.getDirectoryHandle(entry.name, { create: true });
            await copyDir(entry, subDest, relPath ? (relPath + '/' + entry.name) : entry.name);
          } else if (entry.kind === 'file') {
            const file = await entry.getFile();
            let content = await file.text();
            let fileName = entry.name;
            const nameParts = fileName.split('.');
            const baseName = nameParts[0];
            const ext = nameParts.slice(1).join('.');

            if (baseName === oldIdentifier && ext) {
              fileName = newIdentifier + '.' + ext;
              const srcRel = relPath ? (relPath + '/' + entry.name) : entry.name;
              const destRel = relPath ? (relPath + '/' + fileName) : fileName;
              renamedFilesMap[srcRel] = destRel;
            }

            const isText = /\.(js|mjs|json|html|htm|css|md|txt|svg)$/i.test(fileName);
            if (isText) {
              if (oldIdentifier && newIdentifier && oldIdentifier !== newIdentifier) {
                content = content.replace(new RegExp('\\b' + oldIdentifier + '\\b', 'g'), newIdentifier);
              }
              content = content.replace(new RegExp('\\b' + sourceProject + '/', 'g'), newProject + '/');
            }

            if (fileName === 'luno.json') {
              try {
                const meta = JSON.parse(content);
                meta.name = newProject;
                meta.description = meta.description
                  ? (meta.description + ' (Forked from ' + sourceProject + ')')
                  : ('Forked application from ' + sourceProject);
                meta.processedCountSinceCheckpoint = 0;
                meta.lastCheckpointTime = new Date().toISOString();
                meta.pendingCheckpointDescription = 'Clean fork initialized from ' + sourceProject;

                if (meta.entrypoint && typeof meta.entrypoint === 'object') {
                  meta.entrypoint.class = newIdentifier;
                  if (meta.entrypoint.file) {
                    for (const [oldP, newP] of Object.entries(renamedFilesMap)) {
                      if (meta.entrypoint.file.endsWith(oldP)) {
                        meta.entrypoint.file = meta.entrypoint.file.replace(new RegExp(oldP + '$'), newP);
                      }
                    }
                  }
                }
                if (meta.mainClass) meta.mainClass = newIdentifier;

                if (Array.isArray(meta.main)) {
                  meta.main = meta.main.map(p => {
                    let updated = p;
                    for (const [oldP, newP] of Object.entries(renamedFilesMap)) {
                      if (updated.endsWith(oldP)) updated = updated.replace(new RegExp(oldP + '$'), newP);
                    }
                    return updated;
                  });
                }
                content = JSON.stringify(meta, null, 2) + '\n';
              } catch(e) {}
            }

            const destFileH = await destH.getFileHandle(fileName, { create: true });
            const writable = await destFileH.createWritable();
            await writable.write(content);
            await writable.close();
            copiedCount++;
          }
        }
        step = await it.next();
      }
    }

    await copyDir(sourceHandle, targetHandle, '');

    try {
      const noJekyllH = await targetHandle.getFileHandle('.nojekyll', { create: true });
      const w = await noJekyllH.createWritable();
      await w.write('');
      await w.close();
    } catch(e) {}

    return {
      success: true,
      project: newProject,
      sourceProject: sourceProject,
      entrypointClass: newIdentifier,
      oldEntrypointClass: oldIdentifier,
      renamedFilesCount: Object.keys(renamedFilesMap).length,
      copiedFilesCount: copiedCount
    };
  }
}

class LunoFileSystem {
  constructor() {}

  static activeMode = (typeof localStorage !== 'undefined' && localStorage.getItem('lunoActiveFsMode')) || 'auto';

  static setMode(mode) {
    if (['auto', 'server', 'webFsApi', 'indexedDb'].includes(mode)) {
      LunoFileSystem.activeMode = mode;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lunoActiveFsMode', mode);
      }
    }
  }

  static isLocalNetworkHost(host, port) {
    if (!host) return false;
    const h = host.toLowerCase().trim();

    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1' || h === '[::1]') {
      return true;
    }

    if (h.startsWith('127.')) return true;
    if (h.startsWith('192.168.')) return true;
    if (h.startsWith('10.')) return true;
    if (h.startsWith('169.254.')) return true;

    if (h.startsWith('172.')) {
      const parts = h.split('.');
      if (parts.length >= 2) {
        const secondOctet = parseInt(parts[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
      }
    }

    if (h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.home') || h.endsWith('.internal') || h.endsWith('.localhost')) {
      return true;
    }

    const devPorts = ['8080', '8081', '8088', '3000', '5000', '8000', '5173'];
    if (port && devPorts.includes(String(port))) {
      return true;
    }

    return false;
  }

  static isStaticHosting() {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const proto = window.location.protocol || '';
        if (proto === 'file:') return true;

        const host = (window.location.hostname || '').toLowerCase();
        const port = window.location.port || '';

        if (host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('vercel.app') || host.endsWith('netlify.app')) {
          return true;
        }

        if (LunoFileSystem.isLocalNetworkHost(host, port)) {
          return false;
        }

        return true;
      }
    } catch (e) {}
    return false;
  }

  static getActiveMode() {
    if (LunoFileSystem.isStaticHosting()) {
      if (LunoFileSystem.activeMode === 'webFsApi') return 'webFsApi';
      return 'indexedDb';
    }
    if (LunoFileSystem.activeMode === 'auto') {
      return 'server';
    }
    return LunoFileSystem.activeMode;
  }

  static getAdapter() {
    const mode = LunoFileSystem.getActiveMode();
    if (mode === 'webFsApi') return LunoWebFsApiAdapter;
    if (mode === 'indexedDb') return LunoIndexedDbAdapter;
    return null;
  }

  static normalizeRelativePath(filePath, projectName) {
    if (!filePath || typeof filePath !== 'string') return '';
    let clean = filePath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (clean.startsWith('Luno Workspace/')) clean = clean.slice(15).trim();
    if (clean.startsWith('./')) clean = clean.slice(2).trim();

    const proj = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

    if (LunoFileSystem.isStaticHosting()) {
      if (clean.startsWith(proj + '/')) {
        clean = clean.slice(proj.length + 1);
      }
      if (clean.startsWith('Luno/')) {
        clean = clean.slice(5);
      }
    }
    return clean;
  }

  static resolveStaticUrl(filePath, projectName) {
      const clean = LunoFileSystem.normalizeRelativePath(filePath, projectName);
      if (!clean.startsWith('./') && !clean.startsWith('../') && !clean.startsWith('http://') && !clean.startsWith('https://')) {
        if (LunoFileSystem.isStaticHosting()) {
          const isLib = clean.startsWith('Library/') || clean.startsWith('library/') || projectName === 'Library';
          if (isLib) {
            const cleanLib = clean.replace(/^(?:Library|library)\//, '');
            const account = (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.getGithubAccount)
              ? LunoDeployEngine.getGithubAccount()
              : 'karmatics';
            return 'https://' + account.toLowerCase() + '.github.io/Library/' + cleanLib;
          }
        }
        return './' + clean;
      }
      return clean;
    }
}

globalThis.LunoIndexedDbAdapter = LunoIndexedDbAdapter;
globalThis.LunoWebFsApiAdapter = LunoWebFsApiAdapter;
globalThis.LunoFileSystem = LunoFileSystem;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LunoFileSystem, LunoIndexedDbAdapter, LunoWebFsApiAdapter };
}