class CodeDiffer {
  constructor() {}

  /**
   * Computes Longest Common Subsequence (LCS) line differences between oldStr and newStr.
   * Works across JavaScript, HTML, CSS, JSON, and plain text.
   */
  static computeLineDiff(oldStr, newStr) {
    var oldLines = typeof oldStr === 'string' && oldStr.length > 0 ? oldStr.split(/\r?\n/) : [];
    var newLines = typeof newStr === 'string' && newStr.length > 0 ? newStr.split(/\r?\n/) : [];

    var n = oldLines.length;
    var m = newLines.length;

    // Fast-path identical strings
    if (oldStr === newStr) {
      return { added: 0, removed: 0, diff: oldLines.map(function(t, idx) {
        return { type: 'normal', text: t, oldLine: idx + 1, newLine: idx + 1 };
      }) };
    }

    // Safety guard against massive files to prevent memory explosion
    if (n > 3500 || m > 3500) {
      var addedEst = Math.max(0, m - n);
      var removedEst = Math.max(0, n - m);
      return {
        added: addedEst,
        removed: removedEst,
        diff: [
          { type: 'delete', text: '// [' + n + ' original lines]', oldLine: 1, newLine: null },
          { type: 'add', text: '// [' + m + ' updated lines]', oldLine: null, newLine: 1 }
        ]
      };
    }

    var dp = Array(n + 1);
    for (var i = 0; i <= n; i++) {
      dp[i] = new Uint16Array(m + 1);
    }

    for (var r = 1; r <= n; r++) {
      for (var c = 1; c <= m; c++) {
        if (oldLines[r - 1] === newLines[c - 1]) {
          dp[r][c] = dp[r - 1][c - 1] + 1;
        } else {
          dp[r][c] = Math.max(dp[r - 1][c], dp[r][c - 1]);
        }
      }
    }

    var diff = [];
    var x = n;
    var y = m;
    var added = 0;
    var removed = 0;

    while (x > 0 || y > 0) {
      if (x > 0 && y > 0 && oldLines[x - 1] === newLines[y - 1]) {
        diff.unshift({ type: 'normal', text: oldLines[x - 1], oldLine: x, newLine: y });
        x--;
        y--;
      } else if (y > 0 && (x === 0 || dp[x][y - 1] >= dp[x - 1][y])) {
        diff.unshift({ type: 'add', text: newLines[y - 1], oldLine: null, newLine: y });
        added++;
        y--;
      } else if (x > 0 && (y === 0 || dp[x][y - 1] < dp[x - 1][y])) {
        diff.unshift({ type: 'delete', text: oldLines[x - 1], oldLine: x, newLine: null });
        removed++;
        x--;
      }
    }

    return { added: added, removed: removed, diff: diff };
  }

  /**
   * Calculates comprehensive line, character, and byte changes.
   */
  static analyzeDiff(oldStr, newStr, filePath) {
    var oldText = typeof oldStr === 'string' ? oldStr : '';
    var newText = typeof newStr === 'string' ? newStr : '';
    var ext = (filePath ? filePath.split('.').pop() : '').toLowerCase();
    var isHtml = (ext === 'html' || ext === 'htm');

    var lineDiffResult = CodeDiffer.computeLineDiff(oldText, newText);

    var bytesOld = oldText.length;
    var bytesNew = newText.length;
    var byteDelta = bytesNew - bytesOld;

    return {
      filePath: filePath || '',
      extension: ext,
      isHtml: isHtml,
      linesAdded: lineDiffResult.added,
      linesRemoved: lineDiffResult.removed,
      bytesBefore: bytesOld,
      bytesAfter: bytesNew,
      byteDelta: byteDelta,
      diff: lineDiffResult.diff,
      unchanged: oldText === newText
    };
  }

  /**
   * Generates interactive HTML pills showing (+linesAdded / -linesRemoved) and [+/- bytes].
   */
  static createStatsPills(linesRemoved, linesAdded, byteDelta) {
    var pills = [];

    if (linesAdded > 0) {
      pills.push('<span style="font-size:0.68rem; font-weight:bold; padding:0.12rem 0.45rem; border-radius:4px; background:rgba(63, 185, 80, 0.18); color:#3fb950; border:1px solid #238636;">+' + linesAdded + ' LOC</span>');
    }
    if (linesRemoved > 0) {
      pills.push('<span style="font-size:0.68rem; font-weight:bold; padding:0.12rem 0.45rem; border-radius:4px; background:rgba(248, 81, 73, 0.18); color:#ff7b72; border:1px solid #da3633;">-' + linesRemoved + ' LOC</span>');
    }
    if (linesAdded === 0 && linesRemoved === 0) {
      pills.push('<span style="font-size:0.68rem; color:#8b949e; padding:0.12rem 0.35rem; border-radius:4px; background:rgba(255,255,255,0.05);">0 LOC</span>');
    }

    if (byteDelta !== undefined && byteDelta !== 0) {
      var sign = byteDelta > 0 ? '+' : '';
      var byteColor = byteDelta > 0 ? '#58a6ff' : '#d2a8ff';
      var byteBg = byteDelta > 0 ? 'rgba(88, 166, 255, 0.12)' : 'rgba(210, 168, 255, 0.12)';
      pills.push('<span style="font-size:0.68rem; font-family:monospace; padding:0.12rem 0.4rem; border-radius:4px; background:' + byteBg + '; color:' + byteColor + '; border:1px solid ' + byteColor + '55;">' + sign + byteDelta + ' B</span>');
    }

    return pills.join(' ');
  }

  /**
   * Renders a full unified diff DOM table element with line numbers and color highlights.
   */
  static renderUnifiedDiffTable(beforeText, afterText, filePath) {
    var analysis = CodeDiffer.analyzeDiff(beforeText, afterText, filePath);
    var diffList = analysis.diff;

    var container = document.createElement('div');
    container.className = 'luno-diff-table-container';
    container.style.cssText = [
      'font-family: ui-monospace, Menlo, Consolas, monospace;',
      'font-size: 0.74rem;',
      'line-height: 1.45;',
      'background: #070a13;',
      'color: #cbd5e1;',
      'border-radius: 6px;',
      'border: 1px solid #30363d;',
      'overflow: auto;',
      'max-height: 380px;',
      'box-sizing: border-box;',
      'width: 100%;'
    ].join('\n');

    if (diffList.length === 0) {
      container.innerHTML = '<div style="padding: 18px; color: #8b949e; text-align: center; font-style: italic;">No changes detected. Content is identical.</div>';
      return container;
    }

    var table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; table-layout: fixed;';

    diffList.forEach(function(line) {
      var tr = document.createElement('tr');
      var bg = 'transparent';
      var indicator = ' ';
      var textColor = '#c9d1d9';

      if (line.type === 'add') {
        bg = 'rgba(63, 185, 80, 0.15)';
        textColor = '#7ee787';
        indicator = '+';
      } else if (line.type === 'delete') {
        bg = 'rgba(248, 81, 73, 0.15)';
        textColor = '#ff7b72';
        indicator = '-';
      }

      tr.style.background = bg;

      var tdOld = document.createElement('td');
      tdOld.style.cssText = 'width: 38px; text-align: right; padding: 1px 6px; color: #484f58; border-right: 1px solid #21262d; user-select: none; font-size: 0.68rem; vertical-align: top;';
      tdOld.textContent = line.oldLine !== null ? line.oldLine : '';

      var tdNew = document.createElement('td');
      tdNew.style.cssText = 'width: 38px; text-align: right; padding: 1px 6px; color: #484f58; border-right: 1px solid #21262d; user-select: none; font-size: 0.68rem; vertical-align: top;';
      tdNew.textContent = line.newLine !== null ? line.newLine : '';

      var tdInd = document.createElement('td');
      tdInd.style.cssText = 'width: 16px; text-align: center; font-weight: bold; user-select: none; color: ' + textColor + '; vertical-align: top;';
      tdInd.textContent = indicator;

      var tdText = document.createElement('td');
      tdText.style.cssText = 'padding: 1px 8px; white-space: pre-wrap; word-break: break-all; color: ' + textColor + '; vertical-align: top;';
      tdText.textContent = line.text;

      tr.appendChild(tdOld);
      tr.appendChild(tdNew);
      tr.appendChild(tdInd);
      tr.appendChild(tdText);
      table.appendChild(tr);
    });

    container.appendChild(table);
    return container;
  }

  /**
   * Backward-compatible diff array wrapper.
   */
  static diff(oldCode = '', newCode = '') {
    var result = CodeDiffer.computeLineDiff(oldCode, newCode);
    var spans = [];
    result.diff.forEach(function(item) {
      if (item.type === 'delete') spans.push({ type: 'delete', oldStartLine: item.oldLine, lines: [item.text] });
      else if (item.type === 'add') spans.push({ type: 'add', newStartLine: item.newLine, lines: [item.text] });
    });
    return spans;
  }

  static fastHash(str) {
      if (!str || typeof str !== 'string') return 0;
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    }
}

globalThis.CodeDiffer = CodeDiffer;
if (typeof module !== "undefined" && module.exports) module.exports = CodeDiffer;