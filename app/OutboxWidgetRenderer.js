class OutboxWidgetRenderer {
  constructor() {}

  static renderQueueItemRow(item) {
    if (!item || typeof item !== 'object') return null;
    var isHigh = item.priority === 'high';
    var targetQueue = typeof OutboxQueue !== 'undefined' ? OutboxQueue : null;
    var isExpanded = targetQueue && targetQueue.activeExpandedId === item.id;
    var rawPayload = String(item.payload || '');

    var itemWrapper = document.createElement('div');
    itemWrapper.style.cssText = 'display:flex; flex-direction:column; border-radius:6px; background:' + (isHigh ? '#2a0826' : '#0d1117') + '; border:1px solid ' + (isExpanded ? '#00f2fe' : (isHigh ? '#ff007f' : '#21262d')) + '; overflow:hidden;';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0.65rem; font-size:0.75rem; font-family:monospace; cursor:pointer;';
    row.onclick = function() {
      if (targetQueue) {
        targetQueue.activeExpandedId = isExpanded ? null : item.id;
        if (typeof targetQueue.renderWidget === 'function') {
          targetQueue.renderWidget();
        }
      }
    };

    var containerMatches = (rawPayload.match(/<(script|style|template|svg)\b/gi) || []).length;

    var info = document.createElement('div');
    info.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:0.5rem;';
    info.innerHTML = '<div style="font-weight:bold; color:' + (isHigh ? '#ff66cc' : '#a371f7') + ';">' + (isExpanded ? '▼ ' : '▶ ') + (item.title || 'Outbox Item') + ' <span style="color:#8b949e; font-weight:normal; font-size:0.7rem;">(' + (item.timestamp || '') + ')</span></div>' +
      '<div style="color:#7ee787; font-size:0.7rem;">Summary: ' + (containerMatches || 1) + ' section(s) / ~' + (item.lines || 1) + ' lines (~' + (item.estTokens || 500) + ' tokens)</div>';

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:0.3rem; align-items:center;';

    var btnEdit = document.createElement('button');
    btnEdit.style.cssText = 'background:none; border:none; cursor:pointer; font-size:0.85rem; color:#d2a8ff; padding:0 0.2rem;';
    btnEdit.textContent = '✏️';
    btnEdit.title = 'Edit Outbox Item';
    btnEdit.onclick = function(e) {
      e.stopPropagation();
      if (typeof OutboxPromptBox !== 'undefined') {
        OutboxPromptBox.promptWriteNoteModal(rawPayload, item.id);
      } else if (targetQueue && targetQueue.promptWriteNoteModal) {
        targetQueue.promptWriteNoteModal(rawPayload, item.id);
      }
    };

    var btnPin = document.createElement('button');
    btnPin.style.cssText = 'background:none; border:none; cursor:pointer; font-size:0.85rem; color:' + (isHigh ? '#ff66cc' : '#8b949e') + '; padding:0 0.2rem;';
    btnPin.textContent = isHigh ? '★' : '☆';
    btnPin.title = 'Toggle High Priority Pin';
    btnPin.onclick = function(e) {
      e.stopPropagation();
      if (targetQueue && targetQueue.togglePriority) targetQueue.togglePriority(item.id);
    };

    var btnDel = document.createElement('button');
    btnDel.style.cssText = 'background:none; border:none; cursor:pointer; font-size:0.85rem; color:#f85149; padding:0 0.2rem;';
    btnDel.textContent = '✖';
    btnDel.title = 'Remove item';
    btnDel.onclick = function(e) {
      e.stopPropagation();
      if (targetQueue && targetQueue.removeItem) targetQueue.removeItem(item.id);
    };

    actions.appendChild(btnEdit);
    actions.appendChild(btnPin);
    actions.appendChild(btnDel);
    row.appendChild(info);
    row.appendChild(actions);

    itemWrapper.appendChild(row);

    if (isExpanded) {
      var detailsPanel = document.createElement('div');
      detailsPanel.style.cssText = 'padding:0.6rem; background:#070a13; border-top:1px solid #30363d; display:flex; flex-direction:column; gap:0.4rem;';

      var previewText = document.createElement('pre');
      previewText.style.cssText = 'background:#0d1117; border:1px solid #21262d; border-radius:4px; padding:0.5rem; color:#7ee787; font-size:0.72rem; font-family:monospace; max-height:160px; overflow-y:auto; white-space:pre-wrap; word-break:break-all; margin:0;';
      previewText.textContent = rawPayload.trim();

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex; justify-content:flex-end; gap:0.35rem;';

      var btnEditSingle = document.createElement('button');
      btnEditSingle.style.cssText = 'padding:0.25rem 0.6rem; background:#21262d; color:#00f2fe; border:1px solid #00f2fe; border-radius:4px; font-size:0.7rem; font-weight:bold; cursor:pointer; font-family:monospace;';
      btnEditSingle.textContent = '✏️ Edit Item';
      btnEditSingle.onclick = function(e) {
        e.stopPropagation();
        if (typeof OutboxPromptBox !== 'undefined') {
          OutboxPromptBox.promptWriteNoteModal(rawPayload, item.id);
        } else if (targetQueue && targetQueue.promptWriteNoteModal) {
          targetQueue.promptWriteNoteModal(rawPayload, item.id);
        }
      };

      var btnCopySingle = document.createElement('button');
      btnCopySingle.style.cssText = 'padding:0.25rem 0.6rem; background:#271052; color:#d2a8ff; border:1px solid #8257e5; border-radius:4px; font-size:0.7rem; font-weight:bold; cursor:pointer; font-family:monospace;';
      btnCopySingle.textContent = 'Copy Single Item';
      btnCopySingle.onclick = function(e) {
        e.stopPropagation();
        if (targetQueue && targetQueue.copyPackageToClipboard) {
          targetQueue.copyPackageToClipboard(item.id);
        }
      };

      btnRow.appendChild(btnEditSingle);
      btnRow.appendChild(btnCopySingle);
      detailsPanel.appendChild(previewText);
      detailsPanel.appendChild(btnRow);
      itemWrapper.appendChild(detailsPanel);
    }

    return itemWrapper;
  }

  static renderWidget(containerId, retryCount) {
      var retries = retryCount || 0;
      var targetId = containerId || 'outbox-queue-container';
      var container = document.getElementById(targetId);

      if (!container) {
        if (retries < 10) {
          setTimeout(function() { OutboxWidgetRenderer.renderWidget(containerId, retries + 1); }, 100);
        }
        return;
      }

      try {
        container.innerHTML = '';
        var targetQueue = typeof OutboxQueue !== 'undefined' ? OutboxQueue : null;
        var queue = (targetQueue && targetQueue.queue) || [];
        var itemCount = queue.length;

        var actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex; gap:0.4rem; margin-bottom:0.6rem; flex-wrap:wrap; width:100%;';

        var bundleBtn = document.createElement('button');
        bundleBtn.id = 'btn-bundle-code';
        bundleBtn.style.cssText = 'flex:1; min-width:110px; padding:0.65rem; background:var(--accent-secondary, #8257e5); color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:0.85rem; cursor:pointer; font-family:monospace; box-shadow:0 4px 12px rgba(130, 87, 229, 0.3);';
        bundleBtn.textContent = '📦 Bundle Code';
        bundleBtn.onclick = function(e) {
          if (typeof OutboxOptionsModal !== 'undefined') {
            OutboxOptionsModal.promptBundleOptionsModal(e.currentTarget || bundleBtn);
          } else if (targetQueue && targetQueue.promptBundleOptionsModal) {
            targetQueue.promptBundleOptionsModal(e.currentTarget || bundleBtn);
          } else if (typeof ClientApp !== 'undefined' && ClientApp.bundleAllCode) {
            ClientApp.bundleAllCode();
          }
        };

        var writePromptBtn = document.createElement('button');
        writePromptBtn.id = 'btn-write-prompt';
        writePromptBtn.style.cssText = 'flex:1; min-width:110px; padding:0.65rem; background:var(--bg-secondary, #271052); color:var(--accent-secondary, #d2a8ff); border:1px solid var(--accent-secondary, #8257e5); border-radius:8px; font-size:0.85rem; font-weight:bold; cursor:pointer; font-family:monospace; box-shadow:0 4px 12px rgba(130,87,229,0.25);';
        writePromptBtn.textContent = '✍️ Write Prompt';
        writePromptBtn.onclick = function(e) {
          if (typeof OutboxPromptBox !== 'undefined') {
            OutboxPromptBox.promptWriteNoteModal('', '', e.currentTarget || writePromptBtn);
          } else if (targetQueue && targetQueue.promptWriteNoteModal) {
            targetQueue.promptWriteNoteModal('', '', e.currentTarget || writePromptBtn);
          }
        };

        actionRow.appendChild(bundleBtn);
        actionRow.appendChild(writePromptBtn);

        var mainCopyBtn = document.createElement('button');
        mainCopyBtn.id = 'btn-main-copy-outbox';
        mainCopyBtn.style.cssText = 'width:100%; padding:0.75rem; font-weight:bold; border-radius:8px; font-size:0.9rem; cursor:pointer; font-family:monospace; margin-bottom:0.5rem; background:' + (itemCount > 0 ? 'var(--accent-secondary, #8257e5)' : 'var(--bg-secondary, #21262d)') + '; color:' + (itemCount > 0 ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (itemCount > 0 ? 'var(--accent-secondary, #8257e5)' : 'var(--border-color, #30363d)') + '; box-shadow:' + (itemCount > 0 ? '0 4px 12px rgba(130,87,229,0.35)' : 'none') + ';';
        mainCopyBtn.textContent = itemCount > 0 ? ('📋 Copy Outbox Package (' + itemCount + ' item' + (itemCount === 1 ? '' : 's') + ')') : '📋 Copy Outbox (Empty)';
        mainCopyBtn.onclick = function(e) {
          if (typeof LunoAnimationEngine !== 'undefined') {
            var outboxCard = document.querySelector('.outbox-card');
            var btnRect = (e.currentTarget || mainCopyBtn).getBoundingClientRect();
            LunoAnimationEngine.burstSparks(btnRect.left + (btnRect.width / 2), btnRect.top + (btnRect.height / 2), '#3fb950', 16);
            if (outboxCard) {
              LunoAnimationEngine.pulseTarget(outboxCard, { color: '#3fb950', glowColor: 'rgba(63, 185, 80, 0.7)' });
              if (typeof LunoAnimationEngine.wavePulse === 'function') {
                LunoAnimationEngine.wavePulse(outboxCard, '#3fb950');
              }
            }
          }
          if (targetQueue && targetQueue.copyPackageToClipboard) {
            targetQueue.copyPackageToClipboard();
          }
        };

        container.appendChild(actionRow);
        container.appendChild(mainCopyBtn);

        if (itemCount > 0) {
          var listContainer = document.createElement('div');
          listContainer.style.cssText = 'display:flex; flex-direction:column; gap:0.35rem; margin-top:0.5rem; width:100%;';
          queue.forEach(function(item) {
            if (item) {
              var row = OutboxWidgetRenderer.renderQueueItemRow(item);
              if (row) listContainer.appendChild(row);
            }
          });
          container.appendChild(listContainer);
        }
      } catch (err) {
        container.innerHTML = '<div style="color:#ff7b72; background:#220000; border:1px solid #ff3333; padding:10px; font-family:monospace; font-size:12px;">' +
          '<strong>Outbox Widget Exception:</strong><br>' + (err.stack || err.message || String(err)) +
          '</div>';
      }
    }
}

if (typeof OutboxQueue !== 'undefined') {
  OutboxQueue.renderWidget = OutboxWidgetRenderer.renderWidget;
  OutboxQueue.renderQueueItemRow = OutboxWidgetRenderer.renderQueueItemRow;
}

globalThis.OutboxWidgetRenderer = OutboxWidgetRenderer;
if (typeof module !== "undefined" && module.exports) module.exports = OutboxWidgetRenderer;