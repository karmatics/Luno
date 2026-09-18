class OutboxOptionsModal {
  constructor() {}

  static promptBundleOptionsModal(originElement) {
      var existing = document.getElementById('luno-bundle-options-modal');
      if (existing) existing.remove();

      var m = function(tag, attrs) {
        var children = Array.prototype.slice.call(arguments, 2);
        if (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement) {
          return LunoUIComponents.makeElement.apply(LunoUIComponents, [tag, attrs].concat(children));
        }
        var el = document.createElement(tag);
        if (attrs && typeof attrs === 'object') Object.assign(el, attrs);
        children.forEach(function(c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
      };

      var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      var isNotLibrary = (currentTarget.toLowerCase() !== 'library');
      var includeInstructions = true;
      var includeProjectLibrary = true;
      var includeAllLibrary = false;

      if (originElement && typeof LunoAnimationEngine !== 'undefined') {
        var rect = originElement.getBoundingClientRect();
        LunoAnimationEngine.burstSparks(rect.left + (rect.width / 2), rect.top + (rect.height / 2), '#8257e5', 10);
      }

      var chkInstructions = m('input', {
        type: 'checkbox',
        checked: true,
        id: 'chk-bundle-instructions',
        style: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#00f2fe' },
        onchange: function(e) { includeInstructions = e.target.checked; }
      });

      var chkProjectLibrary = m('input', {
        type: 'checkbox',
        checked: true,
        id: 'chk-bundle-project-library',
        style: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3fb950' },
        onchange: function(e) { includeProjectLibrary = e.target.checked; }
      });

      var chkAllLibrary = m('input', {
        type: 'checkbox',
        checked: false,
        id: 'chk-bundle-all-library',
        style: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#8257e5' },
        onchange: function(e) {
          includeAllLibrary = e.target.checked;
          if (includeAllLibrary) {
            chkProjectLibrary.checked = true;
            includeProjectLibrary = true;
          }
        }
      });

      var instructionsToggleRow = m('label', {
        style: {
          display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0d1117',
          border: '1px solid #00f2fe66', borderRadius: '6px', padding: '0.55rem 0.75rem',
          cursor: 'pointer', userSelect: 'none'
        }
      },
        chkInstructions,
        m('div', { style: { display: 'flex', flexDirection: 'column' } },
          m('strong', { style: { color: '#00f2fe', fontSize: '0.8rem' } }, 'Prepend Modular Protocol Instructions'),
          m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, 'Teaches LLMs the English sandwich rule, single code fence, and AST container syntax.')
        )
      );

      var projectLibraryToggleRow = isNotLibrary ? m('label', {
        style: {
          display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0d1117',
          border: '1px solid #23863688', borderRadius: '6px', padding: '0.55rem 0.75rem',
          cursor: 'pointer', userSelect: 'none'
        }
      },
        chkProjectLibrary,
        m('div', { style: { display: 'flex', flexDirection: 'column' } },
          m('strong', { style: { color: '#3fb950', fontSize: '0.8rem' } }, 'Include Project Library Dependencies (Default)'),
          m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, 'Includes only the shared modules declared in this project\'s luno.json manifest (e.g. DomBasics.js).')
        )
      ) : null;

      var allLibraryToggleRow = isNotLibrary ? m('label', {
        style: {
          display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0d1117',
          border: '1px solid #8257e566', borderRadius: '6px', padding: '0.55rem 0.75rem',
          cursor: 'pointer', userSelect: 'none'
        }
      },
        chkAllLibrary,
        m('div', { style: { display: 'flex', flexDirection: 'column' } },
          m('strong', { style: { color: '#d2a8ff', fontSize: '0.8rem' } }, 'Include Entire Shared Library Hub (All 48 Modules)'),
          m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, 'Bundles every file in Library/ (advanced / larger package).')
        )
      ) : null;

      var modal = m('div', {
        id: 'luno-bundle-options-modal',
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9980, fontFamily: 'monospace', padding: '1rem'
        }
      });

      var card = m('div', {
        style: {
          background: '#161b22', border: '2px solid #8257e5', borderRadius: '12px',
          padding: '1.25rem', maxWidth: '560px', width: '100%', display: 'flex',
          flexDirection: 'column', gap: '0.85rem', boxShadow: '0 12px 32px rgba(130,87,229,0.3)',
          transform: 'scale(0.92)', opacity: '0', transition: 'transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out'
        }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d', paddingBottom: '0.5rem' } },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
            m('strong', { style: { color: '#d2a8ff', fontSize: '1.1rem' } }, '📦 Outbox Bundle Manager'),
            m('span', { style: { fontSize: '0.72rem', color: '#3fb950', background: '#0d2818', border: '1px solid #238636', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 'bold' } }, 'Target: ' + currentTarget)
          ),
          m('button', { style: { background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }, onclick: function() { modal.remove(); } }, '✖')
        ),

        m('p', { style: { fontSize: '0.78rem', color: '#8b949e', margin: 0, lineHeight: '1.4' } },
          'Package codebase context for ',
          m('strong', { style: { color: '#00f2fe' } }, '[' + currentTarget + ']'),
          ' to transmit to ChatGPT, Claude, Gemini, or Google AI Studio.'
        ),

        instructionsToggleRow,
        projectLibraryToggleRow,
        allLibraryToggleRow,

        m('button', {
          id: 'btn-exec-bundle-modal',
          style: {
            padding: '0.8rem',
            background: '#8257e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(130,87,229,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'box-shadow 0.2s ease'
          },
          onclick: async function() {
            var btnEl = document.getElementById('btn-exec-bundle-modal');
            var startSourceRect = btnEl ? btnEl.getBoundingClientRect() : null;

            if (btnEl) {
              btnEl.style.boxShadow = '0 0 24px #00f2fe, 0 0 12px #d2a8ff';
            }

            modal.remove();

            if (typeof ClientAppUI !== 'undefined') {
              ClientAppUI.outboxExpanded = true;
              var outboxContent = document.getElementById('outbox-card-content');
              if (outboxContent) {
                outboxContent.classList.remove('collapsed');
                var arrow = document.querySelector('.outbox-card .luno-accordion-arrow');
                if (arrow) arrow.classList.remove('luno-arrow-collapsed');
              }
            }

            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
              ClientApp.showToast('Bundling codebase for [' + currentTarget + ']...', 'info', '⚡');
            }

            if (typeof OutboxQueue !== 'undefined' && OutboxQueue.executeSmartBundle) {
              await OutboxQueue.executeSmartBundle({
                includeInstructions: includeInstructions,
                includeProjectLibrary: includeProjectLibrary,
                includeAllLibrary: includeAllLibrary
              });
            }

            var queueContainer = document.getElementById('outbox-queue-container');
            var targetSlotRect = null;
            if (queueContainer) {
              var qRect = queueContainer.getBoundingClientRect();
              targetSlotRect = {
                top: qRect.top + 72,
                left: qRect.left,
                width: qRect.width || 320,
                height: 52
              };
            }

            if (typeof LunoAnimationEngine !== 'undefined' && typeof LunoAnimationEngine.morphElement === 'function' && startSourceRect && targetSlotRect) {
              LunoAnimationEngine.morphElement(startSourceRect, targetSlotRect, {
                label: '📦 ' + currentTarget + ' Package',
                color: '#d2a8ff',
                glowColor: 'rgba(130, 87, 229, 0.85)',
                startBg: '#8257e5',
                endBg: '#2a0826',
                duration: 440,
                onComplete: function() {
                  if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
                    OutboxWidgetRenderer.renderWidget('outbox-queue-container');
                  }
                }
              });
            } else {
              if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
                OutboxWidgetRenderer.renderWidget('outbox-queue-container');
              }
            }
          }
        }, '📦 Bundle Project [' + currentTarget + '] ➔'),

        m('div', {
          style: { background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
          onclick: function(e) {
            var rowEl = e.currentTarget;
            var startSourceRect = rowEl ? rowEl.getBoundingClientRect() : null;

            modal.remove();

            if (typeof ClientAppUI !== 'undefined') {
              ClientAppUI.outboxExpanded = true;
              var outboxContent = document.getElementById('outbox-card-content');
              if (outboxContent) {
                outboxContent.classList.remove('collapsed');
                var arrow = document.querySelector('.outbox-card .luno-accordion-arrow');
                if (arrow) arrow.classList.remove('luno-arrow-collapsed');
              }
            }

            if (typeof LunoPromptInstructions !== 'undefined' && typeof OutboxQueue !== 'undefined') {
              var instText = LunoPromptInstructions.assembleFullInstructions();
              OutboxQueue.addBundle('Luno Protocol Master Instructions', instText, { priority: 'high' });
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast('Queued Protocol Instructions to Outbox!', 'success', '📋');
              }
            }

            var queueContainer = document.getElementById('outbox-queue-container');
            var targetSlotRect = null;
            if (queueContainer) {
              var qRect = queueContainer.getBoundingClientRect();
              targetSlotRect = {
                top: qRect.top + 72,
                left: qRect.left,
                width: qRect.width || 320,
                height: 52
              };
            }

            if (typeof LunoAnimationEngine !== 'undefined' && typeof LunoAnimationEngine.morphElement === 'function' && startSourceRect && targetSlotRect) {
              LunoAnimationEngine.morphElement(startSourceRect, targetSlotRect, {
                label: '📋 Protocol Rules',
                color: '#00f2fe',
                glowColor: 'rgba(0, 242, 254, 0.85)',
                startBg: '#0d2d4a',
                endBg: '#0d1117',
                duration: 400,
                onComplete: function() {
                  if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
                    OutboxWidgetRenderer.renderWidget('outbox-queue-container');
                  }
                }
              });
            } else {
              if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
                OutboxWidgetRenderer.renderWidget('outbox-queue-container');
              }
            }
          }
        },
          m('div', {},
            m('strong', { style: { color: '#d2a8ff', fontSize: '0.8rem', display: 'block' } }, '📋 Instructions Only (No Files)'),
            m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, 'Queue just the protocol formatting rules without any codebase files.')
          ),
          m('span', { style: { color: '#d2a8ff', fontSize: '0.75rem', fontWeight: 'bold' } }, '➔')
        ),

        m('button', {
          style: { padding: '0.55rem', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem' },
          onclick: function() { modal.remove(); }
        }, 'Cancel')
      );

      modal.appendChild(card);
      document.body.appendChild(modal);

      requestAnimationFrame(function() {
        card.style.transform = 'scale(1)';
        card.style.opacity = '1';
      });
    }
}

if (typeof OutboxQueue !== 'undefined') {
  OutboxQueue.promptBundleOptionsModal = OutboxOptionsModal.promptBundleOptionsModal;
}

globalThis.OutboxOptionsModal = OutboxOptionsModal;
if (typeof module !== "undefined" && module.exports) module.exports = OutboxOptionsModal;