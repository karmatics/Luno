class LunoTimelineDialog {
  constructor() {}

  static async open(options) {
      options = options || {};
      var existing = document.getElementById('luno-timeline-dialog');
      if (existing) existing.remove();

      var targetProj = options.project || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      var targetFile = options.filePath || '';

      var gitLogRes = { hasGit: false, commits: [] };
      if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchGitLog) {
        gitLogRes = await LunoApiClient.fetchGitLog(targetProj, targetFile);
      }
      var hasGit = Boolean(gitLogRes && gitLogRes.hasGit && gitLogRes.commits && gitLogRes.commits.length > 0);

      var records = await LunoHistoryManager.getAllRecords(targetProj);
      if (targetFile) {
        records = records.filter(function(r) {
          return r.filePath === targetFile || r.filePath.endsWith('/' + targetFile) || targetFile.endsWith('/' + r.filePath);
        });
      }

      // Group session records within 15 seconds into unified snapshot cards
      var snapshotCards = [];
      var chronological = records.slice().sort(function(a, b) { return a.timestamp - b.timestamp; });
      var currentCard = null;

      chronological.forEach(function(r) {
        if (!currentCard) {
          currentCard = { id: r.id, timestamp: r.timestamp, records: [r] };
          snapshotCards.push(currentCard);
        } else {
          var last = currentCard.records[currentCard.records.length - 1];
          if (Math.abs(r.timestamp - last.timestamp) <= 15000) {
            currentCard.records.push(r);
          } else {
            currentCard = { id: r.id, timestamp: r.timestamp, records: [r] };
            snapshotCards.push(currentCard);
          }
        }
      });

      snapshotCards.sort(function(a, b) { return b.timestamp - a.timestamp; });

      var activeTab = hasGit ? 'git' : 'snapshots';
      var selectedCommitIndex = 0;
      var selectedSnapshotIndex = 0;
      var selectedRecordId = null;

      var overlay = document.createElement('div');
      overlay.id = 'luno-timeline-dialog';
      overlay.style.cssText = [
        'position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
        'background: rgba(0, 0, 0, 0.88); z-index: 9988;',
        'display: flex; align-items: center; justify-content: center;',
        'padding: 1rem; font-family: monospace; backdrop-filter: blur(8px);'
      ].join('\n');

      var card = document.createElement('div');
      card.style.cssText = [
        'background: var(--bg-card, #161b22);',
        'border: 2px solid var(--accent-secondary, #8257e5);',
        'border-radius: 12px; padding: 1rem 1.25rem;',
        'max-width: 980px; width: 100%; max-height: 90vh;',
        'display: flex; flex-direction: column; gap: 0.65rem;',
        'box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(130,87,229,0.25);',
        'box-sizing: border-box;'
      ].join('\n');

      var header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;';
      header.innerHTML = [
        '<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">',
        '  <span style="color:#d2a8ff; font-size:1.1rem; font-weight:bold;">⏳ Project History & Checkpoints</span>',
        '  <span style="font-size:0.72rem; color:#00f2fe; background:#003847; padding:0.15rem 0.5rem; border-radius:10px; font-weight:bold;">[' + targetProj + ']' + (targetFile ? (' · ' + targetFile.split('/').pop()) : '') + '</span>',
        '</div>',
        '<button id="btn-close-timeline-modal" style="background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:0.25rem 0.55rem; cursor:pointer; font-weight:bold;">✖</button>'
      ].join('\n');

      // Nav Switcher between Git Commits and Session Snapshots
      var navRow = document.createElement('div');
      navRow.style.cssText = 'display: flex; gap: 0.4rem; border-bottom: 1px solid #21262d; padding-bottom: 0.4rem;';

      var btnNavGit = document.createElement('button');
      btnNavGit.style.cssText = 'padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer; font-family: monospace; border: 1px solid ' + (activeTab === 'git' ? '#00f2fe' : '#30363d') + '; background: ' + (activeTab === 'git' ? '#003847' : '#161b22') + '; color: ' + (activeTab === 'git' ? '#00f2fe' : '#8b949e') + ';';
      btnNavGit.textContent = '📸 Git Commits (' + (gitLogRes.commits ? gitLogRes.commits.length : 0) + ')';

      var btnNavSnapshots = document.createElement('button');
      btnNavSnapshots.style.cssText = 'padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer; font-family: monospace; border: 1px solid ' + (activeTab === 'snapshots' ? '#8257e5' : '#30363d') + '; background: ' + (activeTab === 'snapshots' ? '#271052' : '#161b22') + '; color: ' + (activeTab === 'snapshots' ? '#d2a8ff' : '#8b949e') + ';';
      btnNavSnapshots.textContent = '⏳ Local Snapshots (' + snapshotCards.length + ')';

      navRow.appendChild(btnNavGit);
      navRow.appendChild(btnNavSnapshots);

      var bodyContainer = document.createElement('div');
      bodyContainer.style.cssText = 'display: flex; gap: 1rem; width: 100%; height: 480px; max-height: 56vh; box-sizing: border-box; overflow: hidden;';

      var leftList = document.createElement('div');
      leftList.style.cssText = 'flex: 1; min-width: 270px; max-width: 370px; display: flex; flex-direction: column; gap: 0.45rem; overflow-y: auto; padding-right: 0.35rem; border-right: 1px solid #21262d;';

      var rightViewer = document.createElement('div');
      rightViewer.style.cssText = 'flex: 1.8; min-width: 0; display: flex; flex-direction: column; gap: 0.5rem; overflow: hidden;';

      var diffTitleBar = document.createElement('div');
      diffTitleBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; border-bottom: 1px solid #21262d; padding-bottom: 0.35rem;';
      rightViewer.appendChild(diffTitleBar);

      var diffTableHost = document.createElement('div');
      diffTableHost.style.cssText = 'flex: 1; min-height: 0; display: flex; overflow: hidden;';
      rightViewer.appendChild(diffTableHost);

      async function renderGitCommitDiff() {
        var commits = gitLogRes.commits || [];
        if (commits.length === 0) {
          diffTitleBar.innerHTML = '<span style="color:#8b949e;">No Git commits found in this project.</span>';
          diffTableHost.innerHTML = '<div style="padding:1rem; color:#8b949e; text-align:center;">Git repository clean or uninitialized.</div>';
          return;
        }

        var commit = commits[selectedCommitIndex];
        diffTitleBar.innerHTML = [
          '<div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">',
          '  <strong style="color:#00f2fe;">' + commit.shortHash + '</strong>',
          '  <span style="color:#c9d1d9; font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + commit.subject + '</span>',
          '</div>',
          '<div style="color:#8b949e; font-size:0.68rem;">' + commit.author + '</div>'
        ].join('\n');

        diffTableHost.innerHTML = '<div style="padding:1rem; color:#00f2fe;">⚡ Loading commit details...</div>';
        var details = await LunoApiClient.fetchGitCommit(commit.hash, targetProj, targetFile);

        if (details && details.diff) {
          var diffContainer = document.createElement('pre');
          diffContainer.style.cssText = 'margin:0; padding:0.65rem; background:#070a13; border:1px solid #30363d; border-radius:6px; color:#7ee787; font-size:0.72rem; line-height:1.45; overflow:auto; flex:1; white-space:pre-wrap; word-break:break-all; font-family:monospace;';

          // Colorize diff lines
          var coloredLines = details.diff.split('\n').map(function(line) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              return '<span style="color:#3fb950; background:rgba(63,185,80,0.12); display:block;">' + line.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              return '<span style="color:#ff7b72; background:rgba(248,81,73,0.12); display:block;">' + line.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
            } else if (line.startsWith('@@')) {
              return '<span style="color:#00f2fe; font-weight:bold; display:block;">' + line + '</span>';
            }
            return line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
          });

          diffContainer.innerHTML = coloredLines.join('\n');
          diffTableHost.innerHTML = '';
          diffTableHost.appendChild(diffContainer);
        } else {
          diffTableHost.innerHTML = '<div style="padding:1rem; color:#8b949e;">No diff content available for this commit.</div>';
        }
      }

      function renderSnapshotDiff() {
        if (snapshotCards.length === 0) {
          diffTitleBar.innerHTML = '<span style="color:#8b949e;">No session snapshots logged yet.</span>';
          diffTableHost.innerHTML = '';
          return;
        }

        var cardItem = snapshotCards[selectedSnapshotIndex];
        var record = cardItem.records.find(function(r) { return r.id === selectedRecordId; }) || cardItem.records[0];
        if (!record) return;

        var fileName = record.filePath.split('/').pop() || record.filePath;
        diffTitleBar.innerHTML = [
          '<div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">',
          '  <strong style="color:#d2a8ff;">' + fileName + '</strong>',
          '  <span style="color:#8b949e; font-size:0.68rem;">(' + record.target + ')</span>',
          '</div>',
          '<div>' + CodeDiffer.createStatsPills(record.linesRemoved, record.linesAdded, record.byteDelta) + '</div>'
        ].join('\n');

        diffTableHost.innerHTML = '';
        var table = CodeDiffer.renderUnifiedDiffTable(record.oldContent, record.newContent, record.filePath);
        diffTableHost.appendChild(table);
      }

      function renderActiveView() {
        leftList.innerHTML = '';

        btnNavGit.style.border = '1px solid ' + (activeTab === 'git' ? '#00f2fe' : '#30363d');
        btnNavGit.style.background = activeTab === 'git' ? '#003847' : '#161b22';
        btnNavGit.style.color = activeTab === 'git' ? '#00f2fe' : '#8b949e';

        btnNavSnapshots.style.border = '1px solid ' + (activeTab === 'snapshots' ? '#8257e5' : '#30363d');
        btnNavSnapshots.style.background = activeTab === 'snapshots' ? '#271052' : '#161b22';
        btnNavSnapshots.style.color = activeTab === 'snapshots' ? '#d2a8ff' : '#8b949e';

        btnRevert.style.display = (activeTab === 'snapshots') ? 'block' : 'none';
        btnClear.style.display = (activeTab === 'snapshots') ? 'block' : 'none';

        if (activeTab === 'git') {
          var commits = gitLogRes.commits || [];
          if (commits.length === 0) {
            leftList.innerHTML = '<div style="padding:1rem; color:#8b949e; text-align:center;">No Git commits found for [' + targetProj + '].</div>';
            renderGitCommitDiff();
            return;
          }

          commits.forEach(function(c, idx) {
            var isSelected = (idx === selectedCommitIndex);
            var row = document.createElement('div');
            row.style.cssText = [
              'padding: 0.55rem 0.65rem;',
              'border-radius: 6px;',
              'background: ' + (isSelected ? 'rgba(0, 242, 254, 0.14)' : '#0d1117') + ';',
              'border: 1px solid ' + (isSelected ? '#00f2fe' : '#21262d') + ';',
              'cursor: pointer;',
              'display: flex;',
              'flex-direction: column;',
              'gap: 0.25rem;',
              'transition: all 0.15s ease;'
            ].join('\n');

            row.innerHTML = [
              '<div style="display:flex; justify-content:space-between; align-items:center;">',
              '  <strong style="color:' + (isSelected ? '#00f2fe' : '#f0f6fc') + '; font-size:0.75rem;">' + c.shortHash + '</strong>',
              '  <span style="font-size:0.68rem; color:#8b949e;">' + c.date.slice(0, 10) + '</span>',
              '</div>',
              '<div style="font-size:0.72rem; color:' + (isSelected ? '#ffffff' : '#c9d1d9') + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + c.subject + '</div>',
              '<div style="font-size:0.65rem; color:#8b949e;">Author: ' + c.author + '</div>'
            ].join('\n');

            row.onclick = function() {
              selectedCommitIndex = idx;
              renderActiveView();
              renderGitCommitDiff();
            };

            leftList.appendChild(row);
          });

          renderGitCommitDiff();
        } else {
          if (snapshotCards.length === 0) {
            leftList.innerHTML = '<div style="padding:1rem; color:#8b949e; text-align:center;">No session snapshots logged.</div>';
            renderSnapshotDiff();
            return;
          }

          snapshotCards.forEach(function(c, cIdx) {
            var isSelected = (cIdx === selectedSnapshotIndex);
            var cardEl = document.createElement('div');
            cardEl.style.cssText = [
              'padding: 0.55rem 0.75rem; border-radius: 6px;',
              'background: ' + (isSelected ? 'rgba(130, 87, 229, 0.2)' : '#0d1117') + ';',
              'border: 1px solid ' + (isSelected ? '#8257e5' : '#21262d') + ';',
              'cursor: pointer; display: flex; flex-direction: column; gap: 0.35rem;'
            ].join('\n');

            var timeStr = new Date(c.timestamp).toLocaleTimeString();
            var headerRow = '<div style="display:flex; justify-content:space-between; font-size:0.72rem; color:#d2a8ff; font-weight:bold;">' +
              '<span>Snapshot #' + (snapshotCards.length - cIdx) + ' (' + c.records.length + ' file' + (c.records.length === 1 ? '' : 's') + ')</span>' +
              '<span style="color:#8b949e;">' + timeStr + '</span></div>';

            var filesListHtml = c.records.map(function(r) {
              var isCurrentRec = (r.id === selectedRecordId || (!selectedRecordId && isSelected && r === c.records[0]));
              var pills = CodeDiffer.createStatsPills(r.linesRemoved, r.linesAdded, r.byteDelta);
              return '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:' + (isCurrentRec ? '#00f2fe' : '#c9d1d9') + '; padding:2px 0;">' +
                '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">' + (r.filePath.split('/').pop() || r.filePath) + '</span>' +
                '<span>' + pills + '</span></div>';
            }).join('');

            cardEl.innerHTML = headerRow + filesListHtml;

            cardEl.onclick = function() {
              selectedSnapshotIndex = cIdx;
              selectedRecordId = c.records[0].id;
              renderActiveView();
              renderSnapshotDiff();
            };

            leftList.appendChild(cardEl);
          });

          renderSnapshotDiff();
        }
      }

      btnNavGit.onclick = function() { activeTab = 'git'; renderActiveView(); };
      btnNavSnapshots.onclick = function() { activeTab = 'snapshots'; renderActiveView(); };

      bodyContainer.appendChild(leftList);
      bodyContainer.appendChild(rightViewer);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display: flex; gap: 0.5rem; justify-content: space-between; border-top: 1px solid #30363d; padding-top: 0.65rem;';

      var btnRevert = document.createElement('button');
      btnRevert.style.cssText = 'padding: 0.6rem 1rem; background: #da3633; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem; font-family: monospace;';
      btnRevert.textContent = '↩️ Revert Selected Snapshot';
      btnRevert.onclick = async function() {
        if (snapshotCards.length === 0) return;
        var currentRec = snapshotCards[selectedSnapshotIndex].records.find(function(r) { return r.id === selectedRecordId; }) || snapshotCards[selectedSnapshotIndex].records[0];
        if (!currentRec) return;

        if (confirm('Revert ' + currentRec.filePath + ' back to previous snapshot?')) {
          btnRevert.disabled = true;
          btnRevert.textContent = 'Reverting...';
          var res = await LunoHistoryManager.revertRecord(currentRec.id, targetProj);
          if (res && res.success) {
            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
              ClientApp.showToast('Reverted ' + currentRec.filePath + '!', 'success', '↩️');
            }
            overlay.remove();
          } else {
            alert('Revert failed: ' + ((res && res.error) || 'Storage error'));
            btnRevert.disabled = false;
            btnRevert.textContent = '↩️ Revert Selected Snapshot';
          }
        }
      };

      var btnClear = document.createElement('button');
      btnClear.style.cssText = 'padding: 0.6rem 1rem; background: #21262d; color: #ff7b72; border: 1px solid #da3633; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem; font-family: monospace;';
      btnClear.textContent = '🧹 Clear Session History';
      btnClear.onclick = async function() {
        if (confirm('Clear local session history for [' + targetProj + ']?')) {
          await LunoHistoryManager.clearHistory(targetProj);
          overlay.remove();
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Session history cleared for [' + targetProj + '].', 'info', '🧹');
          }
        }
      };

      btnRow.appendChild(btnRevert);
      btnRow.appendChild(btnClear);

      card.appendChild(header);
      card.appendChild(navRow);
      card.appendChild(bodyContainer);
      card.appendChild(btnRow);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      document.getElementById('btn-close-timeline-modal').onclick = function() { overlay.remove(); };

      renderActiveView();
    }
}

globalThis.LunoTimelineDialog = LunoTimelineDialog;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoTimelineDialog;