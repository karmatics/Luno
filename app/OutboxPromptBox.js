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
      var existing = document.getElementById('luno-floating-prompt-box');
      var savedDraft = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_prompt_draft_text')) || '';
      var textToLoad = initialText || savedDraft;

      var originBtn = originElement || document.getElementById('btn-write-prompt') || document.querySelector('.outbox-card');
      var originRect = originBtn ? originBtn.getBoundingClientRect() : null;

      if (existing) {
        existing.style.display = 'flex';
        var input = document.getElementById('floating-prompt-input');
        if (input && textToLoad) input.value = textToLoad;
        existing.dataset.editingItemId = editingItemId || '';
        var btnAdd = existing.querySelector('#btn-add-prompt-outbox');
        if (btnAdd) btnAdd.textContent = editingItemId ? 'Save Changes to Outbox' : 'Add to Outbox';

        if (typeof LunoAnimationEngine !== 'undefined') {
          LunoAnimationEngine.animateDialogIn(existing, originRect);
        }
        setTimeout(function() { if (input) input.focus(); }, 120);
        return;
      }

      var savedGeo = { top: 90, left: Math.max(10, (window.innerWidth - 350) / 2), width: 340, height: 280 };
      try {
        var raw = localStorage.getItem('luno_prompt_box_geo');
        if (raw) savedGeo = Object.assign(savedGeo, JSON.parse(raw));
      } catch(e){}

      var boxH = savedGeo.height || 280;
      var boxW = savedGeo.width || 340;
      var boxT = savedGeo.top !== undefined ? savedGeo.top : 90;
      var boxL = savedGeo.left !== undefined ? savedGeo.left : 20;

      var card = document.createElement('div');
      card.id = 'luno-floating-prompt-box';
      card.dataset.editingItemId = editingItemId || '';
      card.style.cssText = [
        'position: fixed;',
        'top: ' + boxT + 'px;',
        'left: ' + boxL + 'px;',
        'width: ' + boxW + 'px;',
        'height: ' + boxH + 'px;',
        'min-width: 240px;',
        'min-height: 110px;',
        'background: rgba(22, 27, 34, 0.96);',
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

      var input = document.createElement('textarea');
      input.id = 'floating-prompt-input';
      input.placeholder = 'Type instructions or prompt note for LLM...';
      input.value = textToLoad;
      input.style.cssText = 'width:100%; flex:1; background:#0d1117; color:#7ee787; border:1px solid #8257e5; border-radius:8px; padding:0.55rem; font-family:monospace; font-size:0.82rem; outline:none; box-sizing:border-box; resize:none; font-weight:600; min-height:40px; box-shadow:inset 0 2px 6px rgba(0,0,0,0.5);';

      input.oninput = function() {
        try { localStorage.setItem('luno_prompt_draft_text', input.value); } catch(e){}
      };

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex; gap:0.4rem; flex-shrink:0; align-items:center;';

      // Optional Dictation Mic Button (active when preference is enabled)
      var isDictation = (typeof LunoSettings !== 'undefined' && LunoSettings.dictationEnabled) ? LunoSettings.dictationEnabled() : false;
      var btnMic = null;

      if (isDictation && typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        btnMic = document.createElement('button');
        btnMic.id = 'btn-prompt-dictate';
        btnMic.style.cssText = 'padding:0.5rem 0.65rem; background:#161b22; color:#00f2fe; border:1px solid #00f2fe; border-radius:6px; cursor:pointer; font-size:0.85rem; font-family:monospace; font-weight:bold;';
        btnMic.innerHTML = '🎙️';
        btnMic.title = 'Start Voice Dictation (speech-to-text)';

        let recognition = null;
        let isRecording = false;

        btnMic.onclick = function() {
          if (!isRecording) {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = function() {
              isRecording = true;
              btnMic.style.background = '#2c080a';
              btnMic.style.borderColor = '#f85149';
              btnMic.style.color = '#ff7b72';
              btnMic.innerHTML = '🔴';
            };

            recognition.onresult = function(event) {
              let finalTranscript = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                  finalTranscript += event.results[i][0].transcript;
                }
              }
              if (finalTranscript) {
                const current = input.value;
                input.value = current + (current && !current.endsWith(' ') ? ' ' : '') + finalTranscript;
                input.dispatchEvent(new Event('input'));
              }
            };

            recognition.onerror = function() {
              isRecording = false;
              btnMic.style.background = '#161b22';
              btnMic.style.borderColor = '#00f2fe';
              btnMic.style.color = '#00f2fe';
              btnMic.innerHTML = '🎙️';
            };

            recognition.onend = function() {
              isRecording = false;
              btnMic.style.background = '#161b22';
              btnMic.style.borderColor = '#00f2fe';
              btnMic.style.color = '#00f2fe';
              btnMic.innerHTML = '🎙️';
            };

            recognition.start();
          } else if (recognition) {
            recognition.stop();
          }
        };
      }

      var btnAdd = document.createElement('button');
      btnAdd.id = 'btn-add-prompt-outbox';
      btnAdd.style.cssText = 'flex:2; padding:0.55rem; background:#8257e5; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.82rem; font-family:monospace; box-shadow:0 4px 14px rgba(130,87,229,0.4); display:flex; align-items:center; justify-content:center; gap:0.35rem;';
      btnAdd.innerHTML = '<span>📤</span><span>' + (editingItemId ? 'Save to Outbox' : 'Add to Outbox') + '</span>';

      btnAdd.onclick = function() {
        var val = input.value.trim();
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
              input.value = '';
              card.dataset.editingItemId = '';
              try { localStorage.removeItem('luno_prompt_draft_text'); } catch(e){}
            });
          }
        }
      };

      var btnHide = document.createElement('button');
      btnHide.style.cssText = 'flex:1; padding:0.55rem; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; cursor:pointer; font-size:0.75rem; font-family:monospace;';
      btnHide.textContent = 'Hide';
      btnHide.onclick = function() {
        if (typeof LunoAnimationEngine !== 'undefined') {
          LunoAnimationEngine.animateDialogOut(card, originRect, null);
        } else {
          card.style.display = 'none';
        }
      };

      if (btnMic) btnRow.appendChild(btnMic);
      btnRow.appendChild(btnAdd);
      btnRow.appendChild(btnHide);

      body.appendChild(input);
      body.appendChild(btnRow);
      card.appendChild(titleBar);
      card.appendChild(body);
      document.body.appendChild(card);

      document.getElementById('btn-close-floating-prompt').onclick = function() {
        if (typeof LunoAnimationEngine !== 'undefined') {
          LunoAnimationEngine.animateDialogOut(card, originRect, null);
        } else {
          card.style.display = 'none';
        }
      };

      OutboxPromptBox.setupFloatingPromptDrag(card, titleBar, false, savedGeo);
      if (typeof LunoAnimationEngine !== 'undefined') {
        LunoAnimationEngine.animateDialogIn(card, originRect);
      }
      setTimeout(function() { if (input) input.focus(); }, 120);
    }
}

globalThis.OutboxPromptBox = OutboxPromptBox;
if (typeof module !== 'undefined' && module.exports) module.exports = OutboxPromptBox;