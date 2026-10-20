class DiffApprovalModal {
  constructor() {}

  static escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static open(options) {
      options = options || {};
      var existing = typeof document !== 'undefined' ? document.getElementById('luno-diff-approval-modal') : null;
      if (existing) existing.remove();

      var payloadText = options.payloadText || '';
      var fileDiffs = options.fileDiffs || [];
      var onConfirm = options.onConfirm || function() {};
      var onCancel = options.onCancel || function() {};

      var rawPayload = options.rawPayload || (typeof LunoPayloadParser !== 'undefined' && LunoPayloadParser.parse
        ? LunoPayloadParser.parse(payloadText)
        : { files: [], serverScript: '' });

      // Fallback if fileDiffs is missing
      if (!fileDiffs || fileDiffs.length === 0) {
        fileDiffs = (rawPayload.files || []).map(function(f) {
          return {
            filePath: f.filePath || 'Unnamed Target',
            target: f.methodSpec || f.filePath,
            mode: f.methodSpec ? 'surgical-patch' : 'full-file',
            oldContent: '',
            newContent: f.content || '',
            linesAdded: (f.content || '').split('\n').length,
            linesRemoved: 0,
            byteDelta: (f.content || '').length
          };
        });

        if (rawPayload.serverScript) {
          fileDiffs.push({
            filePath: 'RUN: SERVER',
            target: 'Privileged Node.js Server Script',
            mode: 'server-script',
            oldContent: '',
            newContent: rawPayload.serverScript,
            linesAdded: rawPayload.serverScript.split('\n').length,
            linesRemoved: 0,
            byteDelta: rawPayload.serverScript.length
          });
        }
      }

      // Build hierarchy of method-level and file-level items for each diff card
      fileDiffs.forEach(function(fd) {
        if (fd.mode === 'server-script') {
          fd.items = [{
            id: 'server_script',
            type: 'server-script',
            target: 'RUN: SERVER',
            name: 'Node.js Execution Script',
            oldContent: '',
            newContent: fd.newContent || '',
            linesAdded: fd.linesAdded || 0,
            linesRemoved: 0,
            byteDelta: fd.byteDelta || 0
          }];
        } else {
          fd.items = DiffApprovalModal.extractMethodDiffs(fd, rawPayload.files);
        }
      });

      var selectedFileIndex = 0;
      var selectedItemIndex = 0;

      var overlay = document.createElement('div');
      overlay.id = 'luno-diff-approval-modal';
      overlay.style.cssText = [
        'position: fixed;',
        'top: 0; left: 0; right: 0; bottom: 0;',
        'background: rgba(0, 0, 0, 0.88);',
        'display: flex; align-items: center; justify-content: center;',
        'z-index: 9985; font-family: monospace;',
        'padding: 1rem; backdrop-filter: blur(8px);'
      ].join('\n');

      var card = document.createElement('div');
      card.style.cssText = [
        'background: var(--bg-card, #161b22);',
        'border: 2px solid var(--accent-primary, #00f2fe);',
        'border-radius: 12px; padding: 1rem 1.25rem;',
        'max-width: 980px; width: 100%; max-height: 90vh;',
        'display: flex; flex-direction: column; gap: 0.75rem;',
        'box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px var(--glow-color, rgba(0, 242, 254, 0.25));',
        'box-sizing: border-box;'
      ].join('\n');

      var header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;';
      header.innerHTML = [
        '<div style="display:flex; align-items:center; gap:0.5rem;">',
        '  <span style="font-size:1.1rem; color:#00f2fe; font-weight:bold;">🔍 Inspect Pending Code Differences</span>',
        '  <span id="diff-modal-badge" style="font-size:0.72rem; color:#3fb950; background:#0d2818; border:1px solid #238636; padding:0.15rem 0.5rem; border-radius:10px; font-weight:bold;">' + fileDiffs.length + ' File(s)</span>',
        '</div>',
        '<button id="btn-close-diff-modal" style="background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:0.25rem 0.55rem; cursor:pointer; font-weight:bold;">✖</button>'
      ].join('\n');

      var bodyContainer = document.createElement('div');
      bodyContainer.style.cssText = 'display: flex; gap: 1rem; width: 100%; height: 500px; max-height: 58vh; box-sizing: border-box; overflow: hidden;';

      var leftList = document.createElement('div');
      leftList.style.cssText = 'flex: 1; min-width: 270px; max-width: 360px; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; padding-right: 0.35rem; border-right: 1px solid #21262d;';

      var rightViewer = document.createElement('div');
      rightViewer.style.cssText = 'flex: 1.8; min-width: 0; display: flex; flex-direction: column; gap: 0.5rem; overflow: hidden;';

      var diffTitleBar = document.createElement('div');
      diffTitleBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; border-bottom: 1px solid #21262d; padding-bottom: 0.35rem;';
      rightViewer.appendChild(diffTitleBar);

      var diffTableHost = document.createElement('div');
      diffTableHost.style.cssText = 'flex: 1; min-height: 0; display: flex; overflow: hidden;';
      rightViewer.appendChild(diffTableHost);

      function renderDiffForCurrentTarget() {
        if (!fileDiffs || fileDiffs.length === 0) {
          diffTitleBar.innerHTML = '<span style="color:#8b949e;">No file targets available.</span>';
          diffTableHost.innerHTML = '';
          return;
        }

        var currentFile = fileDiffs[selectedFileIndex];
        if (!currentFile || !currentFile.items || currentFile.items.length === 0) {
          diffTitleBar.innerHTML = '<span style="color:#8b949e;">No diff items in target file.</span>';
          diffTableHost.innerHTML = '';
          return;
        }

        var item = currentFile.items[selectedItemIndex] || currentFile.items[0];
        var isMethod = (item.type === 'method');
        var isServer = (item.type === 'server-script');

        var badgeLabel = isServer ? '⚡ Server Script' : (isMethod ? '✂️ Method Patch' : '📄 Full File');
        var badgeColor = isServer ? '#e3b341' : (isMethod ? '#00f2fe' : '#58a6ff');

        diffTitleBar.innerHTML = [
          '<div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">',
          '  <strong style="color:#f0f6fc;">' + item.target + '</strong>',
          '  <span style="font-size:0.68rem; color:' + badgeColor + '; background:rgba(255,255,255,0.05); padding:0.1rem 0.4rem; border-radius:4px; border:1px solid ' + badgeColor + '55;">' + badgeLabel + '</span>',
          '</div>',
          '<div style="display:flex; gap:0.35rem; align-items:center; flex-shrink:0;">',
          (typeof CodeDiffer !== 'undefined') ? CodeDiffer.createStatsPills(item.linesRemoved || 0, item.linesAdded || 0, item.byteDelta || 0) : '',
          '</div>'
        ].join('\n');

        diffTableHost.innerHTML = '';
        if (typeof CodeDiffer !== 'undefined') {
          var table = CodeDiffer.renderUnifiedDiffTable(item.oldContent || '', item.newContent || '', item.target || currentFile.filePath);
          diffTableHost.appendChild(table);
        }
      }

      function renderLeftList() {
        leftList.innerHTML = '';

        if (fileDiffs.length === 0) {
          leftList.innerHTML = '<div style="padding:1rem; color:#8b949e; text-align:center;">All changes discarded.</div>';
          renderDiffForCurrentTarget();
          return;
        }

        fileDiffs.forEach(function(fileItem, fIdx) {
          var isFileSelected = (fIdx === selectedFileIndex);

          var fileCard = document.createElement('div');
          fileCard.style.cssText = [
            'padding: 0.55rem 0.65rem;',
            'border-radius: 6px;',
            'background: ' + (isFileSelected ? 'rgba(0, 242, 254, 0.08)' : '#0d1117') + ';',
            'border: 1px solid ' + (isFileSelected ? '#00f2fe66' : '#21262d') + ';',
            'display: flex;',
            'flex-direction: column;',
            'gap: 0.35rem;'
          ].join('\n');

          var topRow = document.createElement('div');
          topRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; cursor:pointer;';

          var fileNameSpan = document.createElement('strong');
          fileNameSpan.style.cssText = 'color:' + (isFileSelected ? '#00f2fe' : '#f0f6fc') + '; font-size:0.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
          fileNameSpan.textContent = fileItem.filePath.split('/').pop() || fileItem.filePath;
          fileNameSpan.title = fileItem.filePath;

          var filePills = (typeof CodeDiffer !== 'undefined')
            ? CodeDiffer.createStatsPills(fileItem.linesRemoved || 0, fileItem.linesAdded || 0, fileItem.byteDelta || 0)
            : '';

          topRow.appendChild(fileNameSpan);
          topRow.insertAdjacentHTML('beforeend', '<div>' + filePills + '</div>');

          topRow.onclick = function() {
            selectedFileIndex = fIdx;
            selectedItemIndex = 0;
            renderLeftList();
            renderDiffForCurrentTarget();
          };

          fileCard.appendChild(topRow);

          // Render sub-items (methods & whole-file options)
          var itemsContainer = document.createElement('div');
          itemsContainer.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; margin-top:0.15rem;';

          fileItem.items.forEach(function(subItem, sIdx) {
            var isSubSelected = (isFileSelected && sIdx === selectedItemIndex);
            var subRow = document.createElement('div');
            subRow.style.cssText = [
              'display: flex; justify-content: space-between; align-items: center;',
              'padding: 0.25rem 0.45rem; border-radius: 4px; font-size: 0.72rem; cursor: pointer;',
              'background: ' + (isSubSelected ? '#003847' : 'rgba(255,255,255,0.02)') + ';',
              'color: ' + (isSubSelected ? '#00f2fe' : '#c9d1d9') + ';',
              'border: 1px solid ' + (isSubSelected ? '#00f2fe88' : 'transparent') + ';'
            ].join('\n');

            var leftInfo = document.createElement('div');
            leftInfo.style.cssText = 'display:flex; align-items:center; gap:0.3rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
            leftInfo.innerHTML = '<span style="font-weight:bold;">' + subItem.name + '</span>' +
              (subItem.type === 'method' ? '<span style="font-size:0.65rem; color:#8b949e;">[' + subItem.action.toUpperCase() + ']</span>' : '');

            var rightActions = document.createElement('div');
            rightActions.style.cssText = 'display:flex; align-items:center; gap:0.3rem;';

            var subPills = (typeof CodeDiffer !== 'undefined')
              ? CodeDiffer.createStatsPills(subItem.linesRemoved || 0, subItem.linesAdded || 0, subItem.byteDelta || 0)
              : '';
            rightActions.insertAdjacentHTML('beforeend', subPills);

            if (subItem.type === 'method' && subItem.rawFileRef) {
              var btnDiscard = document.createElement('button');
              btnDiscard.textContent = '×';
              btnDiscard.title = 'Discard this method patch';
              btnDiscard.style.cssText = 'background:none; border:none; color:#ff7b72; font-size:0.85rem; font-weight:bold; cursor:pointer; line-height:1; padding:0 0.15rem;';
              btnDiscard.onclick = function(e) {
                e.stopPropagation();
                // Remove this raw method patch from rawPayload
                if (rawPayload && Array.isArray(rawPayload.files)) {
                  rawPayload.files = rawPayload.files.filter(function(rf) { return rf !== subItem.rawFileRef; });
                }
                // Remove from items array
                fileItem.items = fileItem.items.filter(function(it) { return it !== subItem; });
                selectedItemIndex = 0;
                renderLeftList();
                renderDiffForCurrentTarget();
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                  ClientApp.showToast('Discarded patch for ' + subItem.name, 'info', '✂️');
                }
              };
              rightActions.appendChild(btnDiscard);
            }

            subRow.appendChild(leftInfo);
            subRow.appendChild(rightActions);

            subRow.onclick = function(e) {
              e.stopPropagation();
              selectedFileIndex = fIdx;
              selectedItemIndex = sIdx;
              renderLeftList();
              renderDiffForCurrentTarget();
            };

            itemsContainer.appendChild(subRow);
          });

          fileCard.appendChild(itemsContainer);
          leftList.appendChild(fileCard);
        });
      }

      bodyContainer.appendChild(leftList);
      bodyContainer.appendChild(rightViewer);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap; border-top: 1px solid #30363d; padding-top: 0.65rem;';

      var btnApply = document.createElement('button');
      btnApply.className = 'btn-primary';
      btnApply.style.cssText = 'flex: 2; padding: 0.75rem; font-weight: bold; background: #238636; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: monospace; box-shadow: 0 4px 12px rgba(35, 134, 54, 0.35);';
      btnApply.textContent = '⚡ Authorize & Apply to Storage';
      btnApply.onclick = function() {
        overlay.remove();
        onConfirm({ approved: true, filteredPayload: rawPayload });
      };

      var btnAbort = document.createElement('button');
      btnAbort.className = 'btn-secondary';
      btnAbort.style.cssText = 'flex: 1; padding: 0.75rem; background: #21262d; color: #ff7b72; border: 1px solid #da3633; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.82rem; font-family: monospace;';
      btnAbort.textContent = '❌ Cancel / Abort';
      btnAbort.onclick = function() {
        overlay.remove();
        onCancel();
      };

      btnRow.appendChild(btnApply);
      btnRow.appendChild(btnAbort);

      card.appendChild(header);
      card.appendChild(bodyContainer);
      card.appendChild(btnRow);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      document.getElementById('btn-close-diff-modal').onclick = function() {
        overlay.remove();
        onCancel();
      };

      renderLeftList();
      renderDiffForCurrentTarget();
    }
  static extractMethodDiffs(fileDiff, rawFiles) {
      var items = [];
      var matchedRaw = (rawFiles || []).filter(function(rf) {
        if (!rf || !rf.filePath) return false;
        var norm1 = rf.filePath.replace(/\\/g, '/');
        var norm2 = fileDiff.filePath.replace(/\\/g, '/');
        return norm1 === norm2 || norm1.endsWith('/' + norm2) || norm2.endsWith('/' + norm1);
      });

      matchedRaw.forEach(function(rawFile, rIdx) {
        if (rawFile.methodSpec) {
          var bounds = null;
          if (typeof LunoClassPatcher !== 'undefined' && LunoClassPatcher.findMethodBounds && fileDiff.oldContent) {
            try {
              bounds = LunoClassPatcher.findMethodBounds(fileDiff.oldContent, rawFile.methodSpec);
            } catch (e) {}
          }

          var oldMethodCode = bounds ? fileDiff.oldContent.slice(bounds.startIdx, bounds.endIdx) : '';
          var newMethodCode = rawFile.content || '';
          var diffAnalysis = (typeof CodeDiffer !== 'undefined')
            ? CodeDiffer.analyzeDiff(oldMethodCode, newMethodCode, rawFile.methodSpec)
            : { linesAdded: newMethodCode.split('\n').length, linesRemoved: (oldMethodCode ? oldMethodCode.split('\n').length : 0), byteDelta: newMethodCode.length - oldMethodCode.length };

          var methodName = rawFile.methodSpec.split('.').pop() || rawFile.methodSpec;
          items.push({
            id: 'method_' + rIdx,
            type: 'method',
            rawFileRef: rawFile,
            target: rawFile.methodSpec,
            action: rawFile.action || 'patch',
            name: '.' + methodName,
            oldContent: oldMethodCode,
            newContent: newMethodCode,
            linesAdded: diffAnalysis.linesAdded,
            linesRemoved: diffAnalysis.linesRemoved,
            byteDelta: diffAnalysis.byteDelta
          });
        }
      });

      // Append whole-file diff item so user can seamlessly view full-file context
      items.push({
        id: 'whole_file',
        type: 'whole-file',
        target: fileDiff.filePath,
        name: '[Whole File Diff]',
        oldContent: fileDiff.oldContent || '',
        newContent: fileDiff.newContent || '',
        linesAdded: fileDiff.linesAdded || 0,
        linesRemoved: fileDiff.linesRemoved || 0,
        byteDelta: fileDiff.byteDelta || 0
      });

      return items;
    }
}

globalThis.DiffApprovalModal = DiffApprovalModal;
if (typeof module !== "undefined" && module.exports) module.exports = DiffApprovalModal;