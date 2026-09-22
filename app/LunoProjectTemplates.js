class LunoProjectTemplates {
  constructor() {}

  static TEMPLATES = [
    {
      id: 'blank',
      name: '🌱 Blank Starter Web App',
      desc: 'Single-page web application template with standalone vanilla JS architecture and error boundary.',
      files: {
        'luno.json': '{\n  "name": "Starter Web App",\n  "version": "1.0.0",\n  "description": "Custom Luno web application",\n  "type": "luno-web-app",\n  "entrypoint": {\n    "file": "src/App.js",\n    "class": "App",\n    "method": "run"\n  },\n  "main": ["src/App.js"],\n  "library": ["DomBasics.js"],\n  "styles": ["css/style.css"]\n}',
        'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>Starter App</title>\n  <link rel="stylesheet" href="css/style.css">\n  <script src="/Library/LunoLoader.js"><\/script>\n</head>\n<body>\n  <div id="app-container"></div>\n  <script>\n    document.addEventListener("DOMContentLoaded", function() {\n      if (typeof LunoLoader !== "undefined") {\n        LunoLoader.loadApp("app-container");\n      }\n    });\n  <\/script>\n</body>\n</html>',
        'css/style.css': '* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { background: #0d1117; color: #c9d1d9; font-family: monospace; min-height: 100vh; padding: 1.5rem; }',
        'src/App.js': 'class App {\n  async run(env) {\n    const target = (env && env.container) || document.getElementById("app-container") || document.body;\n    target.innerHTML = "";\n    const card = document.createElement("div");\n    card.style.cssText = "padding: 2rem; background: #161b22; border: 2px solid #00f2fe; border-radius: 10px; text-align: center; font-family: monospace; color: #00f2fe; max-width: 600px; margin: 2rem auto; box-shadow: 0 4px 16px rgba(0,242,254,0.2);";\n    card.innerHTML = "<h2>🚀 Welcome to Your New Project</h2><p style=\'color: #8b949e; margin-top: 0.5rem; font-size: 0.85rem;\'>Initialized cleanly. Ready for rapid development in Luno!</p>";\n    target.appendChild(card);\n  }\n}\n\nglobalThis.App = App;\nif (typeof module !== "undefined" && module.exports) module.exports = App;'
      }
    },
    {
      id: '3d_app',
      name: '🎲 3D Canvas App (ThreeJSLoader)',
      desc: 'Interactive 3D Three.js viewport starter with automated lighting, reflections, and camera setup.',
      files: {
        'luno.json': '{\n  "name": "Starter 3D App",\n  "version": "1.0.0",\n  "description": "3D Canvas Viewport via ThreeJSLoader",\n  "type": "luno-3d-app",\n  "entrypoint": {\n    "file": "src/App3D.js",\n    "class": "App3D",\n    "method": "run"\n  },\n  "main": ["src/App3D.js"],\n  "library": ["DomBasics.js", "ThreeJSLoader.js"],\n  "styles": ["css/app3d.css"]\n}',
        'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>3D Canvas App</title>\n  <link rel="stylesheet" href="css/app3d.css">\n  <script src="/Library/LunoLoader.js"><\/script>\n</head>\n<body>\n  <div id="app-container"></div>\n  <script>\n    document.addEventListener("DOMContentLoaded", function() {\n      if (typeof LunoLoader !== "undefined") {\n        LunoLoader.loadApp("app-container");\n      }\n    });\n  <\/script>\n</body>\n</html>',
        'css/app3d.css': '* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { background: #070a13; color: #00f2fe; font-family: monospace; overflow: hidden; height: 100vh; }',
        'src/App3D.js': 'class App3D {\n  async run(env) {\n    const target = (env && env.container) || document.getElementById("app-container") || document.body;\n    target.innerHTML = "";\n    \n    // Universal ThreeJSLoader handles camera, lighting, and rendering loop\n    const app = await ThreeJSLoader.load({ container: target });\n    \n    const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 128, 32);\n    const material = new THREE.MeshStandardMaterial({\n      color: 0x00f2fe,\n      roughness: 0.25,\n      metalness: 0.85\n    });\n    const mesh = new THREE.Mesh(geometry, material);\n    app.scene.add(mesh);\n    \n    app.onAnimate = (delta) => {\n      mesh.rotation.x += delta * 0.4;\n      mesh.rotation.y += delta * 0.7;\n    };\n  }\n}\n\nglobalThis.App3D = App3D;\nif (typeof module !== "undefined" && module.exports) module.exports = App3D;'
      }
    }
  ];
  static openTemplateWizard() {
    try { localStorage.setItem('luno_project_intent', 'create_project'); } catch(e){}
    if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.mountView) {
      LunoSpaDock.mountView('projects');
    } else {
      const mainRoot = document.getElementById('luno-spa-content-area') || document.getElementById('app-root') || document.body;
      LunoProjectTemplates.mountFullPageView(mainRoot);
    }
  }

  static async mountFullPageView(container) {
    if (!container) return;
    container.innerHTML = '';

    const el = (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement)
      ? LunoUIComponents.makeElement
      : function(tag, attrs) {
          const e = document.createElement(tag || 'div');
          if (attrs && typeof attrs === 'object') Object.assign(e, attrs);
          return e;
        };

    const loadingCard = el('div', {
      style: { padding: '1.5rem', background: '#161b22', border: '1px solid #00f2fe', borderRadius: '10px', color: '#00f2fe', textAlign: 'center', fontFamily: 'monospace' }
    }, '⚡ Discovering workspace projects...');

    container.appendChild(loadingCard);

    let projects = [];
    let parentDir = '';
    try {
      if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchProjectsList) {
        const data = await LunoApiClient.fetchProjectsList();
        projects = data.projects || [];
        parentDir = data.parentDir || '';
      } else {
        const res = await fetch('/api/projects/list');
        const data = await res.json();
        projects = data.projects || [];
        parentDir = data.parentDir || '';
      }
    } catch (err) {
      console.error('[Projects View Error]', err);
    }

    LunoProjectTemplates.renderFullPageUI(container, projects, parentDir);
  }

  static renderFullPageUI(container, projects = [], parentDir = '') {
      container.innerHTML = '';
      const m = (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement)
        ? LunoUIComponents.makeElement
        : function(tag, attrs) {
            const e = document.createElement(tag || 'div');
            if (attrs && typeof attrs === 'object') Object.assign(e, attrs);
            for (let i = 2; i < arguments.length; i++) {
              const c = arguments[i];
              if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            }
            return e;
          };

      const currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      const currentAccount = (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.getGithubAccount)
        ? LunoDeployEngine.getGithubAccount()
        : 'karmatics';
      const savedToken = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getGithubToken() : '';

      const headerBox = m('div', {
        style: { background: '#161b22', border: '2px solid #00f2fe', borderRadius: '10px', padding: '1rem', marginBottom: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 4px 16px rgba(0,242,254,0.15)' }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' } },
          m('h2', { style: { color: '#00f2fe', fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' } }, '🚀 Workspace Projects & Deploy Hub'),
          m('div', { style: { display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' } },
            m('span', { style: { fontSize: '0.72rem', color: '#00f2fe', background: '#003847', border: '1px solid #00f2fe', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' } }, 'GitHub: ' + currentAccount),
            m('span', { style: { fontSize: '0.72rem', color: '#3fb950', background: '#0d2818', border: '1px solid #238636', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' } }, 'Target: ' + currentTarget),
            m('button', {
              style: { padding: '0.25rem 0.6rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' },
              title: 'Download complete backup of all projects in a single ZIP file',
              onclick: function() {
                if (typeof LunoZipExporter !== 'undefined' && LunoZipExporter.downloadAllProjectsAsZip) {
                  LunoZipExporter.downloadAllProjectsAsZip();
                }
              }
            }, '📦 Backup All (.ZIP)')
          )
        ),
        m('p', { style: { fontSize: '0.78rem', color: '#8b949e', margin: 0, lineHeight: '1.4' } },
          'Manage, preview, and deploy workspace applications to GitHub Pages under ',
          m('strong', { style: { color: '#00f2fe' } }, currentAccount),
          '. Tap ',
          m('strong', { style: { color: '#00f2fe' } }, '👁️ Preview'),
          ' to launch, or expand any card for 1-tap deploy.'
        )
      );

      const accountInput = m('input', {
        id: 'luno-github-account-input',
        type: 'text',
        value: currentAccount,
        placeholder: 'karmatics',
        style: { width: '130px', background: '#0d1117', color: '#00f2fe', border: '1px solid #00f2fe', padding: '0.45rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold', outline: 'none' },
        oninput: function(e) {
          if (typeof LunoDeployEngine !== 'undefined') {
            LunoDeployEngine.setGithubAccount(e.target.value);
          }
        }
      });

      const tokenInput = m('input', {
        id: 'luno-github-pat-input',
        type: 'password',
        value: savedToken,
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx (PAT token with repo scope)',
        style: { flex: 1, minWidth: '220px', background: '#0d1117', color: '#7ee787', border: '1px solid #30363d', padding: '0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', outline: 'none' },
        oninput: function(e) {
          if (typeof LunoDeployEngine !== 'undefined') {
            LunoDeployEngine.setGithubToken(e.target.value);
          }
        }
      });

      const btnSaveCreds = m('button', {
        style: { padding: '0.45rem 0.85rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', whiteSpace: 'nowrap' },
        onclick: function() {
          if (typeof LunoDeployEngine !== 'undefined') {
            LunoDeployEngine.setGithubAccount(accountInput.value);
            LunoDeployEngine.setGithubToken(tokenInput.value);
            if (LunoDeployEngine.gitStatusCache) LunoDeployEngine.gitStatusCache.clear();
            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
              ClientApp.showToast('Saved GitHub Account [' + LunoDeployEngine.getGithubAccount() + '] & Token!', 'success', '🔑');
            }
            LunoProjectTemplates.renderFullPageUI(container, projects, parentDir);
          }
        }
      }, 'Save Credentials');

      const credsCard = m('div', {
        style: { background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
            m('strong', { style: { color: '#d2a8ff', fontSize: '0.82rem' } }, '🐙 GitHub Account:'),
            accountInput
          ),
          m('a', { href: 'https://github.com/settings/tokens/new?scopes=repo', target: '_blank', style: { color: '#58a6ff', fontSize: '0.72rem', textDecoration: 'none' } }, 'Generate Token on GitHub ↗')
        ),
        m('div', { style: { display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' } },
          m('span', { style: { fontSize: '0.75rem', color: '#8b949e', fontWeight: 'bold' } }, 'PAT Token:'),
          tokenInput,
          btnSaveCreds
        ),
        m('div', { style: { fontSize: '0.7rem', color: '#8b949e', lineHeight: '1.3' } },
          'Deploying automatically creates repos under ',
          m('strong', { style: { color: '#00f2fe' } }, 'github.com/' + currentAccount),
          ' and publishes to ',
          m('strong', { style: { color: '#3fb950' } }, currentAccount.toLowerCase() + '.github.io'),
          '.'
        )
      );

      // Central Library project
      const libProject = projects.find(p => p.isLibrary || p.name === 'Library') || {
        name: 'Library',
        isLibrary: true,
        description: 'Central shared dependency hub containing DomBasics.js, ThreeJSLoader.js, audio synthesizers, and UI windowing engines.',
        fileCount: 48,
        version: '1.0.0'
      };

      const librarySection = m('div', { style: { marginBottom: '0.85rem' } },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' } },
          m('strong', { style: { color: '#d2a8ff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' } }, '📚 Shared Dependency Hub (Deploy Once)'),
          m('span', { style: { fontSize: '0.7rem', color: '#8b949e' } }, 'Enables /Library/... across all sibling apps')
        ),
        LunoProjectTemplates.buildProjectCard(libProject, container)
      );

      // User applications list
      const userProjects = projects.filter(p => !p.isLibrary && p.name !== 'Library');

      userProjects.sort((a, b) => {
        const order = { 'BasicsWithDialogBox': 1, 'Basic3D': 2, 'AardvarkPlaylist': 3, 'Luno': 4 };
        const rankA = order[a.name] || 999;
        const rankB = order[b.name] || 999;
        if (rankA !== rankB) return rankA - rankB;
        return (a.name || '').localeCompare(b.name || '');
      });

      const projectCards = userProjects.map(p => LunoProjectTemplates.buildProjectCard(p, container));
      const userProjectsHeader = m('strong', { style: { color: '#00f2fe', fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' } }, '📁 Sibling Applications (' + userProjects.length + ')');

      const listContainer = m('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.5rem' }
      }, ...projectCards);

      container.appendChild(headerBox);
      container.appendChild(credsCard);
      container.appendChild(librarySection);
      container.appendChild(userProjectsHeader);
      container.appendChild(listContainer);
  }
  static buildProjectCard(p, container) {
      const el = (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement)
        ? LunoUIComponents.makeElement
        : function(tag, attrs) {
            const e = document.createElement(tag || 'div');
            if (attrs && typeof attrs === 'object') Object.assign(e, attrs);
            for (let i = 2; i < arguments.length; i++) {
              const c = arguments[i];
              if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            }
            return e;
          };

      const isLib = p.isLibrary || p.name === 'Library';
      const isCore = (p.name === 'Luno');
      const currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : '';
      const isActive = (p.name === currentTarget);
      const isExpanded = LunoProjectTemplates.expandedProjects.has(p.name);
      const isStatic = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.isStaticHosting());

      const card = el('div', {
        className: 'luno-project-card',
        style: {
          background: isActive ? '#0d2818' : (isLib ? '#170f2a' : '#0d1117'),
          border: '1px solid ' + (isActive ? '#238636' : (isLib ? '#8257e5' : '#30363d')),
          borderRadius: '8px',
          padding: '0.75rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          boxShadow: isActive ? '0 0 12px rgba(35,134,54,0.3)' : (isLib ? '0 0 12px rgba(130,87,229,0.2)' : 'none'),
          transition: 'border-color 0.15s ease, background-color 0.15s ease'
        }
      });
      card.setAttribute('data-project-name', p.name);

      const arrow = el('span', {
        style: {
          fontSize: '0.8rem',
          color: isExpanded ? '#00f2fe' : '#8b949e',
          fontWeight: 'bold',
          marginLeft: '0.35rem',
          cursor: 'pointer',
          userSelect: 'none'
        }
      }, isExpanded ? '▲' : '▼');

      const statusBadge = el('span', {
        className: 'project-status-badge',
        style: {
          fontSize: '0.68rem',
          fontWeight: 'bold',
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          background: isActive ? '#238636' : (isLib ? '#271052' : '#21262d'),
          color: isActive ? '#fff' : (isLib ? '#d2a8ff' : '#8b949e'),
          border: isLib ? '1px solid #8257e5' : 'none'
        }
      }, isActive ? '✓ Active Target' : (isLib ? 'Shared Dependency Hub' : (isCore ? 'Self-Improve' : 'Project')));

      const btnPreview = el('button', {
        style: {
          display: isCore ? 'none' : 'inline-block',
          padding: '0.3rem 0.6rem',
          background: '#161b22',
          color: isLib ? '#d2a8ff' : '#00f2fe',
          border: '1px solid ' + (isLib ? '#8257e5' : '#00f2fe'),
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        },
        onclick: (e) => {
          e.stopPropagation();
          if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
            ClientApp.setTargetProject(p.name, { openTab: true });
          }
          if (typeof LunoSpaDock !== 'undefined') {
            LunoSpaDock.mountView('app_' + p.name);
          }
        }
      }, isLib ? '👁️ Catalog' : '👁️ Preview');

      const btnSetTarget = el('button', {
        className: 'btn-set-project-target',
        style: {
          display: (!isActive && !isLib) ? 'inline-block' : 'none',
          padding: '0.3rem 0.6rem',
          background: '#238636',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        },
        onclick: (e) => {
          e.stopPropagation();
          if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
            ClientApp.setTargetProject(p.name);
            if (typeof ClientApp.showToast === 'function') {
              ClientApp.showToast('Active Target switched to ' + p.name, 'success', '📁');
            }
          }
        }
      }, '⚡ Set Target');

      const topRow = el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '0.4rem' },
        onclick: async (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
          const nowExpanded = !LunoProjectTemplates.expandedProjects.has(p.name);
          if (nowExpanded) {
            LunoProjectTemplates.expandedProjects.add(p.name);
          } else {
            LunoProjectTemplates.expandedProjects.delete(p.name);
          }
          arrow.textContent = nowExpanded ? '▲' : '▼';
          arrow.style.color = nowExpanded ? '#00f2fe' : '#8b949e';
          expandPanel.style.display = nowExpanded ? 'flex' : 'none';

          if (nowExpanded && !expandPanel.dataset.loaded) {
            expandPanel.dataset.loaded = 'true';
            if (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.renderProjectDeployPanel) {
              await LunoDeployEngine.renderProjectDeployPanel(p.name, el, deploySlot);
            }
          }
        }
      },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' } },
          el('strong', { style: { color: isActive ? '#3fb950' : (isLib ? '#d2a8ff' : '#00f2fe'), fontSize: '0.95rem' } },
            (isLib ? '📚 ' : '📁 ') + p.name + ' ',
            el('span', { style: { fontWeight: 'normal', fontSize: '0.72rem', color: '#8b949e' } }, '(' + (p.version || '1.0.0') + ')')
          ),
          statusBadge
        ),
        el('div', { style: { display: 'flex', gap: '0.35rem', alignItems: 'center' } },
          btnPreview,
          btnSetTarget,
          arrow
        )
      );

      const deploySlot = el('div', { style: { width: '100%' } });
      const expandPanel = el('div', {
        className: 'luno-project-expand-panel',
        style: {
          display: isExpanded ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: '0.35rem',
          paddingTop: '0.45rem',
          borderTop: '1px solid #21262d'
        }
      },
        el('div', { style: { fontSize: '0.78rem', color: '#c9d1d9', lineHeight: '1.35' } }, p.description || 'Shared dependency hub containing common modules.'),
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#8b949e', flexWrap: 'wrap', gap: '0.4rem' } },
          el('span', {}, '📊 ' + (p.fileCount || 0) + ' file(s)'),
          el('div', { style: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' } },
            el('button', {
              style: { padding: '0.25rem 0.55rem', background: '#0d2818', color: '#3fb950', border: '1px solid #238636', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'monospace' },
              title: 'Download complete project as a standard .ZIP file',
              onclick: (e) => {
                e.stopPropagation();
                if (typeof LunoZipExporter !== 'undefined' && LunoZipExporter.downloadProjectAsZip) {
                  LunoZipExporter.downloadProjectAsZip(p.name);
                }
              }
            }, '⬇️ ZIP'),
            isStatic ? el('button', {
              style: { padding: '0.25rem 0.55rem', background: '#161b22', color: '#00f2fe', border: '1px solid #00f2fe88', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'monospace' },
              title: 'Clear IndexedDB cache and re-fetch clean files from GitHub Pages',
              onclick: async (e) => {
                e.stopPropagation();
                if (confirm('🔄 Reset [' + p.name + '] cache in browser storage to match the deployed version on GitHub Pages? (Any unsaved local edits in this browser will be replaced)')) {
                  if (typeof LunoIndexedDbAdapter !== 'undefined' && LunoIndexedDbAdapter.resetProjectToDeployed) {
                    await LunoIndexedDbAdapter.resetProjectToDeployed(p.name);
                    if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                      ClientApp.showToast('Reset [' + p.name + '] to latest deployed version!', 'success', '🔄');
                    }
                    if (typeof LunoSpaDock !== 'undefined') {
                      LunoSpaDock.reloadActivePreviewIframe(p.name);
                    }
                  }
                }
              }
            }, '🔄 Reset Cache') : null,
            (!isCore && !isLib) ? el('button', {
              style: { padding: '0.25rem 0.55rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'monospace' },
              onclick: (e) => { e.stopPropagation(); LunoProjectTemplates.forkProject(p.name, container); }
            }, '🍴 Fork') : null,
            (!isCore && !isLib) ? el('button', {
              style: { padding: '0.25rem 0.55rem', background: '#21262d', color: '#ff7b72', border: '1px solid #da3633', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'monospace' },
              onclick: (e) => { e.stopPropagation(); LunoProjectTemplates.deleteProject(p.name, container); }
            }, '🗑️ Delete') : null
          )
        ),
        deploySlot
      );

      if (isExpanded) {
        expandPanel.dataset.loaded = 'true';
        if (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.renderProjectDeployPanel) {
          LunoDeployEngine.renderProjectDeployPanel(p.name, el, deploySlot);
        }
      }

      card.appendChild(topRow);
      card.appendChild(expandPanel);
      return card;
  }
  static async deleteProject(projectName, container) {
      if (!projectName || projectName === 'Luno' || projectName.toLowerCase() === 'library') {
        alert('Cannot delete core system or shared library folders.');
        return;
      }

      const confirmDelete = confirm('⚠️ Are you sure you want to permanently delete project [' + projectName + ']? This cannot be undone.');
      if (!confirmDelete) return;

      try {
        const isStatic = (typeof LunoFileSystem !== 'undefined' && typeof LunoFileSystem.isStaticHosting === 'function')
          ? LunoFileSystem.isStaticHosting()
          : (typeof LunoApiClient !== 'undefined' && LunoApiClient.isStaticMode());

        if (isStatic) {
          if (typeof LunoIndexedDbAdapter !== 'undefined' && LunoIndexedDbAdapter.deleteProject) {
            await LunoIndexedDbAdapter.deleteProject(projectName);
            if (typeof ClientApp !== 'undefined') {
              if (ClientApp.getTargetProject() === projectName) {
                ClientApp.setTargetProject('Luno');
              }
              if (ClientApp.showToast) {
                ClientApp.showToast('Deleted project [' + projectName + '] from browser storage', 'info', '🗑️');
              }
            }
            LunoProjectTemplates.mountFullPageView(container);
            return;
          }
        }

        const serverScriptObj = {
          files: [],
          serverScript: [
            'const fs = require("fs");',
            'const path = require("path");',
            'const projRoot = LunoServer.resolveProjectBaseDir("' + projectName + '");',
            'const webRoot = LunoServer.getWebRootDir();',
            'if (projRoot && projRoot.startsWith(webRoot) && projRoot !== webRoot && !projRoot.endsWith("Luno")) {',
            '  fs.rmSync(projRoot, { recursive: true, force: true });',
            '  return "Deleted project folder: " + projRoot;',
            '} else {',
            '  throw new Error("Invalid project deletion path target.");',
            '}'
          ].join('\n')
        };

        const data = await LunoApiClient.savePayload(serverScriptObj, projectName);

        if (data && data.success) {
          if (typeof ClientApp !== 'undefined') {
            if (ClientApp.getTargetProject() === projectName) {
              ClientApp.setTargetProject('Luno');
            }
            if (ClientApp.showToast) {
              ClientApp.showToast('Deleted project [' + projectName + '] from disk', 'info', '🗑️');
            }
          }
          LunoProjectTemplates.mountFullPageView(container);
        } else {
          alert('Delete failed: ' + ((data && data.error) || 'Storage error'));
        }
      } catch (e) {
        alert('Delete exception: ' + e.message);
      }
  }
  static async createFromTemplate(templateId, parentDir) {
        const tpl = LunoProjectTemplates.TEMPLATES.find(t => t.id === templateId);
        if (!tpl) return;

        const rawName = prompt('Enter new project name (letters, numbers, underscores):', 'my_new_app');
        if (!rawName) return;

        const cleanName = rawName.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
        if (!cleanName) {
          alert('Invalid project name. Please use alphanumeric characters, dashes, or underscores.');
          return;
        }

        var resilientLoaderTag = '<script src="/Library/LunoLoader.js" onerror="this.onerror=null; (function(el){ var u=(window.location.hostname.endsWith(\'.github.io\')?window.location.hostname.split(\'.\')[0]:\'karmatics\'); el.src=\'https://\'+u+\'.github.io/Library/LunoLoader.js\'; el.onerror=function(){ el.onerror=null; el.src=\'https://karmatics.github.io/Library/LunoLoader.js\'; }; })(this);"><\/script>';

        let filesList = [];
        for (const [relFile, content] of Object.entries(tpl.files)) {
          let fileContent = content;
          if (relFile === 'index.html') {
            fileContent = fileContent.replace(
              /<script[^>]*src=["'][^"']*LunoLoader\.js["'][^>]*>\s*<\/script>/i,
              resilientLoaderTag
            );
          }
          filesList.push({
            filePath: cleanName + '/' + relFile,
            content: fileContent,
            action: 'direct'
          });
        }

        filesList.push({
          filePath: cleanName + '/.nojekyll',
          content: '',
          action: 'direct'
        });

        try {
          if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
            ClientApp.setTargetProject(cleanName, { openTab: true });
          }

          await LunoApiClient.savePayload({ files: filesList, serverScript: '', project: cleanName }, cleanName);

          if (typeof LunoSpaDock !== 'undefined') {
            LunoSpaDock.mountView('app_' + cleanName);
          }
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Created project [' + cleanName + '] from template!', 'success', '🌱');
          }
        } catch (e) {
          alert('Error creating project: ' + e.message);
        }
      }
  static async forkProject(sourceProjectName, container) {
    if (!sourceProjectName) return;

    var defaultNewName = sourceProjectName + '_fork';
    var rawName = prompt('Enter name for your new project fork (cloning ' + sourceProjectName + '):', defaultNewName);
    if (!rawName) return;

    var cleanNewName = rawName.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
    if (!cleanNewName) {
      alert('Invalid project name. Please use alphanumeric characters, dashes, or underscores.');
      return;
    }

    if (cleanNewName === sourceProjectName) {
      alert('Fork name must be different from the source project name.');
      return;
    }

    if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
      ClientApp.showToast('Forking [' + sourceProjectName + '] into [' + cleanNewName + '] (with all media & class renaming)...', 'info', '🍴');
    }

    try {
      var data = await LunoApiClient.forkProject(sourceProjectName, cleanNewName);

      if (data && data.success) {
        if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
          ClientApp.setTargetProject(cleanNewName, { openTab: true });
          if (ClientApp.showToast) {
            ClientApp.showToast('Successfully forked [' + sourceProjectName + '] into [' + cleanNewName + ']! (' + (data.copiedFilesCount || 0) + ' files preserved, class renamed to ' + (data.entrypointClass || 'App') + ')', 'success', '🚀');
          }
        }

        if (typeof LunoSpaDock !== 'undefined') {
          LunoSpaDock.mountView('app_' + cleanNewName);
        } else if (container) {
          LunoProjectTemplates.mountFullPageView(container);
        }
      } else {
        throw new Error((data && data.error) || 'Failed to fork project on server');
      }
    } catch (err) {
      console.error('[Fork Project Error]', err);
      alert('Error forking project: ' + err.message);
    }
  }

  static expandedProjects = new Set();
}

globalThis.LunoProjectTemplates = LunoProjectTemplates;
if (typeof module !== "undefined" && module.exports) module.exports = LunoProjectTemplates;