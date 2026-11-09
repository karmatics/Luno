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

  static renderFleetSyncCard(m) {
      if (document.getElementById('luno-unified-git-deck')) return document.createElement('div');
      return ClientAppUI.renderGitDeck(m);
  }

  static renderCheckpointButton(m) {
      if (document.getElementById('luno-unified-git-deck')) return document.createElement('div');
      return ClientAppUI.renderGitDeck(m);
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

      // UNIFIED GIT & FLEET SYNCHRONIZER DECK (Consolidates Fleet Sync & Project Checkpoint into one card)
      mainBox.appendChild(ClientAppUI.renderGitDeck(m));

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
  static renderGitDeck(m) {
      var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
      var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      var isLinux = typeof ClientApp !== 'undefined' && (ClientApp.isLinux || ClientApp.activePlatform === 'linux');
      var thisNodeLabel = isLinux ? '🐧 Linux Laptop' : '🍎 Mac Workstation';
      var peerHost = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getPeerHost() : (isLinux ? '10.0.0.226' : '10.0.0.245');
      var peerLabel = isLinux ? 'Mac' : 'Linux';

      var isStatic = (typeof LunoFileSystem !== 'undefined' && LunoFileSystem.isStaticHosting());
      var account = (typeof LunoDeployEngine !== 'undefined' && LunoDeployEngine.getGithubAccount) ? LunoDeployEngine.getGithubAccount() : 'karmatics';
      var remoteRepo = (typeof LunoDeployEngine !== 'undefined') ? LunoDeployEngine.getRemoteRepoName(currentTarget) : currentTarget;
      var liveUrl = 'https://' + account.toLowerCase() + '.github.io/' + remoteRepo + '/';
      var localUrl = (currentTarget === 'Luno') ? '/' : ('/' + encodeURIComponent(currentTarget) + '/');

      var container = el('div', {
        id: 'luno-unified-git-deck',
        style: {
          background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
          border: '2px solid #238636',
          borderRadius: '10px',
          padding: '0.85rem',
          margin: '0.3rem auto 0.65rem auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'monospace'
        }
      });

      // 1. Deck Header: Node Identity & Configurable Peer
      var topRow = el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', borderBottom: '1px solid #21262d', paddingBottom: '0.45rem' }
      },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' } },
          el('strong', { style: { color: '#00f2fe', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem' } }, '🔄 GIT & FLEET SYNCHRONIZER'),
          el('span', { style: { fontSize: '0.68rem', color: '#c9d1d9', background: '#21262d', border: '1px solid #30363d', padding: '0.12rem 0.45rem', borderRadius: '10px' } }, `Here: ${thisNodeLabel}`),
          el('span', {
            id: 'deck-peer-indicator',
            style: { fontSize: '0.68rem', color: '#00f2fe', background: '#003847', border: '1px solid #00f2fe', padding: '0.12rem 0.45rem', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
            title: 'Click to configure peer IP address',
            onclick: function() {
              var newIp = prompt('Configure Peer Node IP address on local network:', peerHost);
              if (newIp && newIp.trim()) {
                LunoDeployEngine.setPeerHost(newIp.trim());
                ClientAppUI.refreshGitDeckStatus(currentTarget);
              }
            }
          }, `Peer: ${peerHost}:8080 ⚙️`)
        ),
        el('button', {
          style: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '0.74rem', textDecoration: 'underline' },
          onclick: function() { ClientAppUI.refreshGitDeckStatus(currentTarget); }
        }, '↻ Refresh Status')
      );

      // 2. SECTION A: Active Project Scope (Commit & Deploy to Pages)
      var noteInput = el('input', {
        id: 'deck-checkpoint-note',
        type: 'text',
        placeholder: `[${currentTarget}] Commit note (optional, auto-generated if left blank)...`,
        style: {
          width: '100%',
          padding: '0.55rem 0.75rem',
          background: '#0d1117',
          color: '#00f2fe',
          border: '1px solid #30363d',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          outline: 'none',
          boxSizing: 'border-box'
        }
      });

      var chkDeployPages = el('input', {
        id: 'deck-chk-deploy-pages',
        type: 'checkbox',
        checked: true,
        style: { width: '15px', height: '15px', cursor: 'pointer', accentColor: '#238636' }
      });

      var btnProjectCommit = el('button', {
        id: 'btn-deck-project-commit',
        style: {
          flex: '1.4 1 200px',
          padding: '0.75rem',
          background: '#238636',
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
      }, `📸 Checkpoint & Deploy [${currentTarget}]`);

      var btnProjectPull = el('button', {
        id: 'btn-deck-project-pull',
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
          fontFamily: 'monospace'
        },
        title: `Pull latest updates from GitHub for [${currentTarget}]`
      }, `⬇️ Pull [${currentTarget}]`);

      btnProjectCommit.onclick = async function() {
        btnProjectCommit.disabled = true;
        var isDeploy = chkDeployPages.checked;
        btnProjectCommit.textContent = isDeploy ? '🚀 Deploying...' : '📸 Saving Snapshot...';

        var note = noteInput.value.trim();
        var msg = note || (`[${currentTarget}] Auto-Checkpoint ${new Date().toLocaleString()}`);

        try {
          var res = await LunoDeployEngine.checkpointTargetProject(currentTarget, msg, { deployToPages: isDeploy });
          if (res && res.success) {
            if (typeof ClientApp !== 'undefined') {
              ClientApp.showToast(isDeploy ? `Deployed [${currentTarget}] to GitHub Pages!` : `Saved local snapshot for [${currentTarget}]!`, 'success', '📸');
              await ClientApp.fetchCodebaseMetrics(currentTarget);
            }
            noteInput.value = '';
            ClientAppUI.refreshGitDeckStatus(currentTarget);
          }
        } catch (err) {
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast(`Notice: ${err.message}`, 'error', '❌');
          }
        } finally {
          btnProjectCommit.disabled = false;
          btnProjectCommit.textContent = `📸 Checkpoint & Deploy [${currentTarget}]`;
        }
      };

      btnProjectPull.onclick = async function() {
        btnProjectPull.disabled = true;
        btnProjectPull.textContent = '⏳ Pulling...';
        try {
          var res = await LunoDeployEngine.pullProject(currentTarget);
          if (res && res.success) {
            if (typeof ClientApp !== 'undefined') {
              ClientApp.showToast(`[${currentTarget}] up to date!`, 'success', '⬇️');
              await ClientApp.fetchCodebaseMetrics(currentTarget);
            }
            ClientAppUI.refreshGitDeckStatus(currentTarget);
          }
        } catch(err) {
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast(`Pull notice: ${err.message}`, 'error', '❌');
          }
        } finally {
          btnProjectPull.disabled = false;
          btnProjectPull.textContent = `⬇️ Pull [${currentTarget}]`;
        }
      };

      var projectSection = el('div', {
        style: {
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem'
        }
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
            el('strong', { style: { color: '#f0f6fc', fontSize: '0.88rem' } }, '🎯 CURRENT PROJECT:'),
            el('span', { style: { color: '#00f2fe', fontWeight: 'bold', fontSize: '0.88rem' } }, currentTarget)
          ),
          el('span', {
            id: 'deck-project-status-pill',
            style: { fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid #238636', padding: '0.12rem 0.5rem', borderRadius: '10px', fontWeight: 'bold' }
          }, 'Checking status...')
        ),
        el('div', {
          id: 'deck-project-dirty-files',
          style: { display: 'none', fontSize: '0.72rem', color: '#ffb74d', background: '#0d1117', border: '1px solid #ff980044', borderRadius: '6px', padding: '0.45rem 0.65rem' }
        }),
        noteInput,
        el('label', {
          style: { display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#c9d1d9', cursor: 'pointer', userSelect: 'none' }
        },
          chkDeployPages,
          el('span', {}, '🚀 Deploy to GitHub Pages (push remote & publish live site)')
        ),
        el('div', { style: { display: 'flex', gap: '0.45rem', flexWrap: 'wrap' } },
          btnProjectCommit,
          btnProjectPull
        ),
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', paddingTop: '0.15rem' } },
          el('div', { style: { display: 'flex', gap: '0.6rem', alignItems: 'center' } },
            el('a', { href: liveUrl, target: '_blank', style: { color: '#58a6ff', textDecoration: 'none', fontWeight: 'bold' } }, '🌐 Live Pages Site ↗'),
            el('a', { href: localUrl, target: '_blank', style: { color: '#7ee787', textDecoration: 'none', fontWeight: 'bold' } }, '🖥️ Standalone Tab ↗')
          ),
          el('span', { style: { color: '#8b949e' } }, 'Use for active project only')
        )
      );

      // 3. SECTION B: Fleet-Wide Cross-Machine Sync (All 44 Repos)
      var btnFleetCatchUp = el('button', {
        id: 'btn-deck-fleet-pull',
        style: {
          flex: '1 1 180px',
          padding: '0.75rem',
          background: '#003847',
          color: '#00f2fe',
          border: '1px solid #00f2fe',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: 'monospace'
        }
      }, '⬇️ Catch Up Fleet (Pull All Repos)');

      var btnFleetPush = el('button', {
        id: 'btn-deck-fleet-push',
        style: {
          flex: '1.4 1 220px',
          padding: '0.75rem',
          background: '#238636',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: '0.88rem',
          cursor: 'pointer',
          fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)'
        }
      }, `🚀 Sync Fleet to Peer (Push & Notify ${peerLabel})`);

      var fleetStatusPanel = el('div', {
        id: 'deck-fleet-live-status-panel',
        style: {
          display: 'none',
          background: '#070a13',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '0.6rem 0.85rem',
          fontSize: '0.74rem',
          color: '#7ee787',
          whiteSpace: 'pre-wrap',
          maxHeight: '140px',
          overflowY: 'auto'
        }
      });

      btnFleetCatchUp.onclick = async function() {
        btnFleetCatchUp.disabled = true;
        btnFleetCatchUp.textContent = '⏳ Catching up...';
        fleetStatusPanel.style.display = 'block';
        fleetStatusPanel.textContent = '⬇️ Pulling latest updates from GitHub across all repositories (with local auto-snapshot protection)...';

        try {
          var res = await LunoDeployEngine.fleetSync('pull');
          if (res && res.success) {
            fleetStatusPanel.textContent = `✅ Catch-Up Complete (${res.totalRepos || 44} repos inspected):\nEverything is up to date on this machine with clean local snapshots.`;
            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
              ClientApp.showToast('Caught up cleanly from remote!', 'success', '⬇️');
            }
            ClientAppUI.refreshGitDeckStatus(currentTarget);
          } else {
            fleetStatusPanel.textContent = '⚠️ Pull Report:\n' + ((res && res.error) || 'Some repos reported merge notices.');
          }
        } catch (err) {
          fleetStatusPanel.textContent = '❌ Pull Error: ' + err.message;
        } finally {
          btnFleetCatchUp.disabled = false;
          btnFleetCatchUp.textContent = '⬇️ Catch Up Fleet (Pull All Repos)';
        }
      };

      btnFleetPush.onclick = async function() {
        btnFleetPush.disabled = true;
        btnFleetPush.textContent = '⏳ Synchronizing Fleet...';
        fleetStatusPanel.style.display = 'block';
        fleetStatusPanel.textContent = `⚡ Committing modified projects, pushing to GitHub Pages, and notifying ${peerLabel}...`;

        try {
          var res = await LunoDeployEngine.syncEverything({
            peerHost: peerHost,
            onProgress: function(msg) {
              fleetStatusPanel.textContent += '\n' + msg;
              fleetStatusPanel.scrollTop = fleetStatusPanel.scrollHeight;
            }
          });

          if (res && res.success) {
            fleetStatusPanel.textContent = res.summary;
            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
              ClientApp.showToast('Fleet Synced Cleanly!', 'success', '🎉');
            }
            ClientAppUI.refreshGitDeckStatus(currentTarget);
          }
        } catch(err) {
          fleetStatusPanel.textContent = '❌ Sync Error: ' + err.message;
        } finally {
          btnFleetPush.disabled = false;
          btnFleetPush.textContent = `🚀 Sync Fleet to Peer (Push & Notify ${peerLabel})`;
        }
      };

      var fleetSection = el('div', {
        style: {
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem'
        }
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
          el('strong', { style: { color: '#d2a8ff', fontSize: '0.88rem' } }, '🌐 FLEET-WIDE MULTI-MACHINE SYNC (All 44 Repos):'),
          el('span', {
            id: 'deck-fleet-status-pill',
            style: { fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid #238636', padding: '0.12rem 0.5rem', borderRadius: '10px', fontWeight: 'bold' }
          }, 'All repos clean ✓')
        ),
        el('div', { style: { fontSize: '0.74rem', color: '#8b949e', lineHeight: '1.4' } },
          '• <strong>Catch Up:</strong> Sitting down here? Pull everything your other machine worked on.<br>' +
          '• <strong>Sync Fleet:</strong> Leaving this machine? Push everything to GitHub & signal your other machine.'
        ),
        el('div', { style: { display: 'flex', gap: '0.45rem', flexWrap: 'wrap' } },
          btnFleetCatchUp,
          btnFleetPush
        ),
        fleetStatusPanel
      );

      container.appendChild(topRow);
      container.appendChild(projectSection);
      container.appendChild(fleetSection);

      setTimeout(() => ClientAppUI.refreshGitDeckStatus(currentTarget), 80);
      return container;
  }

  static async refreshGitDeckStatus(projectName) {
      var pName = projectName || ((typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno');

      // 1. Query Active Project Git Status
      var projPill = document.getElementById('deck-project-status-pill');
      var dirtyBox = document.getElementById('deck-project-dirty-files');
      var btnCommit = document.getElementById('btn-deck-project-commit');

      if (projPill) {
        projPill.textContent = 'Checking...';
        projPill.style.color = '#00f2fe';
      }

      try {
        var diffRes = await LunoApiClient.fetchFileDiff('all', pName);
        var modifiedFiles = (diffRes && Array.isArray(diffRes.modifiedFiles)) ? diffRes.modifiedFiles : [];

        if (projPill) {
          if (modifiedFiles.length > 0) {
            projPill.textContent = `● ${modifiedFiles.length} file(s) modified`;
            projPill.style.color = '#ff9800';
            projPill.style.background = 'rgba(255,152,0,0.15)';
            projPill.style.borderColor = '#ff9800';

            if (dirtyBox) {
              dirtyBox.style.display = 'block';
              var fileNames = modifiedFiles.map(f => `• ${f.path}`).join('  ');
              dirtyBox.innerHTML = `<strong>Modified Files (${modifiedFiles.length}):</strong><br>${fileNames}`;
            }

            if (btnCommit) {
              btnCommit.textContent = `📸 Checkpoint & Deploy [${pName}] (${modifiedFiles.length} changed)`;
              btnCommit.style.background = '#238636';
              btnCommit.style.boxShadow = '0 4px 12px rgba(35,134,54,0.4)';
            }
          } else {
            projPill.textContent = `✓ Clean & up to date with Pages`;
            projPill.style.color = '#10b981';
            projPill.style.background = 'rgba(16,185,129,0.15)';
            projPill.style.borderColor = '#238636';

            if (dirtyBox) {
              dirtyBox.style.display = 'none';
              dirtyBox.innerHTML = '';
            }

            if (btnCommit) {
              btnCommit.textContent = `✓ [${pName}] Clean (Re-deploy if desired)`;
              btnCommit.style.background = '#21262d';
              btnCommit.style.boxShadow = 'none';
            }
          }
        }
      } catch(e) {}

      // 2. Query Fleet-Wide Status
      var fleetPill = document.getElementById('deck-fleet-status-pill');
      try {
        var fleetRes = await LunoDeployEngine.getFleetStatus(false);
        var dirtyProjects = (fleetRes && fleetRes.dirtyProjects) || [];
        if (fleetPill) {
          if (dirtyProjects.length > 0) {
            fleetPill.textContent = `⚠️ ${dirtyProjects.length} project(s) modified in fleet`;
            fleetPill.style.color = '#ff9800';
            fleetPill.style.background = 'rgba(255,152,0,0.15)';
            fleetPill.style.borderColor = '#ff9800';
          } else {
            fleetPill.textContent = `All ${fleetRes.totalRepos || 44} repos in sync ✓`;
            fleetPill.style.color = '#10b981';
            fleetPill.style.background = 'rgba(16,185,129,0.15)';
            fleetPill.style.borderColor = '#238636';
          }
        }
      } catch(e) {}
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