class LunoPatchConsolidator {
  constructor() {}

  static cleanPath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') return '';
    var clean = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (clean.startsWith('Luno Workspace/')) clean = clean.slice(15).trim();
    if (clean.startsWith('./')) clean = clean.slice(2).trim();
    return clean;
  }

  static async consolidate(projectOverride) {
      try {
        var targetProj = projectOverride || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

        // Acorn loaded via CDN in index.html

        var logRes = await LunoApiClient.fetchFsRead('LunoPatchLog.html', targetProj);
        if (!logRes || !logRes.success || !logRes.content || !logRes.content.trim()) {
          if (typeof LunoPlaybackLogger !== 'undefined') {
            LunoPlaybackLogger.boot('Consolidation Skipped', 'LunoPatchLog.html is already clean.');
          }
          return { success: true, consolidatedCount: 0, modifiedFiles: [], note: 'Patch log is clean.' };
        }

        var parser = globalThis.LunoPayloadParser || globalThis.LunoContainerParser;
        if (!parser || typeof parser.parse !== 'function') {
          throw new Error('[Luno Consolidation Guard] Payload parser unavailable in browser scope.');
        }

        var parsed = (typeof parser.parsePatchLog === 'function') ? parser.parsePatchLog(logRes.content) : parser.parse(logRes.content);
        var allFiles = parsed.files || [];
        if (allFiles.length === 0) {
          await LunoApiClient.savePayload({
            files: [{ filePath: 'LunoPatchLog.html', action: 'direct', content: '' }],
            project: targetProj
          }, targetProj);
          return { success: true, consolidatedCount: 0, modifiedFiles: [], note: 'No valid patch blocks.' };
        }

        var targetFiles = [];
        var remainingOtherProjectBlocks = [];

        allFiles.forEach(function(f) {
          if (!f || !f.filePath || f.filePath === 'LunoPatchLog.html') return;
          var norm = LunoPatchConsolidator.cleanPath(f.filePath);

          var isForTarget = false;
          if (targetProj === 'Luno') {
            isForTarget = norm.startsWith('Luno/') || !norm.includes('/') || norm.startsWith('app/') || norm.startsWith('browser/') || norm.startsWith('core/') || norm.startsWith('docs/') || norm.startsWith('test/');
          } else {
            isForTarget = norm.startsWith(targetProj + '/') || norm.startsWith('Library/');
          }

          if (isForTarget) {
            var cleanPath = norm;
            if (targetProj === 'Luno' && !cleanPath.startsWith('Luno/') && !cleanPath.startsWith('Library/')) {
              cleanPath = 'Luno/' + cleanPath;
            } else if (targetProj !== 'Luno' && !cleanPath.startsWith(targetProj + '/') && !cleanPath.startsWith('Library/')) {
              cleanPath = targetProj + '/' + cleanPath;
            }
            f.canonicalPath = cleanPath;
            targetFiles.push(f);
          } else {
            var tag = f.tagName || 'script';
            var closeTag = '<' + '/' + tag + '>';
            var methodAttr = f.methodSpec ? (' data-method="' + f.methodSpec + '"') : '';
            var actionAttr = f.action ? (' data-action="' + f.action + '"') : '';
            remainingOtherProjectBlocks.push('<' + tag + ' data-file="' + f.filePath + '"' + methodAttr + actionAttr + '>\n' + f.content + '\n' + closeTag);
          }
        });

        if (targetFiles.length === 0) {
          if (typeof LunoPlaybackLogger !== 'undefined') {
            LunoPlaybackLogger.boot('Consolidation Notice', 'No pending patches found for [' + targetProj + '].');
          }
          return { success: true, consolidatedCount: 0, modifiedFiles: [], note: 'No pending patches for ' + targetProj };
        }

        var fileMap = new Map();
        targetFiles.forEach(function(f) {
          var key = f.canonicalPath || f.filePath;
          if (!fileMap.has(key)) fileMap.set(key, []);
          fileMap.get(key).push(f);
        });

        var filesToWrite = [];
        var modifiedFilesList = [];

        var fileEntries = Array.from(fileMap.entries());
        for (var fIdx = 0; fIdx < fileEntries.length; fIdx++) {
          var canonicalPath = fileEntries[fIdx][0];
          var patchSequence = fileEntries[fIdx][1];

          var currentSource = '';
          var isNewFile = false;

          try {
            var baseRes = await LunoApiClient.fetchFsRead(canonicalPath, targetProj);
            if (baseRes && baseRes.success && baseRes.content !== undefined) {
              currentSource = baseRes.content;
            }
          } catch(e){}

          if (!currentSource && patchSequence.length > 0 && !patchSequence[0].methodSpec && patchSequence[0].content) {
            isNewFile = true;
            currentSource = patchSequence[0].content;
            patchSequence = patchSequence.slice(1);
          }

          if (!currentSource && !isNewFile) {
            throw new Error('[Luno Consolidation Guard] Cannot consolidate patches into missing base file: ' + canonicalPath);
          }

          for (var p = 0; p < patchSequence.length; p++) {
            var item = patchSequence[p];
            if (!item) continue;

            if (!item.methodSpec && item.action !== 'patch' && item.content) {
              currentSource = item.content;
            } else if (item.action === 'delete' && item.methodSpec) {
              if (typeof LunoClassPatcher !== 'undefined' && LunoClassPatcher.deleteMethodInSource) {
                currentSource = LunoClassPatcher.deleteMethodInSource(currentSource, item.methodSpec);
              }
            } else if (item.methodSpec || item.action === 'patch') {
              if (typeof LunoClassPatcher !== 'undefined' && LunoClassPatcher.patchMethodInSource) {
                currentSource = LunoClassPatcher.patchMethodInSource(currentSource, item.methodSpec || canonicalPath, item.content);
              } else {
                currentSource = currentSource.trimEnd() + '\n\n' + item.content + '\n';
              }
            }
          }

          if (canonicalPath.endsWith('.js') || canonicalPath.endsWith('.mjs')) {
            if (typeof LunoClassPatcher !== 'undefined' && LunoClassPatcher.parseAST) {
              try {
                LunoClassPatcher.parseAST(currentSource);
              } catch(astErr) {
                throw new Error('[Luno Consolidation Guard] Syntax error in consolidated "' + canonicalPath + '": ' + astErr.message + '. Consolidation aborted cleanly.');
              }
            }
          }

          filesToWrite.push({
            filePath: canonicalPath,
            action: 'direct',
            content: currentSource
          });
          modifiedFilesList.push(canonicalPath);
        }

        filesToWrite.push({
          filePath: 'LunoPatchLog.html',
          action: 'direct',
          content: remainingOtherProjectBlocks.length > 0 ? remainingOtherProjectBlocks.join('\n\n') : ''
        });

        var savePayloadObj = { files: filesToWrite, serverScript: '', project: targetProj };
        var saveData = await LunoApiClient.savePayload(savePayloadObj, targetProj);

        if (saveData && saveData.success) {
          if (typeof LunoPlaybackLogger !== 'undefined') {
            LunoPlaybackLogger.boot('Consolidation Complete', 'Consolidated ' + targetFiles.length + ' patch(es) across ' + modifiedFilesList.length + ' file(s) for [' + targetProj + '].');
          }
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Consolidated ' + targetFiles.length + ' patch(es) for [' + targetProj + ']!', 'success', '✨');
          }
          return {
            success: true,
            consolidatedCount: targetFiles.length,
            modifiedFiles: modifiedFilesList,
            project: targetProj
          };
        } else {
          throw new Error((saveData && saveData.error) || 'Storage write failed during consolidation');
        }
      } catch (err) {
        if (typeof LunoPlaybackLogger !== 'undefined') {
          LunoPlaybackLogger.error('Consolidation Error', err.message);
        }
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast('Consolidation Failed: ' + err.message, 'error', '❌');
        }
        return { success: false, error: err.message };
      }
    }
}

globalThis.LunoPatchConsolidator = LunoPatchConsolidator;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoPatchConsolidator;