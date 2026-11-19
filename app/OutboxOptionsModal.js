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
        if (attrs && typeof attrs === 'object') {
          Object.keys(attrs).forEach(function(k) {
            if (k === 'style' && typeof attrs[k] === 'object') Object.assign(el.style, attrs[k]);
            else if (k.startsWith('on') && typeof attrs[k] === 'function') el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
            else el[k] = attrs[k];
          });
        }
        children.forEach(function(c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
      };

      var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      var isNotLibrary = (currentTarget.toLowerCase() !== 'library');
      var includeInstructions = true;
      var libMode = isNotLibrary ? 'manifest' : 'none'; // 'manifest' | 'none' | 'all'
      var skipLegacyDuplicates = true;
      var selectedVisibilitySet = null;
      var loadedFilesMap = null;
      var loadedAllLibMap = null;

      if (originElement && typeof LunoAnimationEngine !== 'undefined') {
        var rect = originElement.getBoundingClientRect();
        LunoAnimationEngine.burstSparks(rect.left + (rect.width / 2), rect.top + (rect.height / 2), '#8257e5', 10);
      }

      var availableSets = {};
      var setDescriptions = {};
      try {
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchFsRead) {
          var metaRes = await LunoApiClient.fetchFsRead('luno.json', currentTarget);
          if (metaRes && metaRes.success && metaRes.content) {
            var metaObj = JSON.parse(metaRes.content);
            if (metaObj.visibilitySetDescriptions && typeof metaObj.visibilitySetDescriptions === 'object') {
              Object.assign(setDescriptions, metaObj.visibilitySetDescriptions);
            }
            if (metaObj.visibilitySets && typeof metaObj.visibilitySets === 'object') {
              Object.keys(metaObj.visibilitySets).forEach(function(k) {
                var raw = metaObj.visibilitySets[k];
                if (Array.isArray(raw)) {
                  availableSets[k] = raw;
                } else if (raw && Array.isArray(raw.files)) {
                  availableSets[k] = raw.files;
                  if (raw.description) setDescriptions[k] = raw.description;
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn('[OutboxOptionsModal] Could not read luno.json visibilitySets:', e);
      }

      var setKeys = Object.keys(availableSets);
      var fmtTokens = function(t) {
        return t >= 1000 ? ('~' + (Math.round(t / 100) / 10) + 'k tkn') : ('~' + t + ' tkn');
      };

      var estimateKeys = function(keyFilterFn, mapObj) {
        var fm = mapObj || loadedFilesMap;
        if (!fm) return null;
        var files = 0;
        var chars = 0;
        Object.keys(fm).forEach(function(fp) {
          if (keyFilterFn(fp)) {
            files++;
            chars += String(fm[fp] || '').length;
          }
        });
        return { files: files, tokens: Math.round(chars / 4) };
      };

      var isLibPath = function(fp) {
        var clean = fp.replace(/\\/g, '/').replace(/^\/+/, '');
        return clean.startsWith('Library/') || clean.toLowerCase().includes('/library/');
      };

      var matchesSetPath = function(cleanPath, allowedList) {
        return allowedList.some(function(p) {
          var cp = String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
          return cleanPath === cp || cleanPath.endsWith('/' + cp) || cp.endsWith('/' + cleanPath);
        });
      };

      var isLegacyDup = function(cleanPath) {
        var low = cleanPath.toLowerCase();
        return low.includes('/content/') || low.includes('/src/') || low.includes('/recovered_content/') || (low.includes('/state/') && low.includes('recon'));
      };

      var totalBanner = m('div', {
        style: {
          background: '#070a13', border: '1px solid #232d3f', borderRadius: '8px',
          padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: '0.75rem', gap: '8px', flexWrap: 'wrap'
        }
      });

      var setsContainer = m('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '2px' }
      });

      var execBtn = m('button', {
        id: 'btn-exec-bundle-modal',
        style: {
          padding: '0.8rem', background: '#8257e5', color: '#ffffff',
          border: 'none', borderRadius: '8px', fontWeight: 'bold',
          fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(130,87,229,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
        }
      }, '📦 Bundle Project [' + currentTarget + '] ➔');

      var libPillsWrap = m('div', { style: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' } });
      var libPillBtns = {};

      var renderSetsAndTotals = function() {
        setsContainer.innerHTML = '';

        var fullStats = estimateKeys(function(fp) {
          var clean = fp.replace(/\\/g, '/').replace(/^\/+/, '');
          if (isLibPath(clean)) return false;
          if (skipLegacyDuplicates && isLegacyDup(clean)) return false;
          return true;
        });

        var makeChoiceCard = function(setKey, title, desc, fileList, stats) {
          var isSel = selectedVisibilitySet === setKey;
          var isHuge = stats && stats.tokens > 120000;
          var badgeText = stats ? (stats.files + ' files • ' + fmtTokens(stats.tokens)) : ((fileList ? fileList.length + ' files' : 'All files') + ' • calculating...');
          var badgeColor = isHuge ? '#fbbf24' : '#3fb950';

          var cardRow = m('div', {
            style: {
              background: isSel ? 'rgba(0, 242, 254, 0.1)' : '#0d1117',
              border: '1.5px solid ' + (isSel ? '#00f2fe' : '#263042'),
              borderRadius: '8px', padding: '0.55rem 0.7rem', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: '0.28rem', transition: 'all 0.14s ease'
            },
            onclick: function() {
              selectedVisibilitySet = setKey;
              renderSetsAndTotals();
            }
          },
            m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
              m('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                m('span', { style: { color: isSel ? '#00f2fe' : '#64748b', fontWeight: 'bold' } }, isSel ? '◉' : '○'),
                m('strong', { style: { color: isSel ? '#00f2fe' : '#f0f6fc', fontSize: '0.8rem' } }, title)
              ),
              m('span', {
                style: {
                  fontSize: '0.68rem', color: badgeColor, background: '#070a13',
                  border: '1px solid ' + badgeColor + '55', padding: '1px 7px', borderRadius: '10px', fontWeight: 'bold'
                }
              }, (isHuge ? '⚠️ ' : '') + badgeText)
            ),
            desc ? m('div', { style: { fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '18px', lineHeight: '1.35' } }, desc) : null
          );

          if (fileList && fileList.length > 0) {
            var previewDet = m('details', {
              style: { paddingLeft: '18px', marginTop: '2px' },
              onclick: function(e) { e.stopPropagation(); }
            },
              m('summary', { style: { fontSize: '0.67rem', color: '#38bdf8', cursor: 'pointer', userSelect: 'none' } }, 'Preview included files (' + fileList.length + ')'),
              m('div', { style: { fontSize: '0.65rem', color: '#8b949e', marginTop: '3px', lineHeight: '1.4' } }, fileList.join(', '))
            );
            cardRow.appendChild(previewDet);
          }

          return cardRow;
        };

        setsContainer.appendChild(
          makeChoiceCard(null, '🌐 Full Project (All Source Files)', 'All clean text/code files in [' + currentTarget + '] (binary assets excluded automatically).', null, fullStats)
        );

        setKeys.forEach(function(k) {
          var allowed = availableSets[k] || [];
          var stats = estimateKeys(function(fp) {
            var clean = fp.replace(/\\/g, '/').replace(/^\/+/, '');
            return !isLibPath(clean) && matchesSetPath(clean, allowed);
          });
          var desc = setDescriptions[k] || ('Curated slice focusing on [' + k + ']');
          setsContainer.appendChild(makeChoiceCard(k, '🎯 ' + k, desc, allowed, stats));
        });

        var projStats = selectedVisibilitySet
          ? estimateKeys(function(fp) {
              var clean = fp.replace(/\\/g, '/').replace(/^\/+/, '');
              return !isLibPath(clean) && matchesSetPath(clean, availableSets[selectedVisibilitySet] || []);
            })
          : fullStats;

        var libStats = { files: 0, tokens: 0 };
        if (isNotLibrary && libMode !== 'none') {
          var libSrc = (libMode === 'all' && loadedAllLibMap) ? loadedAllLibMap : loadedFilesMap;
          var ls = estimateKeys(function(fp) { return isLibPath(fp); }, libSrc);
          if (ls) libStats = ls;
        }

        var instTokens = includeInstructions ? 1600 : 0;
        var totalTokens = (projStats ? projStats.tokens : 0) + libStats.tokens + instTokens;
        var totalFiles = (projStats ? projStats.files : 0) + libStats.files;

        totalBanner.innerHTML = '';
        var isVeryLarge = totalTokens > 150000;
        totalBanner.appendChild(
          m('span', { style: { color: isVeryLarge ? '#fbbf24' : '#3fb950', fontWeight: 'bold' } },
            (projStats ? (totalFiles + ' files • ' + fmtTokens(totalTokens) + (isVeryLarge && setKeys.length > 0 && !selectedVisibilitySet ? ' — Tip: pick a Visibility Set below!' : '')) : '⏳ Scanning file sizes...')
          )
        );

        execBtn.textContent = projStats
          ? ('📦 Bundle [' + currentTarget + (selectedVisibilitySet ? ' : ' + selectedVisibilitySet : ' : Full') + '] (' + fmtTokens(totalTokens) + ') ➔')
          : ('📦 Bundle Project [' + currentTarget + '] ➔');

        Object.keys(libPillBtns).forEach(function(k) {
          var b = libPillBtns[k];
          var active = libMode === k;
          b.style.background = active ? '#082f49' : '#0d1117';
          b.style.borderColor = active ? '#00f2fe' : '#30363d';
          b.style.color = active ? '#00f2fe' : '#94a3b8';
        });
      };

      if (isNotLibrary) {
        [
          { id: 'manifest', label: '📚 Project Library' },
          { id: 'none', label: '🚫 Skip Library (0 tkn)' },
          { id: 'all', label: '🌐 All Library' }
        ].forEach(function(opt) {
          var b = m('button', {
            style: {
              flex: '1', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #30363d',
              background: '#0d1117', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold',
              fontFamily: 'monospace', cursor: 'pointer'
            },
            onclick: async function() {
              libMode = opt.id;
              if (opt.id === 'all' && !loadedAllLibMap && typeof LunoApiClient !== 'undefined') {
                loadedAllLibMap = (await LunoApiClient.fetchAllCode(currentTarget, { includeProjectLibrary: true, includeAllLibrary: true }))?.filesMap || null;
              }
              renderSetsAndTotals();
            }
          }, opt.label);
          libPillBtns[opt.id] = b;
          libPillsWrap.appendChild(b);
        });
      }

      var chkInstructions = m('input', {
        type: 'checkbox', checked: true,
        style: { width: '15px', height: '15px', cursor: 'pointer', accentColor: '#00f2fe' },
        onchange: function(e) { includeInstructions = e.target.checked; renderSetsAndTotals(); }
      });

      var chkSkipDup = m('input', {
        type: 'checkbox', checked: true,
        style: { width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3fb950' },
        onchange: function(e) { skipLegacyDuplicates = e.target.checked; renderSetsAndTotals(); }
      });

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
          padding: '1.15rem', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.7rem', boxShadow: '0 12px 32px rgba(130,87,229,0.3)',
          transform: 'scale(0.92)', opacity: '0', transition: 'transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out'
        }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d', paddingBottom: '0.5rem' } },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.45rem' } },
            m('strong', { style: { color: '#d2a8ff', fontSize: '1.05rem' } }, '📦 Smart Outbox Bundler'),
            m('span', { style: { fontSize: '0.72rem', color: '#3fb950', background: '#0d2818', border: '1px solid #238636', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 'bold' } }, 'Target: ' + currentTarget)
          ),
          m('button', { style: { background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }, onclick: function() { modal.remove(); } }, '✖')
        ),

        totalBanner,
        setsContainer,
        isNotLibrary ? m('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.3rem' } },
          m('span', { style: { fontSize: '0.7rem', color: '#8b949e', fontWeight: 'bold' } }, 'Shared Library Dependencies:'),
          libPillsWrap
        ) : null,

        m('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.4rem' } },
          m('label', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#cbd5e1', cursor: 'pointer' } },
            chkInstructions,
            'Prepend Modular Protocol Instructions (~1.6k tkn)'
          ),
          m('label', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#cbd5e1', cursor: 'pointer' } },
            chkSkipDup,
            'Skip legacy/duplicate folders in Full mode (content/*.html, src/, recon dumps)'
          )
        ),

        execBtn,

        m('button', {
          style: { padding: '0.5rem', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem' },
          onclick: function() { modal.remove(); }
        }, 'Cancel')
      );

      execBtn.onclick = async function() {
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

        var allowedFilePaths = (selectedVisibilitySet && availableSets[selectedVisibilitySet])
          ? availableSets[selectedVisibilitySet]
          : null;

        if (typeof OutboxQueue !== 'undefined' && OutboxQueue.executeSmartBundle) {
          await OutboxQueue.executeSmartBundle({
            includeInstructions: includeInstructions,
            skipLibrary: libMode === 'none',
            includeProjectLibrary: libMode !== 'none',
            includeAllLibrary: libMode === 'all',
            skipLegacyDuplicates: skipLegacyDuplicates,
            visibilitySetName: selectedVisibilitySet,
            allowedFilePaths: allowedFilePaths,
            preloadedCodeData: (libMode === 'all' && loadedAllLibMap)
              ? { filesMap: loadedAllLibMap }
              : (libMode !== 'all' && loadedFilesMap ? { filesMap: loadedFilesMap } : null)
          });
        }
      };

      modal.appendChild(card);
      document.body.appendChild(modal);
      renderSetsAndTotals();

      requestAnimationFrame(function() {
        card.style.transform = 'scale(1)';
        card.style.opacity = '1';
      });

      if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchAllCode) {
        try {
          var res = await LunoApiClient.fetchAllCode(currentTarget, { includeProjectLibrary: true, includeAllLibrary: false });
          if (res && res.filesMap && modal.isConnected) {
            loadedFilesMap = res.filesMap;
            renderSetsAndTotals();
          }
        } catch (e) {}
      }
    }
}

if (typeof OutboxQueue !== 'undefined') {
  OutboxQueue.promptBundleOptionsModal = OutboxOptionsModal.promptBundleOptionsModal;
}

globalThis.OutboxOptionsModal = OutboxOptionsModal;
if (typeof module !== "undefined" && module.exports) module.exports = OutboxOptionsModal;