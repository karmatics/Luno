class LunoMetricsAnalyzer {
  constructor() {}

  static currentSortBy = 'lines';

  static makeElement(...args) {
    return LunoUIComponents.makeElement(...args);
  }

  static analyzeFile(relPath, content) {
    const lines = content ? content.split('\n').length : 0;
    const chars = content ? content.length : 0;
    let classCount = 0;
    let functionCount = 0;

    let ast = null;
    if (typeof LunoClassPatcher !== 'undefined' && LunoClassPatcher.parseAST && content) {
      try {
        ast = LunoClassPatcher.parseAST(content);
      } catch (e) {}
    }

    if (ast) {
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
          classCount++;
        }
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression' ||
          node.type === 'MethodDefinition'
        ) {
          functionCount++;
        }
        for (const k in node) {
          if (k === 'parent') continue;
          const child = node[k];
          if (Array.isArray(child)) {
            for (const c of child) if (c && typeof c.type === 'string') walk(c);
          } else if (child && typeof child.type === 'string') {
            walk(child);
          }
        }
      };
      walk(ast);
    } else if (content) {
      const classMatches = content.match(/\bclass\s+[A-Za-z0-9_$]+/g);
      classCount = classMatches ? classMatches.length : 0;
      const funcMatches = content.match(/\b(function\s*[\w$]*\s*\(|=>\s*\{|\b[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{)/g);
      functionCount = funcMatches ? funcMatches.length : 0;
    }

    return {
      relPath,
      lines,
      chars,
      classCount,
      functionCount,
      estTokens: Math.ceil(chars / 4)
    };
  }

  static sortMetrics(metricsList, sortBy) {
    sortBy = sortBy || 'lines';
    return [...metricsList].sort((a, b) => {
      if (sortBy === 'functions') return b.functionCount - a.functionCount;
      if (sortBy === 'classes') return b.classCount - a.classCount;
      if (sortBy === 'size') return b.chars - a.chars;
      return b.lines - a.lines;
    });
  }

  static calculateTotals(metricsList) {
    return metricsList.reduce((acc, f) => {
      acc.totalFiles += 1;
      acc.totalLines += f.lines;
      acc.totalClasses += f.classCount;
      acc.totalFunctions += f.functionCount;
      acc.totalChars += f.chars;
      acc.totalTokens += f.estTokens;
      return acc;
    }, { totalFiles: 0, totalLines: 0, totalClasses: 0, totalFunctions: 0, totalChars: 0, totalTokens: 0 });
  }

  static mountUI(container) {
    if (!container || typeof document === 'undefined') return;
    container.innerHTML = '';
    const m = LunoMetricsAnalyzer.makeElement;

    const currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';

    const card = m('div', {
      style: {
        background: '#161b22',
        border: '2px solid #00f2fe',
        borderRadius: '10px',
        padding: '1.1rem',
        marginBottom: '1.25rem',
        boxShadow: '0 4px 16px rgba(0, 242, 254, 0.15)',
        fontFamily: 'monospace'
      }
    });

    const projectSelect = m('select', {
      style: { background: '#0d1117', color: '#00f2fe', border: '1px solid #00f2fe', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' },
      onchange: (e) => {
        if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
          ClientApp.setTargetProject(e.target.value);
        }
        LunoMetricsAnalyzer.runAnalysis(card, e.target.value);
      }
    }, m('option', { value: currentTarget }, '📁 ' + currentTarget));

    setTimeout(async () => {
      try {
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchProjectsList) {
          const pData = await LunoApiClient.fetchProjectsList();
          if (pData && Array.isArray(pData.projects)) {
            projectSelect.innerHTML = '';
            pData.projects.forEach(p => {
              if (p.isLibrary || p.name === 'Library') return;
              const opt = document.createElement('option');
              opt.value = p.name;
              opt.textContent = '📁 ' + p.name + (p.name === 'Luno' ? ' (Core)' : '');
              if (p.name === currentTarget) opt.selected = true;
              projectSelect.appendChild(opt);
            });
          }
        }
      } catch (e) {}
    }, 40);

    const header = m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #30363d', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' } },
      m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
        m('h3', { style: { color: '#00f2fe', fontSize: '1.1rem', margin: 0 } }, '📊 Codebase Metrics & Function Counter'),
        projectSelect
      ),
      m('button', {
        style: { padding: '0.35rem 0.75rem', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
        onclick: () => LunoMetricsAnalyzer.runAnalysis(card, projectSelect.value)
      }, '▶ Run Analysis')
    );

    const contentArea = m('div', { id: 'metrics-content-area' },
      m('p', { style: { fontSize: '0.78rem', color: '#8b949e', margin: 0 } }, 'Scanning codebase files, lines of code (LOC), functions, and classes...')
    );

    card.appendChild(header);
    card.appendChild(contentArea);
    container.appendChild(card);

    LunoMetricsAnalyzer.runAnalysis(card, currentTarget);
  }

  static async runAnalysis(cardElement, projectOverride) {
      const contentArea = cardElement.querySelector('#metrics-content-area');
      if (!contentArea) return;

      const targetProj = projectOverride || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      const m = LunoMetricsAnalyzer.makeElement;

      contentArea.innerHTML = '';
      contentArea.appendChild(m('div', { style: { padding: '1rem', color: '#00f2fe', textAlign: 'center' } }, '⚡ Scanning codebase files for [' + targetProj + ']...'));

      try {
        const data = await LunoApiClient.fetchAllCode(targetProj, { includeProjectLibrary: false });
        if (!data || !data.success || !data.filesMap) {
          throw new Error((data && data.error) || 'Failed to fetch codebase files from storage');
        }

        let metricsList = [];
        if (data.filesMap) {
          metricsList = Object.keys(data.filesMap).map(filePath => {
            return LunoMetricsAnalyzer.analyzeFile(filePath, data.filesMap[filePath]);
          });
        }

        const totals = LunoMetricsAnalyzer.calculateTotals(metricsList);
        LunoMetricsAnalyzer.renderAnalysisResults(contentArea, metricsList, totals, targetProj);
      } catch (err) {
        contentArea.innerHTML = `<div style="padding:0.75rem; color:#ff7b72; background:#3c1418; border-radius:6px;">❌ Metrics Analysis Error: ${err.message}</div>`;
      }
  }
  static renderAnalysisResults(container, metricsList, totals, projectName) {
    container.innerHTML = '';
    const m = LunoMetricsAnalyzer.makeElement;
    const sorted = LunoMetricsAnalyzer.sortMetrics(metricsList, LunoMetricsAnalyzer.currentSortBy);

    const sortBtns = [
      { key: 'lines', label: '📄 Lines (LOC)' },
      { key: 'functions', label: '⚡ Functions' },
      { key: 'classes', label: '🏛️ Classes' },
      { key: 'size', label: '📦 Size (Bytes)' }
    ].map(b => {
      const isActive = LunoMetricsAnalyzer.currentSortBy === b.key;
      return m('button', {
        style: {
          padding: '0.3rem 0.6rem',
          fontSize: '0.72rem',
          fontWeight: 'bold',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          background: isActive ? '#00f2fe22' : '#0d1117',
          color: isActive ? '#00f2fe' : '#8b949e',
          border: '1px solid ' + (isActive ? '#00f2fe' : '#30363d')
        },
        onclick: () => {
          LunoMetricsAnalyzer.currentSortBy = b.key;
          LunoMetricsAnalyzer.renderAnalysisResults(container, metricsList, totals, projectName);
        }
      }, b.label);
    });

    const sortRow = m('div', {
      style: { display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#8b949e' }
    },
      m('span', { style: { fontWeight: 'bold' } }, 'Order By:'),
      ...sortBtns
    );

    const fileRows = sorted.map((f, idx) => {
      return m('div', {
        style: {
          background: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: '6px',
          padding: '0.55rem 0.75rem',
          marginBottom: '0.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.35rem',
          fontSize: '0.78rem'
        }
      },
        m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', flex: 1, minWidth: '180px' } },
          m('span', { style: { color: '#8b949e', fontSize: '0.7rem', width: '22px' } }, `#${idx + 1}`),
          m('strong', { style: { color: '#f0f6fc', wordBreak: 'break-all' } }, f.relPath)
        ),
        m('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'monospace' } },
          m('span', { style: { color: '#3fb950', background: '#0d2818', border: '1px solid #238636', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' } }, `📄 ${f.lines} LOC`),
          m('span', { style: { color: '#00f2fe', background: '#003847', border: '1px solid #00f2fe66', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' } }, `⚡ ${f.functionCount} func`),
          f.classCount > 0 ? m('span', { style: { color: '#d2a8ff', background: '#271052', border: '1px solid #8257e5', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' } }, `🏛️ ${f.classCount} class`) : null,
          m('span', { style: { color: '#8b949e', fontSize: '0.68rem' } }, `(${(f.chars / 1024).toFixed(1)} KB)`)
        )
      );
    });

    const totalsDashboard = m('div', {
      style: {
        background: 'linear-gradient(135deg, #1f104d 0%, #0d1117 100%)',
        border: '2px solid #8257e5',
        borderRadius: '8px',
        padding: '0.85rem 1rem',
        marginTop: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        boxShadow: '0 4px 16px rgba(130,87,229,0.25)'
      }
    },
      m('div', { style: { fontSize: '0.9rem', fontWeight: 'bold', color: '#d2a8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        m('span', {}, '🏆 Grand Totals Summary [' + (projectName || 'Active') + ']'),
        m('span', { style: { fontSize: '0.72rem', color: '#8b949e' } }, `${totals.totalFiles} File(s) Analyzed`)
      ),
      m('div', {
        style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', textAlign: 'center' }
      },
        m('div', { style: { background: '#070a13', border: '1px solid #30363d', borderRadius: '6px', padding: '0.55rem' } },
          m('div', { style: { color: '#8b949e', fontSize: '0.68rem', marginBottom: '0.2rem' } }, 'TOTAL LINES (LOC)'),
          m('div', { style: { color: '#3fb950', fontSize: '1.1rem', fontWeight: 'bold' } }, totals.totalLines.toLocaleString())
        ),
        m('div', { style: { background: '#070a13', border: '1px solid #30363d', borderRadius: '6px', padding: '0.55rem' } },
          m('div', { style: { color: '#8b949e', fontSize: '0.68rem', marginBottom: '0.2rem' } }, 'TOTAL FUNCTIONS'),
          m('div', { style: { color: '#00f2fe', fontSize: '1.1rem', fontWeight: 'bold' } }, totals.totalFunctions.toLocaleString())
        ),
        m('div', { style: { background: '#070a13', border: '1px solid #30363d', borderRadius: '6px', padding: '0.55rem' } },
          m('div', { style: { color: '#8b949e', fontSize: '0.68rem', marginBottom: '0.2rem' } }, 'TOTAL CLASSES'),
          m('div', { style: { color: '#d2a8ff', fontSize: '1.1rem', fontWeight: 'bold' } }, totals.totalClasses.toLocaleString())
        ),
        m('div', { style: { background: '#070a13', border: '1px solid #30363d', borderRadius: '6px', padding: '0.55rem' } },
          m('div', { style: { color: '#8b949e', fontSize: '0.68rem', marginBottom: '0.2rem' } }, 'TOTAL SIZE & TOKENS'),
          m('div', { style: { color: '#ff66cc', fontSize: '0.95rem', fontWeight: 'bold' } }, `${(totals.totalChars / 1024).toFixed(0)} KB (~${totals.totalTokens.toLocaleString()} tkn)`)
        )
      ),
      m('div', { style: { display: 'flex', gap: '0.4rem', marginTop: '0.25rem' } },
        m('button', {
          style: { flex: 1, padding: '0.55rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'monospace' },
          onclick: () => {
            const report = LunoMetricsAnalyzer.generateTextReport(sorted, totals, projectName);
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(report);
              if (typeof ClientApp !== 'undefined') ClientApp.showToast('Copied Codebase Metrics Report!', 'success', '📋');
            }
          }
        }, '📋 Copy Metrics Report'),
        m('button', {
          style: { flex: 1, padding: '0.55rem', background: '#161b22', color: '#00f2fe', border: '1px solid #00f2fe', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'monospace' },
          onclick: () => {
            const report = LunoMetricsAnalyzer.generateTextReport(sorted, totals, projectName);
            if (typeof OutboxQueue !== 'undefined') {
              OutboxQueue.addBundle('Codebase Metrics Report: ' + (projectName || 'Active'), report);
              if (typeof ClientApp !== 'undefined') ClientApp.showToast('Sent Metrics Report to Outbox!', 'success', '📤');
            }
          }
        }, 'Outbox ➔ Queue Report')
      )
    );

    container.appendChild(sortRow);
    const listWrapper = m('div', { style: { maxHeight: '420px', overflowY: 'auto', marginBottom: '0.5rem' } });
    fileRows.forEach(r => listWrapper.appendChild(r));
    container.appendChild(listWrapper);
    container.appendChild(totalsDashboard);
  }

  static generateTextReport(fileMetrics, totals, projectName) {
    const closeScript = '</' + 'script>';
    let report = '<script type="text/plain" data-file="codebase_metrics_report.txt">\n';
    report += `Project: ${projectName || 'Active Target'}\n`;
    report += `Date: ${new Date().toLocaleString()}\n`;
    report += `Total Files: ${totals.totalFiles}\n`;
    report += `Total Lines of Code (LOC): ${totals.totalLines}\n`;
    report += `Total Functions: ${totals.totalFunctions}\n`;
    report += `Total Classes: ${totals.totalClasses}\n`;
    report += `Total Size: ${(totals.totalChars / 1024).toFixed(1)} KB (~${totals.totalTokens} tokens)\n\n`;
    report += '--- FILE BREAKDOWN ---\n';
    fileMetrics.forEach((f, i) => {
      report += `${i + 1}. ${f.relPath} -> ${f.lines} LOC | ${f.functionCount} funcs | ${f.classCount} classes | ${(f.chars / 1024).toFixed(1)} KB\n`;
    });
    report += closeScript;
    return report;
  }
}

globalThis.LunoMetricsAnalyzer = LunoMetricsAnalyzer;
if (typeof module !== "undefined" && module.exports) module.exports = LunoMetricsAnalyzer;