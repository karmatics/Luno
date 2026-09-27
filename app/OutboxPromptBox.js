class OutboxPromptBox {
  constructor() {}

  static setupFloatingPromptDrag(card, titleBar, isCompact, savedGeo) {
    var isDragging = false;
    var startX = 0, startY = 0, origLeft = 0, origTop = 0;

    var startDrag = function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.classList.contains('luno-resize-handle')) return;
      isDragging = true;
      titleBar.style.cursor = 'grabbing';
      var evt = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
      startX = evt.clientX;
      startY = evt.clientY;
      origLeft = card.offsetLeft;
      origTop = card.offsetTop;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };

    var doDrag = function(e) {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      var evt = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
      var dx = evt.clientX - startX;
      var dy = evt.clientY - startY;

      var minLeft = 30 - card.offsetWidth;
      var maxLeft = window.innerWidth - 30;
      var minTop = 0;
      var maxTop = window.innerHeight - 30;

      var newLeft = Math.max(minLeft, Math.min(maxLeft, origLeft + dx));
      var newTop = Math.max(minTop, Math.min(maxTop, origTop + dy));
      card.style.left = newLeft + 'px';
      card.style.top = newTop + 'px';
    };

    var stopDrag = function() {
      if (!isDragging) return;
      isDragging = false;
      titleBar.style.cursor = 'grab';
      var geo = {};
      try { geo = JSON.parse(localStorage.getItem('luno_prompt_box_geo') || '{}'); } catch(e){}
      geo.top = card.offsetTop;
      geo.left = card.offsetLeft;
      try { localStorage.setItem('luno_prompt_box_geo', JSON.stringify(geo)); } catch(e){}
    };

    titleBar.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);

    titleBar.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', doDrag);
    window.addEventListener('touchend', stopDrag);
  }

  static promptWriteNoteModal(initialText, editingItemId, originElement) {
      if (typeof document === 'undefined') return;

      // Ensure DOM helper primitives (makeElement, applyCss) are initialized
      if (typeof DomBasics !== 'undefined' && DomBasics.run) {
        DomBasics.run();
      }

      var existing = document.getElementById('luno-floating-prompt-box');
      var savedDraft = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_prompt_draft_text')) || '';
      var textToLoad = initialText || savedDraft;

      var originBtn = originElement || document.getElementById('btn-write-prompt') || document.querySelector('.outbox-card');
      var originRect = originBtn ? originBtn.getBoundingClientRect() : null;

      if (existing) {
        if (existing._dictateWidget && typeof existing._dictateWidget.destroy === 'function') {
          try { existing._dictateWidget.destroy(); } catch (e) {}
        }
        existing.remove();
        existing = null;
      }

      var savedGeo = { top: 80, left: Math.max(10, (window.innerWidth - 500) / 2), width: 500, height: 380 };
      try {
        var raw = localStorage.getItem('luno_prompt_box_geo');
        if (raw) savedGeo = Object.assign(savedGeo, JSON.parse(raw));
      } catch(e){}

      var boxH = Math.max(260, savedGeo.height || 380);
      var boxW = Math.max(340, savedGeo.width || 500);
      var boxT = savedGeo.top !== undefined ? savedGeo.top : 80;
      var boxL = savedGeo.left !== undefined ? savedGeo.left : Math.max(10, (window.innerWidth - boxW) / 2);

      var card = document.createElement('div');
      card.id = 'luno-floating-prompt-box';
      card.dataset.editingItemId = editingItemId || '';
      card.style.cssText = [
        'position: fixed;',
        'top: ' + boxT + 'px;',
        'left: ' + boxL + 'px;',
        'width: ' + boxW + 'px;',
        'height: ' + boxH + 'px;',
        'min-width: 320px;',
        'min-height: 240px;',
        'background: rgba(22, 27, 34, 0.98);',
        'color: #c9d1d9;',
        'border: 2px solid #8257e5;',
        'border-radius: 12px;',
        'z-index: 9900;',
        'box-shadow: 0 12px 36px rgba(130, 87, 229, 0.4);',
        'display: flex;',
        'flex-direction: column;',
        'font-family: monospace;',
        'box-sizing: border-box;',
        'overflow: hidden;',
        'backdrop-filter: blur(10px);',
        'transform-origin: center center;'
      ].join('\n');

      var titleBar = document.createElement('div');
      titleBar.id = 'floating-prompt-header';
      titleBar.style.cssText = 'background:linear-gradient(135deg, #271052 0%, #161b22 100%); color:#d2a8ff; padding:0.5rem 0.75rem; user-select:none; font-weight:bold; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:grab; border-radius:10px 10px 0 0; flex-shrink:0; gap:0.3rem; border-bottom:1px solid #8257e566;';

      titleBar.innerHTML = [
        '<div style="display:flex; align-items:center; gap:0.35rem;"><span style="font-size:0.9rem;">✍️</span><span>' + (editingItemId ? 'Edit Prompt Note' : 'Write Prompt') + '</span></div>',
        '<div style="display:flex; gap:0.3rem; align-items:center;">',
        '  <button id="btn-close-floating-prompt" style="background:#21262d; border:1px solid #da3633; color:#ff7b72; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.75rem; padding:0.15rem 0.45rem;">✖</button>',
        '</div>'
      ].join('\n');

      var body = document.createElement('div');
      body.id = 'floating-prompt-body';
      body.style.cssText = 'padding:0.6rem; display:flex; flex-direction:column; gap:0.5rem; flex:1; overflow:hidden; box-sizing:border-box; position:relative;';

      var DictationClass = typeof DictationWidget !== 'undefined'
        ? DictationWidget
        : (typeof globalThis !== 'undefined' ? globalThis.DictationWidget : (typeof window !== 'undefined' ? window.DictationWidget : null));

      var dictateWidget = null;
      var fallbackInput = null;

      if (DictationClass) {
        try {
          dictateWidget = new DictationClass();
          dictateWidget.init();

          // Style the widget host container to fit cleanly inside our modal
          if (dictateWidget.element) {
            dictateWidget.element.style.flex = '1';
            dictateWidget.element.style.minHeight = '140px';
            dictateWidget.element.style.borderRadius = '8px';
            dictateWidget.element.style.overflow = 'hidden';
            dictateWidget.element.style.border = '1px solid #8257e5';
          }

          // Hide redundant copy/send buttons inside the widget as our modal has its own Outbox button
          if (dictateWidget.copyButton) dictateWidget.copyButton.style.display = 'none';
          if (dictateWidget.magicSendBtn) dictateWidget.magicSendBtn.style.display = 'none';

          if (textToLoad && dictateWidget.editorContent) {
            dictateWidget.editorContent.textContent = textToLoad;
          }

          dictateWidget.subscribe(function(text) {
            try { localStorage.setItem('luno_prompt_draft_text', text); } catch(e){}
          });

          body.appendChild(dictateWidget.getElement());
          card._dictateWidget = dictateWidget;
        } catch (e) {
          console.warn('[OutboxPromptBox] Could not initialize DictationWidget, falling back to textarea:', e);
          dictateWidget = null;
        }
      }

      if (!dictateWidget) {
        fallbackInput = document.createElement('textarea');
        fallbackInput.id = 'floating-prompt-input';
        fallbackInput.placeholder = 'Type instructions or prompt note for LLM...';
        fallbackInput.value = textToLoad;
        fallbackInput.style.cssText = 'width:100%; flex:1; background:#0d1117; color:#7ee787; border:1px solid #8257e5; border-radius:8px; padding:0.55rem; font-family:monospace; font-size:0.82rem; outline:none; box-sizing:border-box; resize:none; font-weight:600; min-height:80px; box-shadow:inset 0 2px 6px rgba(0,0,0,0.5);';

        fallbackInput.oninput = function() {
          try { localStorage.setItem('luno_prompt_draft_text', fallbackInput.value); } catch(e){}
        };
        body.appendChild(fallbackInput);
      }

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex; gap:0.4rem; flex-shrink:0; align-items:center;';

      var btnAdd = document.createElement('button');
      btnAdd.id = 'btn-add-prompt-outbox';
      btnAdd.style.cssText = 'flex:2; padding:0.55rem; background:#8257e5; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.82rem; font-family:monospace; box-shadow:0 4px 14px rgba(130,87,229,0.4); display:flex; align-items:center; justify-content:center; gap:0.35rem;';
      btnAdd.innerHTML = '<span>📤</span><span>' + (editingItemId ? 'Save to Outbox' : 'Add to Outbox') + '</span>';

      btnAdd.onclick = function() {
        var val = '';
        if (dictateWidget) {
          val = (dictateWidget.getText ? dictateWidget.getText() : (dictateWidget.editorContent ? dictateWidget.editorContent.textContent : '')).trim();
        } else if (fallbackInput) {
          val = fallbackInput.value.trim();
        }

        var activeEditId = card.dataset.editingItemId;
        if (val) {
          var title = 'Prompt Note: ' + val.slice(0, 22);
          var payload = '\n' + val;
          var outboxCard = document.querySelector('.outbox-card');

          if (typeof LunoAnimationEngine !== 'undefined') {
            LunoAnimationEngine.flyElement(btnAdd, outboxCard, {
              label: '✍️ ' + val.slice(0, 16),
              color: '#d2a8ff',
              glowColor: 'rgba(130, 87, 229, 0.9)',
              icon: '✍️',
              duration: 650
            });

            LunoAnimationEngine.animateDialogOut(card, outboxCard ? outboxCard.getBoundingClientRect() : null, function() {
              if (activeEditId && typeof OutboxQueue !== 'undefined' && OutboxQueue.updateItem) {
                OutboxQueue.updateItem(activeEditId, title, payload);
              } else if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
                OutboxQueue.addBundle(title, payload);
              }
              if (dictateWidget) {
                dictateWidget.clearContent();
                dictateWidget.destroy();
              }
              card.dataset.editingItemId = '';
              try { localStorage.removeItem('luno_prompt_draft_text'); } catch(e){}
              card.remove();
            });
          }
        }
      };

      var btnHide = document.createElement('button');
      btnHide.style.cssText = 'flex:1; padding:0.55rem; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; cursor:pointer; font-size:0.75rem; font-family:monospace;';
      btnHide.textContent = 'Hide';
      btnHide.onclick = function() {
        if (dictateWidget) {
          dictateWidget.stopListening();
          dictateWidget.destroy();
        }
        if (typeof LunoAnimationEngine !== 'undefined') {
          LunoAnimationEngine.animateDialogOut(card, originRect, function() { card.remove(); });
        } else {
          card.remove();
        }
      };

      btnRow.appendChild(btnAdd);
      btnRow.appendChild(btnHide);

      body.appendChild(btnRow);
      card.appendChild(titleBar);
      card.appendChild(body);
      document.body.appendChild(card);

      document.getElementById('btn-close-floating-prompt').onclick = function() {
        if (dictateWidget) {
          dictateWidget.stopListening();
          dictateWidget.destroy();
        }
        if (typeof LunoAnimationEngine !== 'undefined') {
          LunoAnimationEngine.animateDialogOut(card, originRect, function() { card.remove(); });
        } else {
          card.remove();
        }
      };

      OutboxPromptBox.setupFloatingPromptDrag(card, titleBar, false, savedGeo);
      if (typeof LunoAnimationEngine !== 'undefined') {
        LunoAnimationEngine.animateDialogIn(card, originRect);
      }

      setTimeout(function() {
        if (dictateWidget && dictateWidget.editorContent) {
          dictateWidget.editorContent.focus();
        } else if (fallbackInput) {
          fallbackInput.focus();
        }
      }, 120);
    }
}

globalThis.OutboxPromptBox = OutboxPromptBox;
if (typeof module !== 'undefined' && module.exports) module.exports = OutboxPromptBox;