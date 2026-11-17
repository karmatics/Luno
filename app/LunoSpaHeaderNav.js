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
    if (!projName || projName === 'Luno' || projName === 'Library' || projName.toLowerCase() === 'library') return;
    var invalidNames = ['web', 'storage', 'emulated', 'LunoWeb', '0'];
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

        var invalidNames = ['web', 'storage', 'emulated', 'LunoWeb', '0'];
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

          var borderColor = 'var(--border-color, #30363d)';
          if (isActive) borderColor = 'var(--accent-green, #3fb950)';
          else if (item.isTargetProject) borderColor = 'var(--accent-primary, #00f2fe)';

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
              background: isActive ? 'var(--accent-green, #238636)' : (item.isTargetProject ? 'var(--bg-secondary, #0d2228)' : 'var(--bg-input, #21262d)'),
              color: isActive ? '#ffffff' : (item.isTargetProject ? 'var(--text-accent, #00f2fe)' : 'var(--text-primary, #c9d1d9)'),
              border: '1px solid ' + borderColor,
              boxShadow: isActive ? '0 0 10px rgba(57,211,83,0.3)' : 'none',
              transition: 'all 0.15s ease'
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
          title: 'Switch target project',
          style: {
            background: 'var(--bg-input, #0d1117)',
            color: 'var(--text-accent, #00f2fe)',
            border: '1px solid var(--accent-primary, #00f2fe)',
            padding: '0.25rem 0.55rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            cursor: 'pointer',
            outline: 'none',
            maxWidth: '170px'
          },
          onchange: function(e) {
            var val = e.target.value;
            if (typeof ClientApp !== 'undefined' && typeof ClientApp.switchExclusiveTargetProject === 'function') {
              ClientApp.switchExclusiveTargetProject(val);
            } else if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
              ClientApp.setTargetProject(val, { openTab: true });
            }
          }
        });

        function populateSelectOptions(projectsList) {
          if (!projectsList || projectsList.length === 0) {
            projectSelect.innerHTML = '<option value="' + currentTarget + '">📁 ' + currentTarget + '</option>';
            return;
          }
          var valid = projectsList.filter(function(p) { return p && p.name && !invalidNames.includes(p.name); });
          var order = { 'BasicsWithDialogBox': 1, 'Basic3D': 2, 'AardvarkPlaylist': 3, 'accuCad': 4, 'TouchController': 5, 'Library': 6, 'Luno': 7 };
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
            var icon = (p.name === 'Library') ? '📚 ' : '📁 ';
            var extra = (p.name === 'Luno') ? ' (Self-Improve)' : (p.name === 'Library' ? ' (Shared Hub)' : '');
            opt.textContent = icon + p.name + extra;
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
                populateSelectOptions(data.projects);
              }
            }
          } catch (e) {}
        }, 200);

        var curExecHost = (typeof LunoApiClient !== 'undefined' && LunoApiClient.getExecTargetHost) ? LunoApiClient.getExecTargetHost() : '';
        var isStaticPage = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.isStaticHosting && LunoFileSystem.isStaticHosting());
        var knownHosts = [
          { value: '', label: isStaticPage ? '☁️ Browser Storage' : '🖥️ This Machine' },
          { value: '10.0.0.245', label: '🐧 Linux (10.0.0.245)' },
          { value: '10.0.0.226', label: '🍎 Mac (10.0.0.226)' },
          { value: 'localhost', label: '💻 Localhost (:8080)' }
        ];
        try {
          var extraPeers = JSON.parse(localStorage.getItem('luno_discovered_peers') || '[]');
          extraPeers.forEach(function(ep) {
            if (ep && ep.ip && !knownHosts.some(function(k) { return k.value === ep.ip; })) {
              knownHosts.push({ value: ep.ip, label: (ep.isLinux ? '🐧 ' : '🖥️ ') + (ep.hostname || ep.ip) + ' (' + ep.ip + ')' });
            }
          });
        } catch (e) {}
        if (curExecHost && !knownHosts.some(function(k) { return k.value === curExecHost; })) {
          knownHosts.push({ value: curExecHost, label: '🌐 ' + curExecHost });
        }
        knownHosts.push({ value: '__discover__', label: '🔍 Scan LAN Peers...' });
        knownHosts.push({ value: '__custom__', label: '⚙️ Custom Host/IP...' });

        var hostSelect = m('select', {
          id: 'global-exec-host-select',
          title: 'Redirect Luno file & RUN: SERVER execution to another machine',
          style: {
            background: curExecHost ? '#2b1d07' : 'var(--bg-input, #0d1117)',
            color: curExecHost ? '#fbbf24' : '#94a3b8',
            border: '1px solid ' + (curExecHost ? '#f59e0b' : 'var(--border-color, #30363d)'),
            padding: '0.25rem 0.45rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            cursor: 'pointer',
            outline: 'none',
            maxWidth: '175px'
          },
          onchange: async function(e) {
            var v = e.target.value;
            if (v === '__discover__') {
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Scanning LAN subnet on port 8080...', 'info', '🔍');
              try {
                var dRes = await fetch('/api/peer/discover');
                var dData = await dRes.json();
                var found = (dData && dData.peers) || [];
                try { localStorage.setItem('luno_discovered_peers', JSON.stringify(found)); } catch (err) {}
                if (found.length > 0) {
                  var summary = found.map(function(p) { return (p.hostname || p.ip) + ' (' + p.ip + ', ' + p.platform + ')'; }).join(', ');
                  if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Found peer(s): ' + summary, 'success', '🌐');
                  var linuxPeer = found.find(function(p) { return p.isLinux; }) || found[0];
                  LunoApiClient.setExecTargetHost(linuxPeer.ip);
                } else {
                  if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('No port 8080 peers answered on LAN.', 'error', '⚠️');
                  LunoApiClient.setExecTargetHost(curExecHost);
                }
              } catch (err) {
                LunoApiClient.setExecTargetHost(curExecHost);
              }
            } else if (v === '__custom__') {
              var custom = prompt('Enter target machine IP or host (e.g. 10.0.0.245 or localhost:8080):', curExecHost || '10.0.0.245');
              if (custom !== null) LunoApiClient.setExecTargetHost(custom.trim());
            } else {
              LunoApiClient.setExecTargetHost(v);
            }

            if (typeof ClientApp !== 'undefined') {
              await ClientApp.checkPing();
              await ClientApp.fetchCodebaseMetrics();
            }
            if (typeof LunoSpaDock !== 'undefined') {
              LunoSpaDock.mountView(LunoSpaDock.activeDockView || 'workspace');
            }
          }
        }, knownHosts.map(function(h) {
          return m('option', { value: h.value, selected: h.value === curExecHost }, h.label);
        }));

        var btnFleetSync = m('button', {
          id: 'header-btn-fleet-sync',
          style: {
            padding: '0.35rem 0.65rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: '#0d2818',
            color: '#3fb950',
            border: '1px solid #238636',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          },
          title: 'Permanent Fleet Synchronization Hub & Parity Inspector',
          onclick: function() {
            if (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.openFleetSyncDialog) {
              LunoDeployEngine.openFleetSyncDialog();
            }
          }
        }, '🔄 Fleet Sync');

        var btnSettings = m('button', {
          style: {
            padding: '0.35rem 0.55rem',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: 'var(--bg-secondary, #161b22)',
            color: 'var(--text-accent, #00f2fe)',
            border: '1px solid var(--accent-primary, #00f2fe)',
            transition: 'all 0.15s ease'
          },
          title: 'Workspace Settings & Display',
          onclick: function() {
            if (typeof LunoThemeEngine !== 'undefined' && LunoThemeEngine.createSettingsModal) {
              LunoThemeEngine.createSettingsModal();
            }
          }
        }, '⚙️');

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
            borderBottom: '1px solid var(--border-color, #30363d)',
            gap: '0.5rem',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: '9000'
          }
        },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' } },
            logoImg,
            m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.3rem' } },
              m('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #8b949e)', fontWeight: 'bold' } }, 'Target:'),
              projectSelect
            ),
            m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.25rem' } },
              m('span', { style: { fontSize: '0.72rem', color: curExecHost ? '#fbbf24' : 'var(--text-secondary, #8b949e)', fontWeight: 'bold' } }, 'Host:'),
              hostSelect
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
            btnFleetSync,
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