class ClientAppUI {
  constructor() {}

  static outboxExpanded = true;
  static inboxExpanded = true;
  static devEditorExpanded = false;

  static injectPulseStyle() {
    var pulseStyle = document.getElementById('luno-pulse-style');
    if (!pulseStyle) {
      pulseStyle = document.createElement('style');
      pulseStyle.id = 'luno-pulse-style';
      pulseStyle.textContent = '@keyframes questionPulse { 0% { text-shadow: 0 0 6px #ff9800; transform: scale(1); } 50% { text-shadow: 0 0 22px #ff9800, 0 0 32px #ff9800; transform: scale(1.1); } 100% { text-shadow: 0 0 6px #ff9800; transform: scale(1); } }';
      document.head.appendChild(pulseStyle);
    }
  }

  static renderStarterPanel(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('luno_starter_panel_collapsed') === 'true';

    if (isCollapsed) {
      return el('div', {
        style: { display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '0.2rem' }
      },
        el('button', {
          style: { padding: '0.2rem 0.55rem', background: 'var(--bg-secondary, #21262d)', color: 'var(--text-secondary, #8b949e)', border: '1px solid var(--border-color, #30363d)', borderRadius: '12px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' },
          title: 'Click to expand Starter Panel',
          onclick: function() {
            localStorage.setItem('luno_starter_panel_collapsed', 'false');
            if (typeof ClientAppUI !== 'undefined') {
              ClientAppUI.renderOutboxFirstLayout(document.getElementById('app-root') || document.body);
            }
          }
        }, '🚀 Starter Panel ▾')
      );
    }

    var cards = [];

    cards.push(el('div', {
      className: 'luno-starter-card',
      style: {
        background: 'var(--bg-secondary, #0d1117)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '8px',
        padding: '0.75rem',
        cursor: 'pointer',
        flex: '1 1 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      },
      onclick: function() {
        try { localStorage.setItem('luno_project_intent', 'create_project'); } catch(e){}
        if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('projects');
      }
    },
      el('strong', { style: { color: 'var(--text-accent, #00f2fe)', fontSize: '0.85rem' } }, '🌱 New Project'),
      el('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #8b949e)' } }, 'Select starter template.')
    ));

    cards.push(el('div', {
      className: 'luno-starter-card',
      style: {
        background: 'var(--bg-secondary, #0d1117)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '8px',
        padding: '0.75rem',
        cursor: 'pointer',
        flex: '1 1 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      },
      onclick: function() {
        if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('projects');
      }
    },
      el('strong', { style: { color: 'var(--accent-secondary, #d2a8ff)', fontSize: '0.85rem' } }, '🚀 Projects Hub'),
      el('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #8b949e)' } }, 'Switch, preview & deploy.')
    ));

    cards.push(el('div', {
      className: 'luno-starter-card',
      style: {
        background: 'var(--bg-secondary, #0d1117)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '8px',
        padding: '0.75rem',
        cursor: 'pointer',
        flex: '1 1 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      },
      onclick: function() {
        if (typeof LunoZipExporter !== 'undefined') LunoZipExporter.downloadAllProjectsAsZip();
      }
    },
      el('strong', { style: { color: '#f7df1e', fontSize: '0.85rem' } }, '📦 All Repos (.ZIP)'),
      el('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #8b949e)' } }, '1-tap download all repos.')
    ));

    cards.push(el('div', {
      className: 'luno-starter-card',
      style: {
        background: 'var(--bg-secondary, #0d1117)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '8px',
        padding: '0.75rem',
        cursor: 'pointer',
        flex: '1 1 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      },
      onclick: function() {
        try { localStorage.setItem('luno_starter_panel_collapsed', 'true'); } catch(e){}
        if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
          ClientApp.setTargetProject('Luno');
          if (ClientApp.showToast) ClientApp.showToast('Active in Luno Core!', 'success', '⚡');
          if (typeof ClientAppUI !== 'undefined') ClientAppUI.renderOutboxFirstLayout(document.getElementById('app-root') || document.body);
        }
      }
    },
      el('strong', { style: { color: 'var(--accent-green, #3fb950)', fontSize: '0.85rem' } }, '⚡ Luno Core'),
      el('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #8b949e)' } }, 'Edit workspace source.')
    ));

    return el('div', {
      className: 'luno-starter-panel',
      style: {
        background: 'var(--bg-card, #161b22)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '10px',
        padding: '0.85rem',
        marginBottom: '0.65rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        boxShadow: 'var(--card-shadow, 0 4px 12px rgba(0,0,0,0.3))'
      }
    },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        el('strong', { style: { color: 'var(--text-accent, #00f2fe)', fontSize: '0.9rem', fontFamily: 'monospace' } }, '🚀 What do you want to build?'),
        el('button', {
          style: { background: 'none', border: 'none', color: 'var(--text-secondary, #8b949e)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'monospace' },
          onclick: function() {
            try { localStorage.setItem('luno_starter_panel_collapsed', 'true'); } catch(e){}
            ClientAppUI.renderOutboxFirstLayout(document.getElementById('app-root') || document.body);
          }
        }, '▲ Collapse')
      ),
      el('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } }, ...cards)
    );
  }

  static renderOutboxCard(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    ClientAppUI.outboxExpanded = true;

    var arrowOutbox = el('span', {
      className: 'luno-accordion-arrow',
      style: { fontSize: '0.85rem', color: 'var(--accent-secondary, #d2a8ff)' }
    }, '▼');

    var outboxContent = el('div', {
      id: 'outbox-card-content',
      style: { display: 'block', marginTop: '0.5rem', width: '100%', boxSizing: 'border-box' }
    },
      el('div', { id: 'outbox-queue-container', style: { width: '100%', minHeight: '80px' } })
    );

    setTimeout(function() {
      if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
        try { OutboxWidgetRenderer.renderWidget('outbox-queue-container'); } catch(e){}
      }
    }, 20);

    return el('div', {
      className: 'outbox-card luno-outbox-card glow-card',
      style: {
        background: 'var(--outbox-grad, linear-gradient(135deg, #271052 0%, #161b22 100%))',
        border: '2px solid var(--accent-secondary, #8257e5)',
        borderRadius: '10px',
        padding: '0.75rem',
        boxShadow: 'var(--card-shadow, 0 4px 12px rgba(130, 87, 229, 0.25))',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '0.35rem' },
        onclick: function(e) {
          if (e.target.tagName !== 'BUTTON') {
            ClientAppUI.outboxExpanded = !ClientAppUI.outboxExpanded;
            outboxContent.style.display = ClientAppUI.outboxExpanded ? 'block' : 'none';
          }
        }
      },
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.1rem' } },
          el('div', { style: { fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-secondary, #a371f7)', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' } },
            'OUTBOX',
            el('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #d2a8ff)', opacity: 0.85, fontWeight: 'normal' } }, '(send to LLM)')
          )
        ),
        arrowOutbox
      ),
      outboxContent
    );
  }

  static renderInboxCard(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var arrowInbox = el('span', { style: { fontSize: '0.85rem', color: 'var(--accent-green, #7ee787)' } }, '▲');

    var pasteBtn = el('button', {
      id: 'btn-paste-chatbot',
      className: 'btn-primary',
      style: {
        width: '100%',
        padding: '0.85rem',
        background: 'var(--accent-green, #238636)',
        color: '#fff',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem'
      },
      onclick: function() {
        if (typeof ClientAppPaster !== 'undefined' && ClientAppPaster.pasteClipboard) {
          ClientAppPaster.pasteClipboard();
        }
      }
    }, '📥 Paste from Chatbot');

    var inboxContent = el('div', {
      id: 'inbox-card-content',
      style: { display: 'block', marginTop: '0.5rem', width: '100%', boxSizing: 'border-box' }
    },
      el('div', { style: { display: 'flex', gap: '0.4rem', marginBottom: '0.45rem', flexWrap: 'wrap' } }, pasteBtn),
      el('div', { id: 'inbox-metrics-badge', style: { fontSize: '0.72rem', color: 'var(--accent-green, #7ee787)', fontFamily: 'monospace' } })
    );

    return el('div', {
      className: 'inbox-card luno-inbox-card glow-card',
      style: {
        background: 'var(--inbox-grad, linear-gradient(135deg, #0d2818 0%, #161b22 100%))',
        border: '2px solid var(--accent-green, #238636)',
        borderRadius: '10px',
        padding: '0.75rem',
        boxShadow: 'var(--card-shadow, 0 4px 12px rgba(35, 134, 54, 0.25))',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '0.35rem' },
        onclick: function(e) {
          if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
            ClientAppUI.inboxExpanded = !ClientAppUI.inboxExpanded;
            inboxContent.style.display = ClientAppUI.inboxExpanded ? 'block' : 'none';
          }
        }
      },
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.1rem' } },
          el('div', { style: { fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-green, #3fb950)', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' } },
            'INBOX',
            el('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary, #7ee787)', opacity: 0.85, fontWeight: 'normal' } }, '(receive from LLM)')
          )
        ),
        arrowInbox
      ),
      inboxContent
    );
  }

  static renderOutputFeedbackCard(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    return el('div', {
      id: 'feedback-card',
      style: {
        background: '#0d1117',
        border: '2px solid #00f2fe',
        borderRadius: '10px',
        padding: '0.75rem',
        display: 'none',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)',
        transition: 'box-shadow 0.3s ease'
      }
    },
      el('div', { id: 'feedback', style: { width: '100%', boxSizing: 'border-box' } })
    );
  }

  static renderQuestionAccent(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    ClientAppUI.injectPulseStyle();
    return el('div', {
      style: {
        fontSize: '2.5rem',
        fontWeight: '900',
        color: '#ff9800',
        cursor: 'pointer',
        textAlign: 'center',
        margin: '0.6rem auto 0.3rem auto',
        userSelect: 'none',
        fontFamily: 'monospace, sans-serif',
        animation: 'questionPulse 2.5s infinite ease-in-out',
        width: 'fit-content'
      },
      title: 'Tap for AI Mentor Guides & Walkthroughs',
      onclick: function() {
        if (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.createSmartHelpModal) {
          LunoUIComponents.createSmartHelpModal();
        }
      }
    }, '?');
  }

  // --- REFINED FLEET SYNC CARD: PROMPT-FREE & INTELLIGENT ---
  static renderFleetSyncCard(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var isLinux = typeof ClientApp !== 'undefined' && (ClientApp.isLinux || ClientApp.activePlatform === 'linux');
    var thisNodeLabel = isLinux ? '🐧 Linux Laptop (10.0.0.245)' : '🍎 Mac Workstation (10.0.0.226)';
    var peerHost = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getPeerHost() : (isLinux ? '10.0.0.226' : '10.0.0.245');
    var peerNodeLabel = isLinux ? `🍎 Mac (${peerHost}:8080)` : `🐧 Linux (${peerHost}:8080)`;

    var container = el('div', {
      id: 'luno-home-fleet-sync-card',
      style: {
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
        border: '2px solid #238636',
        borderRadius: '10px',
        padding: '0.85rem',
        marginBottom: '0.65rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        boxShadow: '0 4px 14px rgba(35, 134, 54, 0.25)',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'monospace'
      }
    });

    var topRow = el('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', borderBottom: '1px solid #21262d', paddingBottom: '0.4rem' }
    },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' } },
        el('strong', { style: { color: '#3fb950', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem' } }, '🔄 UNIVERSAL FLEET SYNC'),
        el('span', { style: { fontSize: '0.68rem', color: '#c9d1d9', background: '#21262d', border: '1px solid #30363d', padding: '0.12rem 0.45rem', borderRadius: '10px' } }, `Here: ${thisNodeLabel}`),
        el('span', { id: 'fleet-peer-indicator', style: { fontSize: '0.68rem', color: '#00f2fe', background: '#003847', border: '1px solid #00f2fe', padding: '0.12rem 0.45rem', borderRadius: '10px', fontWeight: 'bold' } }, `Peer: ${peerNodeLabel}`)
      ),
      el('span', {
        id: 'fleet-home-status-badge',
        style: { fontSize: '0.68rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid #238636', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 'bold' }
      }, 'Checking...')
    );

    var actionButtonsRow = el('div', {
      style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }
    });

    var btnDonePush = el('button', {
      id: 'btn-home-fleet-master-sync',
      style: {
        flex: '1.4 1 240px',
        padding: '0.85rem',
        background: '#238636',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '0.92rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
        boxShadow: '0 4px 14px rgba(35,134,54,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        transition: 'all 0.15s ease'
      }
    }, '🚀 1-Tap Sync to Fleet (Push Work & Sync Peer)');

    var btnCatchUp = el('button', {
      id: 'btn-home-fleet-catch-up',
      style: {
        flex: '1 1 180px',
        padding: '0.85rem',
        background: '#003847',
        color: '#00f2fe',
        border: '1px solid #00f2fe',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        transition: 'all 0.15s ease'
      }
    }, '⬇️ 1-Tap Catch Up (Pull Latest)');

    actionButtonsRow.appendChild(btnDonePush);
    actionButtonsRow.appendChild(btnCatchUp);

    var liveStatusPanel = el('div', {
      id: 'home-fleet-live-status-panel',
      style: {
        display: 'none',
        background: '#070a13',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '0.6rem 0.85rem',
        fontSize: '0.75rem',
        color: '#7ee787',
        whiteSpace: 'pre-wrap',
        maxHeight: '140px',
        overflowY: 'auto'
      }
    });

    var subBar = el('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.74rem' }
    },
      el('div', { style: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' } },
        el('button', {
          style: { padding: '0.3rem 0.6rem', background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' },
          onclick: function() {
            if (typeof LunoDeployEngine !== 'undefined') LunoDeployEngine.openFleetSyncDialog();
          }
        }, '🔍 View Repositories'),
        el('button', {
          style: { padding: '0.3rem 0.6rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' },
          onclick: async function() {
            if (typeof LunoDeployEngine !== 'undefined') {
              var count = await LunoDeployEngine.queueModifiedToOutbox();
              if (count > 0 && typeof ClientAppUI !== 'undefined') {
                ClientAppUI.outboxExpanded = true;
                var outboxContent = document.getElementById('outbox-card-content');
                if (outboxContent) outboxContent.style.display = 'block';
              }
            }
          }
        }, '📤 Queue Modified to Outbox')
      ),
      el('button', {
        style: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.72rem' },
        onclick: function() { updateHomeFleetView(true); }
      }, '↻ Refresh Status')
    );

    var modifiedContainer = el('div', {
      id: 'home-fleet-dirty-list',
      style: { display: 'none', flexDirection: 'column', gap: '0.25rem', background: '#070a13', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.55rem' }
    });

    btnDonePush.onclick = async function() {
      btnDonePush.disabled = true;
      btnDonePush.textContent = '⏳ Synchronizing Fleet...';
      liveStatusPanel.style.display = 'block';
      liveStatusPanel.textContent = '⚡ Checking repositories and synchronizing...';

      try {
        var res = await LunoDeployEngine.syncEverything({
          peerHost: peerHost,
          onProgress: function(msg) {
            liveStatusPanel.textContent += '\n' + msg;
            liveStatusPanel.scrollTop = liveStatusPanel.scrollHeight;
          }
        });

        if (res && res.success) {
          liveStatusPanel.textContent = res.summary;
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Fleet Synced Safely!', 'success', '🎉');
          }
          await updateHomeFleetView(false);
        }
      } catch(err) {
        liveStatusPanel.textContent = '❌ Sync Error: ' + err.message;
      } finally {
        btnDonePush.disabled = false;
        btnDonePush.textContent = '🚀 1-Tap Sync to Fleet (Push Work & Sync Peer)';
      }
    };

    btnCatchUp.onclick = async function() {
      btnCatchUp.disabled = true;
      btnCatchUp.textContent = '⏳ Catching up...';
      liveStatusPanel.style.display = 'block';
      liveStatusPanel.textContent = '⬇️ Pulling latest updates from GitHub across fleet...';

      try {
        var res = await LunoDeployEngine.fleetSync('pull');
        if (res && res.success) {
          liveStatusPanel.textContent = `✅ Catch-Up Complete (${res.totalRepos || 44} repos inspected):\nEverything is up to date on this machine.`;
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Caught up cleanly from remote!', 'success', '⬇️');
          }
          await updateHomeFleetView(false);
        } else {
          liveStatusPanel.textContent = '⚠️ Notice during pull:\n' + ((res && res.error) || 'Some repos had notices');
        }
      } catch (err) {
        liveStatusPanel.textContent = '❌ Pull Error: ' + err.message;
      } finally {
        btnCatchUp.disabled = false;
        btnCatchUp.textContent = '⬇️ 1-Tap Catch Up (Pull Latest)';
      }
    };

    async function updateHomeFleetView(fetchRemote = false) {
      var badge = document.getElementById('fleet-home-status-badge');
      if (badge) { badge.textContent = 'Scanning...'; badge.style.color = '#00f2fe'; }

      var st = await LunoDeployEngine.getFleetStatus(fetchRemote);
      var dirty = (st && st.dirtyProjects) || [];
      var dirtyCount = dirty.length;

      if (badge) {
        if (dirtyCount > 0) {
          badge.textContent = `${dirtyCount} project(s) modified`;
          badge.style.color = '#ff9800';
          badge.style.background = 'rgba(255,152,0,0.15)';
          badge.style.borderColor = '#ff9800';
        } else {
          badge.textContent = 'All in Sync ✓';
          badge.style.color = '#10b981';
          badge.style.background = 'rgba(16,185,129,0.15)';
          badge.style.borderColor = '#238636';
        }
      }

      if (dirtyCount > 0) {
        modifiedContainer.style.display = 'flex';
        modifiedContainer.innerHTML = `<div style="font-size:0.7rem; font-weight:bold; color:#ff9800;">Modified Projects (${dirtyCount}):</div>`;
        dirty.forEach(function(d) {
          modifiedContainer.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; padding:0.15rem 0;">
              <span style="color:#00f2fe; font-weight:bold;">${d.name}</span>
              <span style="color:#8b949e;">${d.uncommittedCount || 1} file(s) modified</span>
            </div>
          `;
        });
      } else {
        modifiedContainer.style.display = 'none';
        modifiedContainer.innerHTML = '';
      }
    }

    container.appendChild(topRow);
    container.appendChild(actionButtonsRow);
    container.appendChild(liveStatusPanel);
    container.appendChild(subBar);
    container.appendChild(modifiedContainer);

    setTimeout(() => updateHomeFleetView(false), 80);
    return container;
  }

  static renderCheckpointButton(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
    var uncommitted = (typeof ClientApp !== 'undefined' && ClientApp.uncommittedCount) ? ClientApp.uncommittedCount : 0;

    var isLinux = typeof ClientApp !== 'undefined' && (ClientApp.isLinux || ClientApp.activePlatform === 'linux');
    var peerHost = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getPeerHost() : (isLinux ? '10.0.0.226' : '10.0.0.245');
    var peerLabel = isLinux ? 'Mac' : 'Linux';

    var account = (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.getGithubAccount) ? LunoDeployEngine.getGithubAccount() : 'karmatics';
    var remoteName = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getRemoteRepoName(currentTarget) : currentTarget;
    var liveUrl = 'https://' + account.toLowerCase() + '.github.io/' + remoteName + '/';
    var localUrl = (currentTarget === 'Luno') ? '/' : ('/' + encodeURIComponent(currentTarget) + '/');

    var noteInput = el('input', {
      id: 'frontpage-checkpoint-note',
      type: 'text',
      placeholder: `[${currentTarget}] Commit note (optional, auto-generated if left blank)...`,
      style: {
        width: '100%',
        padding: '0.55rem 0.75rem',
        background: 'var(--bg-input, #0d1117)',
        color: 'var(--text-accent, #00f2fe)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '0.78rem',
        outline: 'none',
        boxSizing: 'border-box'
      }
    });

    var chkDeployPages = el('input', {
      id: 'frontpage-chk-deploy-pages',
      type: 'checkbox',
      checked: true,
      style: { width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent-green, #238636)' }
    });

    var btnAction = el('button', {
      id: 'btn-frontpage-checkpoint-exec',
      style: {
        flex: '1.4 1 180px',
        padding: '0.75rem',
        background: 'var(--accent-green, #238636)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '0.88rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)',
        transition: 'all 0.15s ease'
      }
    }, '🚀 1-Tap Checkpoint & Deploy');

    var btnPullSingle = el('button', {
      id: 'btn-frontpage-pull-project',
      style: {
        flex: '1 1 120px',
        padding: '0.75rem',
        background: '#003847',
        color: '#00f2fe',
        border: '1px solid #00f2fe',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '0.82rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem'
      },
      title: 'Pull latest updates from GitHub for [' + currentTarget + ']'
    }, '⬇️ Pull [' + currentTarget + ']');

    var btnDirectLan = el('button', {
      id: 'btn-direct-lan-sync-peer',
      style: {
        flex: '1 1 140px',
        padding: '0.75rem',
        background: '#271052',
        color: '#d2a8ff',
        border: '1px solid #8257e5',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '0.82rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem'
      },
      title: `Sync [${currentTarget}] to ${peerLabel} node safely via Git`
    }, `⚡ Sync ➔ ${peerLabel}`);

    btnAction.onclick = async function() {
      btnAction.disabled = true;
      var isDeploy = chkDeployPages.checked;
      btnAction.textContent = isDeploy ? '🚀 Deploying...' : '📸 Saving Snapshot...';

      var note = noteInput.value.trim();
      var msg = note || (`[${currentTarget}] Auto-Checkpoint ${new Date().toLocaleString()}`);

      try {
        var res = await LunoDeployEngine.checkpointTargetProject(currentTarget, msg, { deployToPages: isDeploy });
        if (res && res.success) {
          if (typeof ClientApp !== 'undefined') {
            ClientApp.showToast(isDeploy ? `Deployed [${currentTarget}] to GitHub Pages!` : `Saved local snapshot for [${currentTarget}]!`, 'success', '📸');
            ClientApp.uncommittedCount = 0;
            await ClientApp.fetchCodebaseMetrics(currentTarget);
          }
          noteInput.value = '';
        }
      } catch (err) {
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast(`Notice: ${err.message}`, 'error', '❌');
        }
      } finally {
        btnAction.disabled = false;
        btnAction.textContent = '🚀 1-Tap Checkpoint & Deploy';
      }
    };

    btnPullSingle.onclick = async function() {
      btnPullSingle.disabled = true;
      btnPullSingle.textContent = '⏳ Pulling...';
      try {
        var res = await LunoDeployEngine.pullProject(currentTarget);
        if (res && res.success) {
          if (typeof ClientApp !== 'undefined') {
            ClientApp.showToast(`[${currentTarget}] up to date!`, 'success', '⬇️');
            await ClientApp.fetchCodebaseMetrics(currentTarget);
          }
        }
      } catch(err) {
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast(`Pull notice: ${err.message}`, 'error', '❌');
        }
      } finally {
        btnPullSingle.disabled = false;
        btnPullSingle.textContent = '⬇️ Pull [' + currentTarget + ']';
      }
    };

    btnDirectLan.onclick = async function() {
      btnDirectLan.disabled = true;
      btnDirectLan.textContent = `⏳ Syncing ${peerLabel}...`;
      try {
        var res = await LunoDeployEngine.directLanSync(peerHost, { project: currentTarget });
        if (res && res.success && typeof ClientApp !== 'undefined') {
          ClientApp.showToast(`[${currentTarget}] safely synchronized to ${peerLabel}!`, 'success', '⚡');
        }
      } catch (err) {
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast(`Sync notice: ${err.message}`, 'info', 'ℹ️');
        }
      } finally {
        btnDirectLan.disabled = false;
        btnDirectLan.textContent = `⚡ Sync ➔ ${peerLabel}`;
      }
    };

    var container = el('div', {
      id: 'luno-target-checkpoint-card',
      style: {
        background: 'var(--bg-card, #161b22)',
        border: '1px solid var(--border-color, #30363d)',
        borderRadius: '10px',
        padding: '0.85rem',
        margin: '0.3rem auto 0.5rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', borderBottom: '1px solid var(--border-color, #21262d)', paddingBottom: '0.4rem' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
          el('strong', { style: { color: 'var(--text-accent, #00f2fe)', fontSize: '0.9rem' } }, '📸 PROJECT CHECKPOINT:'),
          el('span', { style: { color: 'var(--accent-green, #3fb950)', fontWeight: 'bold', fontSize: '0.85rem' } }, currentTarget)
        ),
        el('span', {
          id: 'checkpoint-btn-subtitle',
          style: { fontSize: '0.72rem', color: uncommitted > 0 ? '#ff9800' : 'var(--text-secondary, #8b949e)', fontWeight: 'bold' }
        }, uncommitted + ' uncommitted file' + (uncommitted === 1 ? '' : 's'))
      ),
      noteInput,
      el('label', {
        style: { display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--text-primary, #c9d1d9)', cursor: 'pointer', userSelect: 'none' }
      },
        chkDeployPages,
        el('span', {}, '🚀 Deploy to GitHub Pages (push remote & publish live site)')
      ),
      el('div', { style: { display: 'flex', gap: '0.45rem', flexWrap: 'wrap' } },
        btnAction,
        btnPullSingle,
        btnDirectLan
      ),
      el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.2rem', fontSize: '0.74rem' }
      },
        el('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' } },
          el('a', {
            href: liveUrl,
            target: '_blank',
            style: { color: 'var(--text-accent, #58a6ff)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }
          }, '🌐 Live Pages Site ↗'),
          el('a', {
            href: localUrl,
            target: '_blank',
            style: { color: 'var(--accent-green, #7ee787)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }
          }, '🖥️ Standalone Tab ↗')
        )
      )
    );

    return container;
  }

  static renderDevDrawer(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var devEditorContent = el('div', { id: 'dev-editor-content', style: { display: ClientAppUI.devEditorExpanded ? 'block' : 'none', marginTop: '0.45rem' } },
      el('textarea', {
        id: 'code-input',
        style: { width: '100%', height: '130px', background: '#0d1117', color: '#7ee787', border: '1px solid #30363d', borderRadius: '6px', padding: '0.55rem', fontFamily: 'monospace', outline: 'none', fontSize: '0.78rem', boxSizing: 'border-box' },
        placeholder: '// Direct payload editor...'
      }),
      el('div', { style: { display: 'flex', gap: '0.4rem', marginTop: '0.4rem' } },
        el('button', {
          className: 'btn-primary',
          style: { flex: 2, padding: '0.45rem', background: '#238636', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
          onclick: function() {
            if (typeof ClientAppPaster !== 'undefined' && ClientAppPaster.saveCode) {
              ClientAppPaster.saveCode();
            }
          }
        }, 'Apply Direct Payload')
      )
    );

    var devDrawer = el('div', {
      style: {
        background: '#11151c',
        border: '1px dashed #30363d',
        borderRadius: '8px',
        padding: '0.45rem 0.65rem',
        width: '100%',
        boxSizing: 'border-box',
        opacity: ClientAppUI.devEditorExpanded ? 1 : 0.65,
        marginTop: '0.4rem'
      }
    },
      el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.75rem', color: '#6e7681' },
        onclick: function() {
          ClientAppUI.devEditorExpanded = !ClientAppUI.devEditorExpanded;
          devEditorContent.style.display = ClientAppUI.devEditorExpanded ? 'block' : 'none';
          devDrawer.style.opacity = ClientAppUI.devEditorExpanded ? '1' : '0.65';
        }
      },
        el('span', {}, 'Dev Direct Editor'),
        el('span', {}, ClientAppUI.devEditorExpanded ? '▲ Collapse' : '••• Open')
      ),
      devEditorContent
    );

    return devDrawer;
  }

  static renderBottomBar(m, verText) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var activeRoot = (typeof ClientApp !== 'undefined' && ClientApp.activeRootDir) ? ClientApp.activeRootDir : 'Project Root';
    return el('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.45rem',
        borderTop: '1px solid var(--border-color, #30363d)',
        paddingTop: '0.55rem',
        flexWrap: 'wrap',
        gap: '0.35rem',
        background: 'var(--bg-secondary, #0d1117)',
        padding: '0.55rem',
        borderRadius: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      el('span', {
        id: 'active-root-label',
        style: { fontSize: '0.72rem', color: 'var(--text-primary, #c9d1d9)', background: 'var(--bg-input, #21262d)', border: '1px solid var(--border-color, #30363d)', padding: '0.25rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace' }
      }, activeRoot),
      el('span', {
        id: 'luno-version-tag',
        style: { fontSize: '0.68rem', color: 'var(--text-secondary, #8b949e)', background: 'var(--bg-card, #161b22)', border: '1px solid var(--border-color, #30363d)', padding: '0.2rem 0.45rem', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 'bold' }
      }, verText)
    );
  }

  static renderOutboxFirstLayout(container) {
    if (!container) return;
    var m = typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null;

    container.innerHTML = '';
    container.style.width = '100%';
    container.style.maxWidth = '100%';
    var verText = 'v3.8.0';

    var mainBox = m('div', {
      style: {
        fontFamily: 'monospace',
        padding: '0.75rem 1.25rem',
        maxWidth: '100%',
        width: '100%',
        margin: '0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxSizing: 'border-box'
      }
    });

    var header = (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.renderHeaderNav) ? LunoSpaDock.renderHeaderNav('workspace') : m('header', {}, 'Luno Home');
    var telemetryDrawer = m('div', { id: 'luno-telemetry-drawer-container' });

    var dualHeroRow = m('div', {
      id: 'luno-hero-dual-row',
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.85rem',
        width: '100%',
        alignItems: 'flex-start'
      }
    },
      m('div', { style: { flex: '1 1 440px', minWidth: '280px', display: 'flex', flexDirection: 'column' } }, ClientAppUI.renderOutboxCard(m)),
      m('div', { style: { flex: '1 1 440px', minWidth: '280px', display: 'flex', flexDirection: 'column' } }, ClientAppUI.renderInboxCard(m))
    );

    mainBox.appendChild(header);
    mainBox.appendChild(ClientAppUI.renderStarterPanel(m));
    mainBox.appendChild(dualHeroRow);
    mainBox.appendChild(telemetryDrawer);
    mainBox.appendChild(ClientAppUI.renderOutputFeedbackCard(m));
    mainBox.appendChild(ClientAppUI.renderQuestionAccent(m));
    mainBox.appendChild(ClientAppUI.renderFleetSyncCard(m));
    mainBox.appendChild(ClientAppUI.renderCheckpointButton(m));
    mainBox.appendChild(ClientAppUI.renderDevDrawer(m));
    mainBox.appendChild(ClientAppUI.renderBottomBar(m, verText));

    container.appendChild(mainBox);

    setTimeout(function() {
      if (typeof LunoPlaybackLogger !== 'undefined' && LunoPlaybackLogger.renderWidget) {
        LunoPlaybackLogger.renderWidget(telemetryDrawer);
      }
      if (typeof OutboxQueue !== 'undefined' && OutboxQueue.renderWidget) {
        try { OutboxQueue.renderWidget(); } catch(e){}
      }
    }, 30);
  }
}

globalThis.ClientAppUI = ClientAppUI;
if (typeof module !== "undefined" && module.exports) module.exports = ClientAppUI;

if (typeof document !== 'undefined') {
  var root = document.getElementById('app-root') || document.body;
  if (typeof ClientAppUI !== 'undefined') {
    var savedView = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_active_dock_view')) || 'workspace';
    if (typeof LunoSpaDock !== 'undefined') {
      LunoSpaDock.mountView(savedView);
    } else {
      ClientAppUI.renderOutboxFirstLayout(root);
    }
  }
}