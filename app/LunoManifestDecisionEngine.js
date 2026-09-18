class LunoManifestDecisionEngine {
  constructor() {}

  static extractStartupPaths(manifestObj) {
    const meta = manifestObj || {};
    const paths = new Set();
    const normalize = (p) => p ? p.replace(/\\/g, '/').replace(/^\/+/, '').trim() : '';

    const mainList = [].concat(meta.main || []);
    const libList = [].concat(meta.library || []);
    const fileList = [].concat(meta.files || meta.local || []);

    mainList.forEach(p => {
      const n = normalize(p);
      if (n) {
        paths.add(n);
        if (n.startsWith('Luno/')) paths.add(n.slice(5));
        else paths.add('Luno/' + n);
      }
    });

    libList.forEach(p => {
      const n = normalize(p);
      if (n) {
        paths.add(n);
        if (!n.startsWith('Library/')) paths.add('Library/' + n);
      }
    });

    fileList.forEach(p => {
      const n = normalize(p);
      if (n) {
        paths.add(n);
        if (n.startsWith('Luno/')) paths.add(n.slice(5));
        else paths.add('Luno/' + n);
      }
    });

    return paths;
  }

  static isStartupClientFile(filePath, manifestObj) {
    if (!filePath || typeof filePath !== 'string') return false;
    const norm = filePath.replace(/\\/g, '/').replace(/^\/+/, '').trim();

    if (!norm.endsWith('.js') && !norm.endsWith('.mjs')) {
      return false;
    }

    if (
      norm.startsWith('app/') ||
      norm.startsWith('Luno/app/') ||
      norm.startsWith('browser/') ||
      norm.startsWith('Luno/browser/') ||
      norm.startsWith('docs/') ||
      norm.startsWith('Luno/docs/') ||
      norm.startsWith('core/') ||
      norm.startsWith('Luno/core/') ||
      norm.startsWith('test/') ||
      norm.startsWith('Luno/test/')
    ) {
      return true;
    }

    const startupPaths = LunoManifestDecisionEngine.extractStartupPaths(manifestObj);
    if (startupPaths.has(norm) || (norm.startsWith('Luno/') && startupPaths.has(norm.slice(5)))) {
      return true;
    }

    return false;
  }

  static async processPayload(payloadObj, manifestObj, projectName = '') {
      if (!payloadObj || !Array.isArray(payloadObj.files)) {
        return payloadObj;
      }

      const targetProj = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      const patchMode = (typeof LunoSettings !== 'undefined' && LunoSettings.getPatchApplyMode)
        ? LunoSettings.getPatchApplyMode()
        : ((typeof localStorage !== 'undefined' && localStorage.getItem('luno_patch_apply_mode')) || 'direct');

      const isDirectAutoApply = (patchMode === 'direct');
      const processedFilesList = [];
      const fullFilesMap = new Map();
      const journalPatchBlocks = [];
      const patchActionsSummary = [];
      const failedPatches = [];

      for (let i = 0; i < payloadObj.files.length; i++) {
        const f = payloadObj.files[i];
        if (!f || !f.filePath) continue;

        try {
          let normPath = await LunoManifestDecisionEngine.resolveCanonicalFilePath(f.filePath, manifestObj, targetProj);

          const isSurgicalPatch = Boolean(f.methodSpec || f.action === 'patch' || f.action === 'delete');
          const isExplicitMerge = (f.action === 'merge');

          if (isExplicitMerge && (normPath.endsWith('.json') || normPath.endsWith('.jsonc'))) {
            let baseJsonContent = '';
            if (fullFilesMap.has(normPath)) {
              baseJsonContent = fullFilesMap.get(normPath);
            } else if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
              try {
                let res = await LunoApiClient.fetchFsRead(normPath, targetProj);
                if (res && res.content !== undefined) {
                  baseJsonContent = res.content;
                }
              } catch (e) {}
            }

            let existingObj = {};
            if (baseJsonContent && baseJsonContent.trim()) {
              try { existingObj = JSON.parse(baseJsonContent); } catch (e) { existingObj = {}; }
            }

            let incomingObj = {};
            try {
              incomingObj = JSON.parse(f.content || '{}');
            } catch (e) {
              throw new Error('[Luno JSON Merge Guard] Invalid JSON syntax in merge payload for "' + normPath + '": ' + e.message);
            }

            for (const [k, v] of Object.entries(incomingObj)) {
              if (v === '__luno_delete__') {
                delete existingObj[k];
              } else if (Array.isArray(v) && Array.isArray(existingObj[k])) {
                const set = new Set(existingObj[k]);
                v.forEach(item => { if (item !== '__luno_delete__') set.add(item); });
                existingObj[k] = Array.from(set);
              } else if (v && typeof v === 'object' && !Array.isArray(v) && existingObj[k] && typeof existingObj[k] === 'object' && !Array.isArray(existingObj[k])) {
                Object.assign(existingObj[k], v);
              } else {
                existingObj[k] = v;
              }
            }

            const mergedContent = JSON.stringify(existingObj, null, 2) + '\n';
            fullFilesMap.set(normPath, mergedContent);
            patchActionsSummary.push({ path: normPath, mode: 'json-merge', target: normPath, success: true });
            continue;
          }

          if (!isSurgicalPatch) {
            fullFilesMap.set(normPath, f.content || '');
            patchActionsSummary.push({ path: normPath, mode: 'full-file', target: normPath, success: true });
            continue;
          }

          let baseContent = '';
          if (fullFilesMap.has(normPath)) {
            baseContent = fullFilesMap.get(normPath);
          } else if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
            let res = await LunoApiClient.fetchFsRead(normPath, targetProj);
            if (res && res.content !== undefined) {
              baseContent = res.content;
            }
          }

          if (!baseContent || !baseContent.trim()) {
            throw new Error('[Luno AST Guard] Cannot surgically patch "' + (f.methodSpec || normPath) + '": Base file "' + normPath + '" was not found in storage.');
          }

          if (!globalThis.LunoClassPatcher) {
            throw new Error('[Luno AST Guard] LunoClassPatcher is not loaded in client runtime.');
          }

          let patched = baseContent;
          if (f.action === 'delete') {
            patched = globalThis.LunoClassPatcher.deleteMethodInSource(baseContent, f.methodSpec || normPath);
          } else {
            patched = globalThis.LunoClassPatcher.patchMethodInSource(baseContent, f.methodSpec || normPath, f.content, { allowInsert: true });
          }

          if (normPath.endsWith('.js') || normPath.endsWith('.mjs')) {
            try {
              globalThis.LunoClassPatcher.parseAST(patched);
            } catch (syntaxErr) {
              throw new Error('[Luno AST Post-Splice Guard] Syntax error generated while patching "' + (f.methodSpec || normPath) + '":\n' + syntaxErr.message);
            }
          }

          if (isDirectAutoApply) {
            fullFilesMap.set(normPath, patched);
            patchActionsSummary.push({
              path: normPath,
              mode: 'direct-ast-apply',
              target: f.methodSpec || normPath,
              action: f.action || 'patch',
              success: true
            });
          } else {
            const tagWord = f.tagName || 'script';
            const safeContent = (f.content || '').split('</' + tagWord + '>').join('<\\/' + tagWord + '>');
            let block = '<' + tagWord + ' data-file="' + normPath + '" data-method="' + (f.methodSpec || '') + '" data-action="' + (f.action || 'patch') + '">\n' + safeContent + '\n</' + tagWord + '>';
            journalPatchBlocks.push(block);
            patchActionsSummary.push({
              path: normPath,
              mode: 'patchlog-journal',
              target: f.methodSpec || normPath,
              action: f.action || 'patch',
              success: true
            });
          }
        } catch (itemErr) {
          console.error('[Luno Patch Isolation]', itemErr);
          if (typeof LunoPlaybackLogger !== 'undefined') {
            LunoPlaybackLogger.error('Patch Rejected', (f.methodSpec || f.filePath) + ': ' + itemErr.message);
          }
          failedPatches.push({ filePath: f.filePath, methodSpec: f.methodSpec || '', action: f.action || 'patch', error: itemErr.message });
          patchActionsSummary.push({ path: f.filePath, target: f.methodSpec || f.filePath, mode: 'failed', action: f.action || 'patch', error: itemErr.message, success: false });
        }
      }

      fullFilesMap.forEach((content, filePath) => {
        let relativePath = filePath;
        if (targetProj && relativePath.startsWith(targetProj + '/')) {
          relativePath = relativePath.slice(targetProj.length + 1);
        }
        processedFilesList.push({
          tagName: 'script',
          filePath: relativePath,
          action: 'direct',
          content: content
        });
      });

      if (journalPatchBlocks.length > 0) {
        let currentLog = '';
        try {
          if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
            let logRes = await LunoApiClient.fetchFsRead('LunoPatchLog.html', targetProj);
            if (logRes && logRes.success && logRes.content) currentLog = logRes.content.trimEnd();
          }
        } catch (e) {}

        const newLogContent = (currentLog ? currentLog + '\n\n' : '') + journalPatchBlocks.join('\n\n') + '\n';
        processedFilesList.push({
          tagName: 'script',
          filePath: 'LunoPatchLog.html',
          action: 'direct',
          content: newLogContent
        });
      }

      return {
        files: processedFilesList,
        serverScript: payloadObj.serverScript || '',
        requests: payloadObj.requests || [],
        debugLogs: payloadObj.debugLogs || [],
        project: targetProj,
        patchMode: patchMode,
        patchActionsSummary: patchActionsSummary,
        failedPatches: failedPatches
      };
    }

  static async resolveCanonicalFilePath(rawPath, manifestObj, targetProj) {
      if (!rawPath || typeof rawPath !== 'string') return '';
      let norm = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
      if (norm.startsWith('Luno Workspace/')) norm = norm.slice(15).trim();
      if (norm.startsWith('LunoProjects/')) norm = norm.slice(13).trim();
      if (norm.startsWith('./')) norm = norm.slice(2).trim();

      // Canonical single-path anchors
      if (norm === 'server.js' || norm === 'Luno/server.js') {
        return 'Luno/server.js';
      }
      if (norm === 'LunoLoader.js' || norm === 'app/LunoLoader.js' || norm === 'Luno/app/LunoLoader.js' || norm === 'Library/LunoLoader.js') {
        return 'Library/LunoLoader.js';
      }
      if (norm === 'LunoPatchLog.html') return norm;

      if (norm.startsWith('Library/') || norm.startsWith('library/')) {
        return 'Library/' + norm.replace(/^(?:Library|library)\//, '');
      }

      if (norm.startsWith('Luno/')) {
        return norm;
      }

      // Check if first segment is an existing sibling project directory
      const firstSlash = norm.indexOf('/');
      if (firstSlash !== -1) {
        const firstSegment = norm.slice(0, firstSlash);
        const knownSiblings = [
          'aardvarkBookmarklet', 'AardvarkExtension', 'AardvarkPlaylist', 'AlphabetGame',
          'Basic3D', 'BasicsWithDialogBox', 'BookmarkletWorkshop', 'BulbAndButton', 'Calculator',
          'Es6Converter', 'LegoDetective', 'LunoTests', 'MathStorm', 'Penrose', 'PleasureAndPain',
          'RobotDividend', 'SvgStudio', 'TriBlob', 'ValuationOfAccudraw', 'accuCad', 'accudraw',
          'guessTheNoteGame', 'situation', 'squircle', 'Squircle', 'teacup'
        ];
        if (knownSiblings.includes(firstSegment)) {
          return norm;
        }

        // Check cached project names if available
        try {
          if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('luno_cached_projects_list');
            if (cached) {
              const list = JSON.parse(cached);
              if (Array.isArray(list) && list.some(p => p && p.name === firstSegment)) {
                return norm;
              }
            }
          }
        } catch (e) {}
      }

      if (targetProj && norm.startsWith(targetProj + '/')) {
        return norm;
      }

      if (targetProj === 'Luno') {
        return 'Luno/' + norm;
      }

      if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
        try {
          let testRead = await LunoApiClient.fetchFsRead(norm, targetProj);
          if (testRead && testRead.success && testRead.content !== undefined) {
            return targetProj ? (targetProj + '/' + norm) : norm;
          }
        } catch (e) {}
      }

      const baseName = norm.split('/').pop();
      const manifestPaths = [];
      if (manifestObj) {
        [].concat(manifestObj.main || []).forEach(p => p && manifestPaths.push(p));
        [].concat(manifestObj.files || manifestObj.local || []).forEach(p => p && manifestPaths.push(p));
        [].concat(manifestObj.styles || []).forEach(p => p && manifestPaths.push(p));
        [].concat(manifestObj.docs || []).forEach(p => p && manifestPaths.push(p));
        if (manifestObj.entrypoint && manifestObj.entrypoint.file) manifestPaths.push(manifestObj.entrypoint.file);
      }

      for (let mPath of manifestPaths) {
        let cleanM = mPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
        if (cleanM.endsWith('/' + baseName) || cleanM === baseName) {
          let candidate = cleanM;
          if (!candidate.startsWith(targetProj + '/') && !candidate.startsWith('Library/') && !candidate.startsWith('Luno/')) {
            candidate = targetProj ? (targetProj + '/' + candidate) : candidate;
          }
          if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
            try {
              let mRead = await LunoApiClient.fetchFsRead(candidate, targetProj);
              if (mRead && mRead.success && mRead.content !== undefined) {
                return candidate;
              }
            } catch(e) {}
          }
        }
      }

      const candidateFolders = ['app', 'core', 'browser', 'docs', 'src', 'test', 'js', 'glowtunes'];
      for (let folder of candidateFolders) {
        let candidate = (targetProj ? (targetProj + '/') : '') + folder + '/' + baseName;
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
          try {
            let subRead = await LunoApiClient.fetchFsRead(candidate, targetProj);
            if (subRead && subRead.success && subRead.content !== undefined) {
              return candidate;
            }
          } catch(e) {}
        }
      }

      return targetProj ? (targetProj + '/' + norm) : norm;
    }
}

globalThis.LunoManifestDecisionEngine = LunoManifestDecisionEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoManifestDecisionEngine;