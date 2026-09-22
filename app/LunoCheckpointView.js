class LunoCheckpointView {
  constructor() {}

  static lastGitOutput = '';
  static lastConsolidationOutput = '';

  static async mountUI(container) {
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

      var targetProj = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      var isStatic = (typeof LunoFileSystem !== 'undefined') ? LunoFileSystem.isStaticHosting() : false;
      var uncommittedCount = (typeof ClientApp !== 'undefined' && ClientApp.uncommittedCount) || 0;

      var activePatchMode = (typeof LunoSettings !== 'undefined' && LunoSettings.getPatchApplyMode)
        ? LunoSettings.getPatchApplyMode()
        : ((typeof localStorage !== 'undefined' && localStorage.getItem('luno_patch_apply_mode')) || 'direct');

      var isDirectMode = (activePatchMode === 'direct');

      var pendingPatchesCount = 0;
      try {
        var plRes = await LunoApiClient.fetchFsRead('LunoPatchLog.html', targetProj);
        if (plRes && plRes.success && plRes.content) {
          var parser = globalThis.LunoPayloadParser || globalThis.LunoContainerParser;
          if (parser && typeof parser.parsePatchLog === 'function') {
            var parsedPl = parser.parsePatchLog(plRes.content);
            var allFiles = parsedPl.files || [];
            pendingPatchesCount = allFiles.filter(function(f) {
              if (!f || !f.filePath) return false;
              var norm = f.filePath.replace(/\\/g, '/');
              if (targetProj === 'Luno') {
                return norm.startsWith('Luno/') || norm.startsWith('app/') || norm.startsWith('core/') || norm.startsWith('browser/') || norm.startsWith('docs/') || norm.startsWith('test/');
              }
              return norm.startsWith(targetProj + '/') || !norm.includes('/') || norm.startsWith('Library/');
            }).length;
          }
        }
      } catch(e) {}

      var pendingNote = '';
      try {
        if (typeof localStorage !== 'undefined') {
          pendingNote = localStorage.getItem('luno_pending_checkpoint_desc') || '';
        }
        var mData = await LunoApiClient.fetchFsRead('luno.json', targetProj);
        if (mData && mData.content) {
          var meta = JSON.parse(mData.content);
          if (!pendingNote && meta.pendingCheckpointDescription && !meta.pendingCheckpointDescription.startsWith('Clean')) {
            pendingNote = meta.pendingCheckpointDescription;
          }
        }
      } catch(e) {}

      var projectSelect = m('select', {
        style: { background: '#0d1117', color: '#00f2fe', border: '1px solid #00f2fe', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' },
        onchange: function(e) {
          if (typeof ClientApp !== 'undefined' && ClientApp.setTargetProject) {
            ClientApp.setTargetProject(e.target.value);
          }
          LunoCheckpointView.mountUI(container);
        }
      }, m('option', { value: targetProj }, '📁 ' + targetProj));

      setTimeout(async function() {
        try {
          if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchProjectsList) {
            var pData = await LunoApiClient.fetchProjectsList();
            if (pData && Array.isArray(pData.projects)) {
              projectSelect.innerHTML = '';
              pData.projects.forEach(function(p) {
                if (p.isLibrary || p.name === 'Library') return;
                var opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = '📁 ' + p.name + (p.name === 'Luno' ? ' (Core)' : '');
                if (p.name === targetProj) opt.selected = true;
                projectSelect.appendChild(opt);
              });
            }
          }
        } catch (e) {}
      }, 40);

      // Patch Application Mode Setting Card
      var patchModeCard = m('div', {
        style: {
          background: isDirectMode ? 'linear-gradient(135deg, #0d2818 0%, #161b22 100%)' : 'linear-gradient(135deg, #271052 0%, #161b22 100%)',
          border: '2px solid ' + (isDirectMode ? '#238636' : '#8257e5'),
          borderRadius: '10px',
          padding: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          boxShadow: isDirectMode ? '0 4px 14px rgba(35,134,54,0.25)' : '0 4px 14px rgba(130,87,229,0.25)'
        }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
          m('strong', { style: { color: isDirectMode ? '#3fb950' : '#d2a8ff', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem' } },
            '⚙️ PATCH APPLICATION WORKFLOW'
          ),
          m('span', {
            style: {
              fontSize: '0.7rem',
              fontWeight: 'bold',
              padding: '0.15rem 0.5rem',
              borderRadius: '10px',
              background: isDirectMode ? '#0d2818' : '#271052',
              color: isDirectMode ? '#7ee787' : '#d2a8ff',
              border: '1px solid ' + (isDirectMode ? '#3fb950' : '#8257e5')
            }
          }, isDirectMode ? '⚡ Auto-Apply (Default)' : '🧩 Patch Log (Advanced)')
        ),

        m('p', { style: { color: '#c9d1d9', margin: 0, fontSize: '0.78rem', lineHeight: '1.4' } },
          isDirectMode
            ? 'Surgical method patches are compiled directly into base class files in browser client JavaScript. Changes take effect on disk immediately without manual consolidation.'
            : 'Surgical method patches are journaled into LunoPatchLog.html. You can review pending patches and merge them into base files using Step 1 below.'
        ),

        m('div', { style: { display: 'flex', gap: '0.45rem', marginTop: '0.2rem', flexWrap: 'wrap' } },
          m('button', {
            id: 'btn-mode-direct',
            style: {
              flex: '1 1 140px',
              padding: '0.55rem 0.75rem',
              background: isDirectMode ? '#238636' : '#21262d',
              color: isDirectMode ? '#ffffff' : '#8b949e',
              border: '1px solid ' + (isDirectMode ? '#3fb950' : '#30363d'),
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'monospace',
              boxShadow: isDirectMode ? '0 2px 8px rgba(35,134,54,0.4)' : 'none'
            },
            onclick: function() {
              if (typeof LunoSettings !== 'undefined' && LunoSettings.setPatchApplyMode) {
                LunoSettings.setPatchApplyMode('direct');
              } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem('luno_patch_apply_mode', 'direct');
              }
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast('Patch Workflow set to Auto-Apply to Files!', 'success', '⚡');
              }
              LunoCheckpointView.mountUI(container);
            }
          }, '⚡ Auto-Apply to Files ' + (isDirectMode ? '✓' : '')),

          m('button', {
            id: 'btn-mode-patchlog',
            style: {
              flex: '1 1 140px',
              padding: '0.55rem 0.75rem',
              background: !isDirectMode ? '#8257e5' : '#21262d',
              color: !isDirectMode ? '#ffffff' : '#8b949e',
              border: '1px solid ' + (!isDirectMode ? '#d2a8ff' : '#30363d'),
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'monospace',
              boxShadow: !isDirectMode ? '0 2px 8px rgba(130,87,229,0.4)' : 'none'
            },
            onclick: function() {
              if (typeof LunoSettings !== 'undefined' && LunoSettings.setPatchApplyMode) {
                LunoSettings.setPatchApplyMode('patchlog');
              } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem('luno_patch_apply_mode', 'patchlog');
              }
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast('Patch Workflow set to Journal in Patch Log!', 'info', '🧩');
              }
              LunoCheckpointView.mountUI(container);
            }
          }, '🧩 Journal to Patch Log ' + (!isDirectMode ? '✓' : ''))
        )
      );

      var consolidationCard = m('div', {
        style: {
          background: '#0d1117',
          border: '2px solid ' + (pendingPatchesCount > 0 ? '#8257e5' : '#30363d'),
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          boxShadow: pendingPatchesCount > 0 ? '0 4px 16px rgba(130,87,229,0.25)' : 'none'
        }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
          m('strong', { style: { color: pendingPatchesCount > 0 ? '#d2a8ff' : '#8b949e', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' } }, 'STEP 1: 🧩 CONSOLIDATE PATCHES'),
          m('span', {
            style: {
              fontSize: '0.72rem',
              fontWeight: 'bold',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              background: pendingPatchesCount > 0 ? '#271052' : '#161b22',
              color: pendingPatchesCount > 0 ? '#d2a8ff' : '#8b949e',
              border: '1px solid ' + (pendingPatchesCount > 0 ? '#8257e5' : '#30363d')
            }
          }, pendingPatchesCount + ' pending patch(es)')
        ),
        m('p', { style: { color: '#8b949e', margin: 0, fontSize: '0.78rem', lineHeight: '1.4' } },
          isDirectMode
            ? 'In Auto-Apply mode, patches are merged immediately into files on save. Pending patch count remains 0 unless switched to Patch Log journaling above.'
            : 'Merges pending method patches from LunoPatchLog.html into base class files and resets the patch log.'
        ),
        m('button', {
          id: 'btn-consolidate-patches',
          style: {
            padding: '0.75rem',
            background: pendingPatchesCount > 0 ? '#8257e5' : '#21262d',
            color: pendingPatchesCount > 0 ? '#ffffff' : '#8b949e',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: pendingPatchesCount > 0 ? 'pointer' : 'default',
            fontFamily: 'monospace',
            boxShadow: pendingPatchesCount > 0 ? '0 4px 12px rgba(130,87,229,0.3)' : 'none'
          },
          onclick: async function() {
            if (pendingPatchesCount === 0) {
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast(isDirectMode ? 'Auto-Apply mode is active; files are already consolidated.' : 'No pending patches to consolidate.', 'info', 'ℹ️');
              }
              return;
            }

            try {
              var data = await LunoPatchConsolidator.consolidate(targetProj);
              if (data && data.success) {
                LunoCheckpointView.lastConsolidationOutput = '✅ Consolidated ' + (data.consolidatedCount || 0) + ' patch(es) for [' + targetProj + ']!\nModified Files:\n- ' + (data.modifiedFiles || []).join('\n- ');
                LunoCheckpointView.mountUI(container);
              }
            } catch(e) {
              alert('Consolidation Error: ' + e.message);
            }
          }
        }, '🧩 Consolidate Pending Patches (' + pendingPatchesCount + ')'),

        LunoCheckpointView.lastConsolidationOutput ? m('pre', {
          style: { background: '#070a13', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.55rem', color: '#7ee787', fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 },
          textContent: LunoCheckpointView.lastConsolidationOutput
        }) : null
      );

      var chkDeployPages = m('input', {
        id: 'checkpoint-chk-deploy-pages',
        type: 'checkbox',
        checked: true,
        style: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#238636' }
      });

      var noteInput = m('input', {
        id: 'checkpoint-note-input',
        type: 'text',
        value: pendingNote,
        placeholder: 'e.g. [' + targetProj + '] Checkpoint and feature updates',
        style: { width: '100%', padding: '0.65rem', background: '#0d1117', color: '#00f2fe', border: '1px solid #30363d', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }
      });

      var btnCheckpointAction = m('button', {
        style: {
          padding: '0.85rem',
          background: '#238636',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          cursor: 'pointer',
          fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(35,134,54,0.3)',
          transition: 'all 0.15s ease'
        },
        onclick: async function() {
          btnCheckpointAction.disabled = true;
          var isDeploy = chkDeployPages.checked;
          btnCheckpointAction.textContent = isDeploy ? '🚀 Deploying to Pages...' : '📸 Saving Snapshot...';

          var note = noteInput.value.trim();
          var desc = note || ('[' + targetProj + '] Checkpoint ' + new Date().toLocaleString());

          var outputCard = document.getElementById('checkpoint-output-card');
          var outputPre = document.getElementById('checkpoint-output-text');
          if (outputCard) outputCard.style.display = 'block';
          if (outputPre) {
            outputPre.style.color = '#00f2fe';
            outputPre.textContent = '⚡ Recording Checkpoint for [' + targetProj + ']...';
          }

          try {
            var res = await LunoDeployEngine.checkpointTargetProject(targetProj, desc, { deployToPages: isDeploy });
            if (res && res.success) {
              var rawText = res.output || (isDeploy ? 'Deployment complete!' : 'Local snapshot recorded.');
              LunoCheckpointView.lastGitOutput = rawText;
              if (outputPre) {
                outputPre.style.color = '#7ee787';
                outputPre.textContent = rawText;
              }
              if (typeof ClientApp !== 'undefined') {
                ClientApp.showToast(isDeploy ? 'Deployed [' + targetProj + '] to GitHub Pages!' : 'Snapshot recorded for [' + targetProj + ']!', 'success', '📸');
                ClientApp.uncommittedCount = 0;
                await ClientApp.fetchCodebaseMetrics(targetProj);
              }
              noteInput.value = '';
            } else {
              var errText = (res && res.error) || 'Failed to record checkpoint';
              if (outputPre) {
                outputPre.style.color = '#ff7b72';
                outputPre.textContent = '❌ Error:\n' + errText;
              }
            }
          } catch(err) {
            if (outputPre) {
              outputPre.style.color = '#ff7b72';
              outputPre.textContent = '❌ Exception: ' + err.message;
            }
          } finally {
            btnCheckpointAction.disabled = false;
            btnCheckpointAction.textContent = isDeploy ? '🚀 1-Tap Checkpoint & Deploy to Pages' : '📸 Save Local Snapshot Only';
          }
        }
      }, '🚀 1-Tap Checkpoint & Deploy to Pages');

      chkDeployPages.onchange = function() {
        if (chkDeployPages.checked) {
          btnCheckpointAction.textContent = '🚀 1-Tap Checkpoint & Deploy to Pages';
          btnCheckpointAction.style.background = '#238636';
          btnCheckpointAction.style.boxShadow = '0 4px 12px rgba(35,134,54,0.3)';
        } else {
          btnCheckpointAction.textContent = '📸 Save Local Snapshot Only';
          btnCheckpointAction.style.background = '#21262d';
          btnCheckpointAction.style.boxShadow = 'none';
        }
      };

      var card = m('div', {
        style: {
          background: '#161b22',
          border: '2px solid #30363d',
          borderRadius: '12px',
          padding: '1.25rem',
          maxWidth: '680px',
          margin: '1rem auto',
          color: '#c9d1d9',
          fontFamily: 'monospace',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' } },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
            m('h2', { style: { color: '#f0f6fc', fontSize: '1.2rem', margin: 0 } }, '📸 Checkpoint Manager'),
            projectSelect
          ),
          m('button', {
            style: { padding: '0.3rem 0.65rem', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' },
            onclick: function() {
              if (typeof localStorage !== 'undefined') localStorage.setItem('luno_active_dock_view', 'workspace');
              if (typeof LunoSpaDock !== 'undefined') LunoSpaDock.mountView('workspace');
            }
          }, '🏠 Workspace')
        ),

        patchModeCard,
        consolidationCard,

        m('div', { style: { background: '#0d1117', border: '1px solid #238636', padding: '0.85rem', borderRadius: '8px', fontSize: '0.82rem' } },
          m('strong', { style: { color: '#3fb950', display: 'block', marginBottom: '0.35rem' } }, '📊 Uncommitted Modifications: ' + uncommittedCount + ' file(s)'),
          m('p', { style: { color: '#8b949e', margin: 0, lineHeight: '1.4' } },
            isStatic
              ? 'Running in Browser Storage mode. You can record a local snapshot in IndexedDB, or 1-tap deploy directly to GitHub Pages via Git Data API.'
              : 'Creates a clean Git snapshot for [' + targetProj + '] and pushes to GitHub Pages.'
          )
        ),

        m('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.4rem' } },
          m('label', { style: { fontSize: '0.78rem', color: '#8b949e', fontWeight: 'bold' } }, 'STEP 2: 📸 Commit Note:'),
          noteInput
        ),

        m('label', {
          style: { display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#c9d1d9', cursor: 'pointer', userSelect: 'none' }
        },
          chkDeployPages,
          m('span', {}, '🚀 Deploy to GitHub Pages (push remote & publish live site)')
        ),

        btnCheckpointAction,

        m('div', {
          id: 'checkpoint-output-card',
          style: {
            background: '#0d1117',
            border: '1px solid #00f2fe',
            borderRadius: '8px',
            padding: '0.85rem',
            display: LunoCheckpointView.lastGitOutput ? 'block' : 'none'
          }
        },
          m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', borderBottom: '1px solid #30363d', paddingBottom: '0.3rem' } },
            m('span', { style: { fontWeight: 'bold', color: '#00f2fe', fontSize: '0.78rem' } }, '⚡ Execution Output:'),
            m('button', {
              style: { padding: '0.3rem 0.65rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' },
              onclick: function() {
                var text = LunoCheckpointView.lastGitOutput || (document.getElementById('checkpoint-output-text') ? document.getElementById('checkpoint-output-text').textContent : '');
                if (text && typeof OutboxQueue !== 'undefined') {
                  OutboxQueue.addBundle('Git Checkpoint Output', text, { priority: 'high' });
                  if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                    ClientApp.showToast('Sent Checkpoint Response to Outbox!', 'success', '📤');
                  }
                }
              }
            }, '📤 Send Output to Outbox')
          ),
          m('pre', {
            id: 'checkpoint-output-text',
            style: { background: '#070a13', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.65rem', color: '#7ee787', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto', margin: 0 },
            textContent: LunoCheckpointView.lastGitOutput || ''
          })
        )
      );

      container.appendChild(card);
  }
}

globalThis.LunoCheckpointView = LunoCheckpointView;
if (typeof module !== "undefined" && module.exports) module.exports = LunoCheckpointView;