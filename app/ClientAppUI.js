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
            style: { padding: '0.2rem 0.55rem', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '12px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' },
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

      // Card 1: Start a New Project
      cards.push(el('div', {
        style: {
          background: '#0d1117',
          border: '1px solid #58a6ff',
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
          if (typeof LunoSpaDock !== 'undefined') {
            LunoSpaDock.mountView('projects');
          }
        }
      },
        el('strong', { style: { color: '#58a6ff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' } }, '🌱 New Project'),
        el('span', { style: { fontSize: '0.72rem', color: '#8b949e', lineHeight: '1.3' } }, 'Select starter template.')
      ));

      // Card 2: Projects & Deploy Hub
      cards.push(el('div', {
        style: {
          background: '#0d1117',
          border: '1px solid #00f2fe',
          borderRadius: '8px',
          padding: '0.75rem',
          cursor: 'pointer',
          flex: '1 1 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        },
        onclick: function() {
          if (typeof LunoSpaDock !== 'undefined') {
            LunoSpaDock.mountView('projects');
          }
        }
      },
        el('strong', { style: { color: '#00f2fe', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' } }, '🚀 Projects Hub'),
        el('span', { style: { fontSize: '0.72rem', color: '#8b949e', lineHeight: '1.3' } }, 'Switch, preview & deploy.')
      ));

      // Card 3: Self-Improve Luno
      cards.push(el('div', {
        style: {
          background: '#0d1117',
          border: '1px solid #238636',
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
            if (ClientApp.showToast) {
              ClientApp.showToast('Active in Luno Self-Improvement Mode!', 'success', '⚡');
            }
            if (typeof ClientAppUI !== 'undefined') {
              ClientAppUI.renderOutboxFirstLayout(document.getElementById('app-root') || document.body);
            }
          }
        }
      },
        el('strong', { style: { color: '#3fb950', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' } }, '⚡ Luno Core'),
        el('span', { style: { fontSize: '0.72rem', color: '#8b949e', lineHeight: '1.3' } }, 'Edit workspace source.')
      ));

      return el('div', {
        style: {
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '10px',
          padding: '0.85rem',
          marginBottom: '0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          el('strong', { style: { color: '#00f2fe', fontSize: '0.9rem', fontFamily: 'monospace' } }, '🚀 What do you want to build?'),
          el('button', {
            style: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'monospace' },
            title: 'Minimize Starter Panel',
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
      style: { fontSize: '0.85rem', color: '#d2a8ff' }
    }, '▼');

    var outboxContent = el('div', {
      id: 'outbox-card-content',
      style: {
        display: 'block',
        marginTop: '0.5rem',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      el('div', { id: 'outbox-queue-container', style: { width: '100%', minHeight: '80px' } })
    );

    setTimeout(function() {
      if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
        try { OutboxWidgetRenderer.renderWidget('outbox-queue-container'); } catch(e){}
      } else if (typeof OutboxQueue !== 'undefined' && OutboxQueue.renderWidget) {
        try { OutboxQueue.renderWidget(); } catch(e){}
      }
    }, 20);

    return el('div', {
      className: 'outbox-card glow-card',
      style: { background: 'linear-gradient(135deg, #271052 0%, #161b22 100%)', border: '2px solid #8257e5', borderRadius: '10px', padding: '0.75rem', boxShadow: '0 4px 12px rgba(130, 87, 229, 0.25)', width: '100%', boxSizing: 'border-box' }
    },
      el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '0.35rem' },
        onclick: function(e) {
          if (e.target.tagName !== 'BUTTON') {
            ClientAppUI.outboxExpanded = !ClientAppUI.outboxExpanded;
            outboxContent.style.display = ClientAppUI.outboxExpanded ? 'block' : 'none';
            if (ClientAppUI.outboxExpanded) {
              arrowOutbox.classList.remove('luno-arrow-collapsed');
              if (typeof OutboxWidgetRenderer !== 'undefined') {
                OutboxWidgetRenderer.renderWidget('outbox-queue-container');
              }
            } else {
              arrowOutbox.classList.add('luno-arrow-collapsed');
            }
          }
        }
      },
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.1rem' } },
          el('div', { style: { fontSize: '1rem', fontWeight: 'bold', color: '#a371f7', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' } },
            'OUTBOX',
            el('span', { style: { fontSize: '0.72rem', color: '#d2a8ff', opacity: 0.85, fontWeight: 'normal' } }, '(send to llm)')
          )
        ),
        arrowOutbox
      ),
      outboxContent
    );
  }

  static renderInboxCard(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var arrowInbox = el('span', { style: { fontSize: '0.85rem', color: '#7ee787' } }, ClientAppUI.inboxExpanded ? '▲' : '▼');

    var inboxContent = el('div', {
      id: 'inbox-card-content',
      style: {
        display: ClientAppUI.inboxExpanded ? 'block' : 'none',
        marginTop: '0.5rem',
        width: '100%',
        boxSizing: 'border-box'
      }
    },
      el('div', { style: { display: 'flex', gap: '0.4rem', marginBottom: '0.45rem', flexWrap: 'wrap' } },
        el('button', {
          id: 'btn-paste-chatbot',
          className: 'btn-primary',
          style: {
            width: '100%',
            padding: '0.85rem',
            background: '#238636',
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
            } else if (typeof ClientApp !== 'undefined' && ClientApp.pasteClipboard) {
              ClientApp.pasteClipboard();
            }
          }
        }, '📥 Paste from Chatbot')
      ),
      el('div', { id: 'inbox-metrics-badge', style: { fontSize: '0.72rem', color: '#7ee787', fontFamily: 'monospace' } })
    );

    return el('div', {
      className: 'inbox-card glow-card',
      style: {
        background: 'linear-gradient(135deg, #0d2818 0%, #161b22 100%)',
        border: '2px solid #238636',
        borderRadius: '10px',
        padding: '0.75rem',
        boxShadow: '0 4px 12px rgba(35, 134, 54, 0.25)',
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
            arrowInbox.textContent = ClientAppUI.inboxExpanded ? '▲' : '▼';
          }
        }
      },
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.1rem' } },
          el('div', { style: { fontSize: '1rem', fontWeight: 'bold', color: '#3fb950', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' } },
            'INBOX',
            el('span', { style: { fontSize: '0.72rem', color: '#7ee787', opacity: 0.85, fontWeight: 'normal' } }, '(receive from LLM)')
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
        boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)'
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

  static renderCheckpointButton(m) {
    var el = m || (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    var btn = el('button', {
      id: 'btn-frontpage-checkpoint',
      style: {
        padding: '0.85rem 1.8rem',
        background: '#161b22',
        color: '#c9d1d9',
        border: '1px solid #30363d',
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        margin: '0.2rem auto 0.4rem auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '360px',
        transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.15s ease-out, box-shadow 0.15s ease-out',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      },
      onclick: function() {
        if (typeof LunoAnimationEngine !== 'undefined') {
          var rect = btn.getBoundingClientRect();
          LunoAnimationEngine.burstSparks(rect.left + (rect.width / 2), rect.top + (rect.height / 2), '#00f2fe', 14);
          if (typeof LunoAnimationEngine.shutterFlash === 'function') {
            LunoAnimationEngine.shutterFlash(btn, '#00f2fe');
          }
        }
        setTimeout(function() {
          if (typeof LunoSpaDock !== 'undefined') {
            LunoSpaDock.mountView('checkpoint');
          }
        }, 180);
      }
    },
      el('span', { style: { fontSize: '0.95rem', fontWeight: 'bold', color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.35rem' } }, '📸 Checkpoint'),
      el('span', { id: 'checkpoint-btn-subtitle', style: { fontSize: '0.72rem', color: '#8b949e', marginTop: '0.15rem' } }, 'save in git')
    );

    return btn;
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
            } else if (typeof ClientApp !== 'undefined' && ClientApp.saveCode) {
              ClientApp.saveCode();
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
    var activeRoot = (typeof ClientAppCore !== 'undefined' && ClientAppCore.activeRootDir) ? ClientAppCore.activeRootDir : ((typeof ClientApp !== 'undefined' && ClientApp.activeRootDir) || 'Project Root');
    return el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.45rem', borderTop: '1px solid #30363d', paddingTop: '0.55rem', flexWrap: 'wrap', gap: '0.35rem', background: '#0d1117', padding: '0.55rem', borderRadius: '8px', width: '100%', boxSizing: 'border-box' } },
      el('span', {
        id: 'active-root-label',
        style: { fontSize: '0.72rem', color: '#c9d1d9', background: '#21262d', border: '1px solid #30363d', padding: '0.25rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace', cursor: 'pointer' },
        onclick: function() {
          if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('projects');
        }
      }, activeRoot),
      el('span', { id: 'luno-version-tag', style: { fontSize: '0.68rem', color: '#8b949e', background: '#161b22', border: '1px solid #30363d', padding: '0.2rem 0.45rem', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 'bold' } }, verText)
    );
  }

  static renderOutboxFirstLayout(container) {
    if (!container) return;
    var m = typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null;

    container.innerHTML = '';
    var verText = (typeof LunoVersion !== 'undefined') ? LunoVersion.getBadgeText() : 'v3.7.7';

    // Desktop landscape comfortable centered container (max-width: 1040px)
    var mainBox = m('div', {
      style: {
        fontFamily: 'monospace',
        padding: '0.75rem 1rem',
        maxWidth: '1040px',
        width: '100%',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxSizing: 'border-box'
      }
    });

    var header = (typeof LunoSpaDock !== 'undefined' && LunoSpaDock.renderHeaderNav) ? LunoSpaDock.renderHeaderNav('workspace') : m('header', {}, 'Luno Home');
    var telemetryDrawer = m('div', { id: 'luno-telemetry-drawer-container' });

    // Responsive Dual-Column Row for Desktop: Outbox and Inbox sit side-by-side
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
      m('div', { style: { flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column' } }, ClientAppUI.renderOutboxCard(m)),
      m('div', { style: { flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column' } }, ClientAppUI.renderInboxCard(m))
    );

    mainBox.appendChild(header);
    mainBox.appendChild(ClientAppUI.renderStarterPanel(m));
    mainBox.appendChild(dualHeroRow);
    mainBox.appendChild(telemetryDrawer);
    mainBox.appendChild(ClientAppUI.renderOutputFeedbackCard(m));
    mainBox.appendChild(ClientAppUI.renderQuestionAccent(m));
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

// Trigger instant hot-render of the updated header nav
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