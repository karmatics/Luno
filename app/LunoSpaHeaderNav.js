class LunoSpaHeaderNav {
  constructor() {}

  static getOpenProjectTabs() {
    try {
      var raw = localStorage.getItem('luno_open_project_tabs');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  static saveOpenProjectTabs(tabs) {
    try {
      localStorage.setItem('luno_open_project_tabs', JSON.stringify(tabs));
    } catch(e) {}
  }

  static openProjectTab(projName) {
      if (!projName || projName === 'Luno') return;
      var invalidNames = ['web', 'storage', 'emulated', 'LunoWeb', '0', 'Library', 'Luno'];
      if (invalidNames.includes(projName)) return;

      var tabs = LunoSpaHeaderNav.getOpenProjectTabs();
      if (!tabs.includes(projName)) {
        tabs.push(projName);
        LunoSpaHeaderNav.saveOpenProjectTabs(tabs);
      }
    }
  static closeProjectTab(projName, e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var tabs = LunoSpaHeaderNav.getOpenProjectTabs();
      tabs = tabs.filter(function(t) { return t !== projName; });
      LunoSpaHeaderNav.saveOpenProjectTabs(tabs);

      var activeProj = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_active_app_proj')) || '';
      if (activeProj === projName) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('luno_active_app_proj');
      }

      LunoSpaHeaderNav.cleanupProjectTab(projName);

      if (typeof LunoSpaDock !== 'undefined') {
        var activeView = LunoSpaDock.activeDockView;
        if (activeView === ('app_' + projName) || (activeView === 'app' && activeProj === projName)) {
          LunoSpaDock.mountView('workspace');
        } else {
          var root = document.getElementById('app-root') || document.body;
          if (activeView === 'workspace' && typeof ClientAppUI !== 'undefined') {
            ClientAppUI.renderOutboxFirstLayout(root);
          } else {
            LunoSpaDock.mountView(activeView);
          }
        }
      }
    }

static render(activeViewKey) {
        var activeKey = activeViewKey || 'workspace';
        if (activeKey === 'deploy') activeKey = 'projects';

        var m = function(tag, attrs) {
          var children = Array.prototype.slice.call(arguments, 2);
          if (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement) {
            return LunoUIComponents.makeElement.apply(LunoUIComponents, [tag, attrs].concat(children));
          }
          var el = document.createElement(tag);
          if (attrs && typeof attrs === 'object') {
            for (var k in attrs) {
              if (Object.prototype.hasOwnProperty.call(attrs, k)) {
                var v = attrs[k];
                if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
                else if (k === 'style') {
                  if (typeof v === 'object') Object.assign(el.style, v);
                  else el.style.cssText = String(v);
                } else if (k === 'className' || k === 'class') el.className = String(v);
                else try { el[k] = v; } catch (e) { el.setAttribute(k, v); }
              }
            }
          }
          children.forEach(function(c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
          return el;
        };

        var baseNavItems = [
          { key: 'workspace', label: '🏠 Home' },
          { key: 'projects', label: '🚀 Projects' }
        ];

        var invalidNames = ['web', 'storage', 'emulated', 'LunoWeb', '0', 'Library', 'Luno'];
        var activeAppProj = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_active_app_proj')) || '';

        if (invalidNames.includes(activeAppProj)) {
          activeAppProj = '';
          if (typeof localStorage !== 'undefined') localStorage.removeItem('luno_active_app_proj');
        }

        if (activeKey.startsWith('app_')) {
          var viewProj = activeKey.replace(/^app_/, '');
          if (viewProj && !invalidNames.includes(viewProj)) {
            activeAppProj = viewProj;
            if (typeof localStorage !== 'undefined') localStorage.setItem('luno_active_app_proj', viewProj);
            LunoSpaHeaderNav.openProjectTab(viewProj);
          }
        }

        var openProjects = LunoSpaHeaderNav.getOpenProjectTabs().filter(function(name) {
          return name && !invalidNames.includes(name);
        });

        var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';

        var projectNavItems = openProjects.map(function(projName) {
          return {
            key: 'app_' + projName,
            projName: projName,
            label: '📱 ' + projName,
            isProjectTab: true,
            isTargetProject: (projName === currentTarget)
          };
        });

        var endNavItems = [
          { key: 'browser', label: '🛠️ Files' },
          { key: 'docs', label: '📖 Docs' }
        ];

        var allNavItems = baseNavItems.concat(projectNavItems, endNavItems);

        var tabButtons = allNavItems.map(function(item) {
          var isActive = (activeKey === item.key) ||
            (item.isProjectTab && (activeKey === 'app' || activeKey === ('app_' + item.projName)) && activeAppProj === item.projName);

          var btnContent = [item.label];

          if (item.isProjectTab) {
            btnContent.push(m('span', {
              style: { marginLeft: '0.45rem', opacity: 0.7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' },
              title: 'Close tab preview',
              onclick: function(e) { LunoSpaHeaderNav.closeProjectTab(item.projName, e); }
            }, '✖'));
          }

          var borderColor = '#30363d';
          if (isActive) borderColor = '#3fb950';
          else if (item.isTargetProject) borderColor = '#00f2fe88';

          return m('button', {
            style: {
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              background: isActive ? '#238636' : (item.isTargetProject ? '#0d2228' : '#21262d'),
              color: isActive ? '#ffffff' : (item.isTargetProject ? '#00f2fe' : '#c9d1d9'),
              border: '1px solid ' + borderColor,
              boxShadow: isActive ? '0 0 10px rgba(57,211,83,0.3)' : 'none'
            },
            onclick: function() {
              if (typeof LunoSpaDock !== 'undefined') {
                if (item.isProjectTab) {
                  if (typeof localStorage !== 'undefined') localStorage.setItem('luno_active_app_proj', item.projName);
                  LunoSpaDock.mountView('app_' + item.projName);
                } else {
                  LunoSpaDock.mountView(item.key);
                }
              }
            }
          }, ...btnContent);
        });

        var cachedProjects = [];
        try {
          var rawCached = localStorage.getItem('luno_cached_projects_list');
          if (rawCached) cachedProjects = JSON.parse(rawCached);
        } catch(e) {}

        var projectSelect = m('select', {
          id: 'global-target-project-select',
          title: 'Switching target sets active project, focuses preview, and closes other open preview tabs.',
          style: {
            background: '#0d1117',
            color: '#00f2fe',
            border: '1px solid #00f2fe',
            padding: '0.25rem 0.55rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            cursor: 'pointer',
            outline: 'none',
            maxWidth: '180px'
          },
          onchange: function(e) {
            var val = e.target.value;
            if (typeof ClientApp !== 'undefined' && typeof ClientApp.switchExclusiveTargetProject === 'function') {
              ClientApp.switchExclusiveTargetProject(val);
            } else if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
              ClientApp.setTargetProject(val, { openTab: true });
              if (typeof LunoSpaDock !== 'undefined') {
                if (val === 'Luno') LunoSpaDock.mountView('workspace');
                else LunoSpaDock.mountView('app_' + val);
              }
            }
          }
        });

        function populateSelectOptions(projectsList) {
          if (!projectsList || projectsList.length === 0) {
            projectSelect.innerHTML = '<option value="' + currentTarget + '">📁 ' + currentTarget + '</option>';
            return;
          }
          var valid = projectsList.filter(function(p) { return !p.isLibrary && p.name !== 'Library'; });
          var order = { 'BasicsWithDialogBox': 1, 'Basic3D': 2, 'AardvarkPlaylist': 3, 'Luno': 4 };
          valid.sort(function(a, b) {
            var rA = order[a.name] || 999;
            var rB = order[b.name] || 999;
            if (rA !== rB) return rA - rB;
            return (a.name || '').localeCompare(b.name || '');
          });

          projectSelect.innerHTML = '';
          valid.forEach(function(p) {
            var opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = '📁 ' + p.name + (p.name === 'Luno' ? ' (Self-Improve)' : '');
            if (p.name === currentTarget) opt.selected = true;
            projectSelect.appendChild(opt);
          });
        }

        populateSelectOptions(cachedProjects);

        setTimeout(async function() {
          try {
            if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchProjectsList) {
              var data = await LunoApiClient.fetchProjectsList();
              if (data && Array.isArray(data.projects)) {
                localStorage.setItem('luno_cached_projects_list', JSON.stringify(data.projects));
                if (projectSelect.options.length !== data.projects.length) {
                  populateSelectOptions(data.projects);
                }
              }
            }
          } catch (e) {}
        }, 300);

        var btnSettings = m('button', {
          style: {
            padding: '0.35rem 0.55rem',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: '#161b22',
            color: '#00f2fe',
            border: '1px solid #00f2fe'
          },
          title: 'Workspace Settings & Theme Float',
          onclick: function() {
            if (typeof LunoThemeEngine !== 'undefined' && LunoThemeEngine.createSettingsModal) {
              LunoThemeEngine.createSettingsModal();
            }
          }
        }, '⚙️');

                // Original Luno Logo Image Restored
        var logoImg = m('img', {
          src: (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.isStaticHosting()) ? './assets/lunologo.png' : '/assets/lunologo.png',
          alt: 'Luno',
          style: { height: '24px', verticalAlign: 'middle', cursor: 'pointer' },
          onclick: function() { if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('workspace'); },
          onerror: function(e) {
            if (!e.target._retried) {
              e.target._retried = true;
              e.target.src = '/Luno/assets/lunologo.png';
            }
          }
        });

        return m('header', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '0.55rem',
            marginBottom: '0.65rem',
            borderBottom: '1px solid #30363d',
            gap: '0.5rem',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: '9000'
          }
        },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' } },
            logoImg,
            m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.3rem' } },
              m('span', { style: { fontSize: '0.72rem', color: '#8b949e', fontWeight: 'bold' } }, 'Target:'),
              projectSelect
            )
          ),
          m('div', {
            style: {
              display: 'flex',
              gap: '0.35rem',
              alignItems: 'center',
              overflowX: 'auto',
              maxWidth: '100%',
              paddingBottom: '0.2rem'
            }
          },
            tabButtons,
            btnSettings
          )
        );
}

static cleanupProjectTab(projName) {
      if (!projName) return;
      if (typeof LunoSpaDock !== 'undefined' && LunoSpaDock._iframeCache && LunoSpaDock._iframeCache[projName]) {
        var holder = LunoSpaDock._iframeCache[projName];
        if (holder && holder.parentNode) {
          holder.parentNode.removeChild(holder);
        }
        delete LunoSpaDock._iframeCache[projName];
      }
    }
}

globalThis.LunoSpaHeaderNav = LunoSpaHeaderNav;
if (typeof module !== "undefined" && module.exports) module.exports = LunoSpaHeaderNav;