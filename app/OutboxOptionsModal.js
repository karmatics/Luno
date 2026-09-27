class OutboxOptionsModal {
  constructor() {}

  static async promptBundleOptionsModal(originElement) {
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
        var selectedVisibilitySet = null;

        if (originElement && typeof LunoAnimationEngine !== 'undefined') {
          var rect = originElement.getBoundingClientRect();
          LunoAnimationEngine.burstSparks(rect.left + (rect.width / 2), rect.top + (rect.height / 2), '#8257e5', 10);
        }

        // Discover Visibility Sets for currentTarget (from VisibilitySetsCapsule.js or luno.json)
        var availableSets = {};
        try {
          if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
            // Check VisibilitySetsCapsule.js
            var capRes = await LunoApiClient.fetchFsRead('VisibilitySetsCapsule.js', currentTarget);
            if (capRes && capRes.success && capRes.content) {
              var setRegex = /static\s+(_set_[A-Za-z0-9_$]+)\s*\(\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\});?\s*\}/g;
              var match;
              while ((match = setRegex.exec(capRes.content)) !== null) {
                try {
                  var parsedSet = JSON.parse(match[2]);
                  if (parsedSet && parsedSet.name && parsedSet.files) {
                    availableSets[parsedSet.name] = Object.keys(parsedSet.files);
                  }
                } catch(e) {}
              }
            }

            // Check luno.json visibilitySets
            var metaRes = await LunoApiClient.fetchFsRead('luno.json', currentTarget);
            if (metaRes && metaRes.success && metaRes.content) {
              var metaObj = JSON.parse(metaRes.content);
              if (metaObj.visibilitySets && typeof metaObj.visibilitySets === 'object') {
                Object.assign(availableSets, metaObj.visibilitySets);
              }
            }
          }
        } catch(e) {}

        var setKeys = Object.keys(availableSets);

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

        var setSelectorRow = null;
        if (setKeys.length > 0) {
          var setSelect = m('select', {
            id: 'select-visibility-set',
            style: {
              background: '#070a13', color: '#00f2fe', border: '1px solid #00f2fe',
              padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem',
              fontFamily: 'monospace', fontWeight: 'bold', outline: 'none', cursor: 'pointer'
            },
            onchange: function(e) {
              var val = e.target.value;
              selectedVisibilitySet = val === '__all__' ? null : val;
            }
          },
            m('option', { value: '__all__' }, '🌐 Full Project (All Files)'),
            ...setKeys.map(function(k) {
              var count = availableSets[k] ? availableSets[k].length : 0;
              return m('option', { value: k }, '🎯 Set: ' + k + ' (' + count + ' files)');
            })
          );

          setSelectorRow = m('div', {
            style: {
              background: 'linear-gradient(135deg, #1f104d 0%, #0d1117 100%)',
              border: '2px solid #8257e5', borderRadius: '8px', padding: '0.65rem 0.75rem',
              display: 'flex', flexDirection: 'column', gap: '0.35rem',
              boxShadow: '0 4px 12px rgba(130,87,229,0.25)'
            }
          },
            m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              m('strong', { style: { color: '#d2a8ff', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' } }, '🎯 Visibility Set (Curated Context)'),
              m('span', { style: { fontSize: '0.68rem', color: '#3fb950', background: '#0d2818', border: '1px solid #238636', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' } }, setKeys.length + ' available')
            ),
            m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, 'Bundle only the files chosen for this specific feature to prevent context overload.'),
            setSelect
          );
        }

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
            m('span', { style: { color: '#8b949e', fontSize: '0.7rem' } }, 'Includes only the shared modules declared in this project\'s manifest.')
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
            m('strong', { style: { color: '#d2a8ff', fontSize: '0.8rem' } }, 'Include Entire Shared Library Hub (All Modules)'),
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
            flexDirection: 'column', gap: '0.75rem', boxShadow: '0 12px 32px rgba(130,87,229,0.3)',
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

          setSelectorRow,
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

              var scopeNotice = selectedVisibilitySet ? (' [Set: ' + selectedVisibilitySet + ']') : '';
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast('Bundling codebase for [' + currentTarget + ']' + scopeNotice + '...', 'info', '⚡');
              }

              var allowedFilePaths = (selectedVisibilitySet && availableSets[selectedVisibilitySet])
                ? availableSets[selectedVisibilitySet]
                : null;

              if (typeof OutboxQueue !== 'undefined' && OutboxQueue.executeSmartBundle) {
                await OutboxQueue.executeSmartBundle({
                  includeInstructions: includeInstructions,
                  includeProjectLibrary: includeProjectLibrary,
                  includeAllLibrary: includeAllLibrary,
                  visibilitySetName: selectedVisibilitySet,
                  allowedFilePaths: allowedFilePaths
                });
              }

              if (typeof OutboxWidgetRenderer !== 'undefined' && OutboxWidgetRenderer.renderWidget) {
                OutboxWidgetRenderer.renderWidget('outbox-queue-container');
              }
            }
          }, '📦 Bundle Project [' + currentTarget + '] ➔'),

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