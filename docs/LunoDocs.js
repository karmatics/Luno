class LunoDocs {
  constructor() {}

  static activeTab = 'instructions';

  static renderHeader(m) {
    return m('header', { style: { borderBottom: '1px solid #30363d', paddingBottom: '0.65rem', marginBottom: '0.75rem' } },
      m('h1', { style: { color: '#00f2fe', fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' } }, '📖 Luno Protocol & Architecture Hub'),
      m('div', { style: { fontSize: '0.75rem', color: '#8b949e', marginTop: '0.2rem' } },
        'Comprehensive reference for HTML container directives, modular prompt guidelines, SVG vector studio, demand-paged context, and REST APIs'
      )
    );
  }

  static renderSubNav(m, container) {
      const tabs = [
        { key: 'instructions', label: '📋 Instructions Hub' },
        { key: 'overview', label: '📖 Architecture & Guides' },
        { key: 'context', label: '🧠 Demand-Paged Context' },
        { key: 'metrics', label: '📊 Codebase Metrics' },
        { key: 'stringifier', label: '🔬 Runtime Stringifier' },
        { key: 'satellite_tools', label: '🚀 Satellite Sibling Projects' }
      ];

      const tabBtns = tabs.map(t => {
        const isActive = globalThis.LunoDocs.activeTab === t.key;
        return m('button', {
          style: {
            padding: '0.4rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            background: isActive ? '#238636' : '#21262d',
            color: isActive ? '#ffffff' : '#c9d1d9',
            border: '1px solid ' + (isActive ? '#3fb950' : '#30363d')
          },
          onclick: () => {
            globalThis.LunoDocs.activeTab = t.key;
            globalThis.LunoDocs.mountUI(container);
          }
        }, t.label);
      });

      return m('div', {
        style: { display: 'flex', gap: '0.35rem', marginBottom: '1rem', borderBottom: '1px solid #21262d', paddingBottom: '0.5rem', overflowX: 'auto' }
      }, ...tabBtns);
    }

  static mountUI(container) {
      if (!container) return;
      container.innerHTML = '';

      var m = (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement)
        ? LunoUIComponents.makeElement
        : function(tag, attrs) {
            var el = document.createElement(tag || 'div');
            if (attrs && typeof attrs === 'object') Object.assign(el, attrs);
            for (var i = 2; i < arguments.length; i++) {
              var c = arguments[i];
              if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            }
            return el;
          };

      var header = globalThis.LunoDocs.renderHeader(m);
      var subNav = globalThis.LunoDocs.renderSubNav(m, container);
      var contentBox = m('div', { id: 'docs-content-area' });

      container.appendChild(header);
      container.appendChild(subNav);
      container.appendChild(contentBox);

      var tab = globalThis.LunoDocs.activeTab;

      if (tab === 'instructions') {
        if (typeof LunoPromptInstructions !== 'undefined' && LunoPromptInstructions.mountUI) {
          LunoPromptInstructions.mountUI(contentBox);
        }
      } else if (tab === 'overview') {
        // Dynamic Markdown Document Reader
        var docViewer = m('div', {
          style: { background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'monospace' }
        });

        var docSelect = m('select', {
          style: { background: '#0d1117', color: '#00f2fe', border: '1px solid #00f2fe', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', outline: 'none' },
          onchange: async function(e) {
            var selectedDoc = e.target.value;
            if (!selectedDoc) return;
            docContentPre.textContent = '⚡ Loading ' + selectedDoc + '...';
            try {
              var res = await LunoApiClient.fetchFsRead(selectedDoc, 'Luno');
              if (res && res.success && res.content !== undefined) {
                docContentPre.textContent = res.content;
              } else {
                docContentPre.textContent = 'Unable to load doc: ' + (res && res.error);
              }
            } catch(err) {
              docContentPre.textContent = 'Error: ' + err.message;
            }
          }
        },
          m('option', { value: 'docs/LunoWorkspaceHandoff.md' }, '📄 LunoWorkspaceHandoff.md (Master Dossier)'),
          m('option', { value: 'docs/LunoModularizationProposal.md' }, '📄 LunoModularizationProposal.md (v3.8 Architecture)'),
          m('option', { value: 'docs/archive/TieredStorageSpec.md' }, '📦 archive/TieredStorageSpec.md'),
          m('option', { value: 'docs/archive/SPS1.md' }, '📦 archive/SPS1.md (Sibling Project Survey)'),
          m('option', { value: 'docs/archive/SPS4.md' }, '📦 archive/SPS4.md (GitHub Pages Blueprint)')
        );

        var docContentPre = m('pre', {
          style: { background: '#070a13', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.85rem', color: '#7ee787', fontSize: '0.76rem', lineHeight: '1.45', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '440px', overflowY: 'auto', margin: 0 },
          textContent: 'Select a documentation guide from the dropdown to load on demand...'
        });

        var docHeaderRow = m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
          m('strong', { style: { color: '#00f2fe', fontSize: '0.9rem' } }, '📖 On-Demand Documentation Reader'),
          docSelect
        );

        docViewer.appendChild(docHeaderRow);
        docViewer.appendChild(docContentPre);
        contentBox.appendChild(docViewer);

        setTimeout(function() {
          docSelect.dispatchEvent(new Event('change'));
        }, 50);

      } else if (tab === 'context') {
        if (typeof LunoDocsWidgets !== 'undefined' && LunoDocsWidgets.createDemandPagedSandbox) {
          contentBox.appendChild(LunoDocsWidgets.createDemandPagedSandbox());
        }
      } else if (tab === 'metrics') {
        if (typeof LunoMetricsAnalyzer !== 'undefined' && LunoMetricsAnalyzer.mountUI) {
          LunoMetricsAnalyzer.mountUI(contentBox);
        }
      } else if (tab === 'stringifier') {
        if (typeof LunoRuntimeStringifier !== 'undefined' && LunoRuntimeStringifier.mountUI) {
          LunoRuntimeStringifier.mountUI(contentBox);
        }
      } else if (tab === 'satellite_tools') {
        var toolsCard = m('div', {
          style: { background: '#161b22', border: '2px solid #8257e5', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'monospace' }
        },
          m('h3', { style: { color: '#d2a8ff', margin: 0, fontSize: '1rem' } }, '🚀 Standalone Sibling Tool Projects'),
          m('p', { style: { fontSize: '0.78rem', color: '#8b949e', margin: 0, lineHeight: '1.4' } },
            'Decoupled from Luno Core into independent peer projects. Click any card to launch its dedicated preview tab:'
          ),
          m('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
            // Tool 1: LunoTests
            m('div', {
              style: { background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }
            },
              m('div', {},
                m('strong', { style: { color: '#3fb950', fontSize: '0.85rem', display: 'block' } }, '🧪 LunoTests (Diagnostic Test Suite)'),
                m('span', { style: { fontSize: '0.72rem', color: '#8b949e' } }, '63 automated tests verifying AST parsing, backslash parity, and regex handling.')
              ),
              m('button', {
                style: { padding: '0.35rem 0.65rem', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
                onclick: function() {
                  if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) ClientApp.setTargetProject('LunoTests', { openTab: true });
                  if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('app_LunoTests');
                }
              }, '▶ Launch LunoTests Tab')
            ),
            // Tool 2: SvgStudio
            m('div', {
              style: { background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }
            },
              m('div', {},
                m('strong', { style: { color: '#00f2fe', fontSize: '0.85rem', display: 'block' } }, '🎨 SvgStudio (Vector Design Studio)'),
                m('span', { style: { fontSize: '0.72rem', color: '#8b949e' } }, 'Visual vector editor with real-time zooming, preset gallery, color picker, and live stage.')
              ),
              m('button', {
                style: { padding: '0.35rem 0.65rem', background: '#003847', color: '#00f2fe', border: '1px solid #00f2fe', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
                onclick: function() {
                  if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) ClientApp.setTargetProject('SvgStudio', { openTab: true });
                  if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('app_SvgStudio');
                }
              }, '🎨 Launch SvgStudio Tab')
            ),
            // Tool 3: Es6Converter
            m('div', {
              style: { background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }
            },
              m('div', {},
                m('strong', { style: { color: '#d2a8ff', fontSize: '0.85rem', display: 'block' } }, '⚡ Es6Converter (Class Refactoring Tool)'),
                m('span', { style: { fontSize: '0.72rem', color: '#8b949e' } }, 'Modernizes legacy prototype code and scripts into clean ES6 classes with smart comments.')
              ),
              m('button', {
                style: { padding: '0.35rem 0.65rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
                onclick: function() {
                  if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) ClientApp.setTargetProject('Es6Converter', { openTab: true });
                  if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('app_Es6Converter');
                }
              }, '⚡ Launch Es6Converter Tab')
            ),
            // Tool 4: BookmarkletWorkshop
            m('div', {
              style: { background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }
            },
              m('div', {},
                m('strong', { style: { color: '#f7df1e', fontSize: '0.85rem', display: 'block' } }, '🤖 BookmarkletWorkshop (Relay Driver & Suite)'),
                m('span', { style: { fontSize: '0.72rem', color: '#8b949e' } }, 'Collapsible code block widget suite, drag-and-drop bookmarklet encoder, and postMessage driver.')
              ),
              m('button', {
                style: { padding: '0.35rem 0.65rem', background: '#2c2800', color: '#f7df1e', border: '1px solid #f7df1e88', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
                onclick: function() {
                  if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) ClientApp.setTargetProject('BookmarkletWorkshop', { openTab: true });
                  if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('app_BookmarkletWorkshop');
                }
              }, '🤖 Launch Bookmarklet Tab')
            )
          )
        );
        contentBox.appendChild(toolsCard);
      }
    }
}

globalThis.LunoDocs = LunoDocs;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoDocs;