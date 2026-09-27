class LunoThemeEngine {
  /**
   * ⚙️ CONSTRUCTOR: LunoThemeEngine()
   */
  constructor() {

  }

  static setupFloatingThemeDrag(box, header, savedGeo) {
      var isDragging = false;
      var startX = 0, startY = 0, origLeft = 0, origTop = 0;

      var startDrag = function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.classList.contains('luno-settings-resize-handle')) return;
        isDragging = true;
        header.style.cursor = 'grabbing';
        var evt = e.touches ? e.touches[0] : e;
        startX = evt.clientX;
        startY = evt.clientY;
        origLeft = box.offsetLeft;
        origTop = box.offsetTop;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      };

      var doDrag = function(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        var evt = e.touches ? e.touches[0] : e;
        var dx = evt.clientX - startX;
        var dy = evt.clientY - startY;

        var minLeft = 10;
        var maxLeft = window.innerWidth - 60;
        var minTop = 10;
        var maxTop = window.innerHeight - 60;

        var newLeft = Math.max(minLeft, Math.min(maxLeft, origLeft + dx));
        var newTop = Math.max(minTop, Math.min(maxTop, origTop + dy));
        box.style.left = newLeft + 'px';
        box.style.top = newTop + 'px';
      };

      var stopDrag = function() {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
        var geo = { top: box.offsetTop, left: box.offsetLeft, width: box.offsetWidth, height: box.offsetHeight };
        try { localStorage.setItem('luno_settings_box_geo', JSON.stringify(geo)); } catch(e){}
      };

      header.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', doDrag);
      window.addEventListener('mouseup', stopDrag);

      header.addEventListener('touchstart', startDrag, { passive: false });
      window.addEventListener('touchmove', doDrag, { passive: false });
      window.addEventListener('touchend', stopDrag);
    }
    static applyDynamicTheme(overrideState) {
        // Ensure DomBasics is active so applyCss is bound globally
        if (typeof DomBasics !== 'undefined' && typeof DomBasics.run === 'function') {
          DomBasics.run();
        }

        var isLight = false;
        var hue = 0;
        var sat = 100;
        var contrast = 100;
        var fontSize = 13;
        var glowLevel = 50;

        try {
          if (typeof localStorage !== 'undefined') {
            isLight = localStorage.getItem('luno_is_light_mode') === 'true';
            hue = parseInt(localStorage.getItem('luno_hue_rotate') || '0', 10);
            sat = parseInt(localStorage.getItem('luno_saturation') || '100', 10);
            contrast = parseInt(localStorage.getItem('luno_contrast') || '100', 10);
            fontSize = parseInt(localStorage.getItem('luno_font_size') || '13', 10);
            glowLevel = parseInt(localStorage.getItem('luno_glow_level') || '50', 10);
          }
        } catch(e) {}

        if (overrideState && typeof overrideState === 'object') {
          if (overrideState.isLightMode !== undefined) isLight = Boolean(overrideState.isLightMode);
          if (overrideState.hueRotate !== undefined) hue = parseInt(overrideState.hueRotate, 10);
          if (overrideState.saturation !== undefined) sat = parseInt(overrideState.saturation, 10);
          if (overrideState.contrast !== undefined) contrast = parseInt(overrideState.contrast, 10);
          if (overrideState.fontSize !== undefined) fontSize = parseInt(overrideState.fontSize, 10);
          if (overrideState.glowLevel !== undefined) glowLevel = parseInt(overrideState.glowLevel, 10);
        }

        var state = {
          isLightMode: isLight,
          hueRotate: hue,
          saturation: sat,
          contrast: contrast,
          fontSize: fontSize,
          glowLevel: glowLevel
        };

        var fullCss = (typeof LunoCssChunks !== 'undefined' && typeof LunoCssChunks.getAllCSS === 'function')
          ? LunoCssChunks.getAllCSS(state)
          : (typeof LunoCssChunks !== 'undefined' && typeof LunoCssChunks.getVariableCSS === 'function' ? LunoCssChunks.getVariableCSS(state) : '');

        // Seamless, non-destructive CSS application using applyCss
        if (typeof globalThis.applyCss === 'function') {
          globalThis.applyCss(fullCss, 'luno_theme');
        } else if (typeof document !== 'undefined') {
          var styleEl = document.getElementById('cssId_luno_theme') || document.getElementById('luno-dynamic-theme-style');
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'cssId_luno_theme';
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = fullCss;
        }

        // Toggle body class without setting canvas-breaking whole-page CSS filters
        if (typeof document !== 'undefined') {
          if (document.documentElement) document.documentElement.style.filter = 'none';
          if (document.body) {
            document.body.style.filter = 'none';
            if (isLight) document.body.classList.add('light-mode');
            else document.body.classList.remove('light-mode');
          }
        }
      }

  static openFloatingWidget() {
      var existing = document.getElementById('luno-floating-settings-box');
      if (existing) {
        existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
        return;
      }

      var savedGeo = { top: 60, left: Math.max(10, window.innerWidth - 440), width: 430, height: 590 };
      try {
        var raw = localStorage.getItem('luno_settings_box_geo');
        if (raw) Object.assign(savedGeo, JSON.parse(raw));
      } catch(e){}

      if (savedGeo.left > window.innerWidth - 80) savedGeo.left = Math.max(10, window.innerWidth - 440);
      if (savedGeo.top > window.innerHeight - 80) savedGeo.top = 60;

      var card = document.createElement('div');
      card.id = 'luno-floating-settings-box';
      card.style.cssText = [
        'position: fixed;',
        'top: ' + savedGeo.top + 'px;',
        'left: ' + savedGeo.left + 'px;',
        'width: ' + savedGeo.width + 'px;',
        'height: ' + savedGeo.height + 'px;',
        'min-width: 320px;',
        'min-height: 380px;',
        'max-width: calc(100vw - 16px);',
        'max-height: calc(100vh - 20px);',
        'background: var(--bg-card, #161b22);',
        'color: var(--text-primary, #c9d1d9);',
        'border: 2px solid var(--accent-primary, #00f2fe);',
        'border-radius: 12px;',
        'z-index: 9950;',
        'box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px var(--glow-color, rgba(0, 242, 254, 0.25));',
        'display: flex;',
        'flex-direction: column;',
        'font-family: monospace;',
        'box-sizing: border-box;',
        'overflow: hidden;',
        'backdrop-filter: blur(12px);'
      ].join('\n');

      var header = document.createElement('div');
      header.style.cssText = 'background:linear-gradient(135deg, var(--bg-input, #0d2d4a) 0%, var(--bg-card, #161b22) 100%); color:var(--text-accent, #00f2fe); padding:0.55rem 0.8rem; user-select:none; font-weight:bold; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; cursor:grab; border-radius:10px 10px 0 0; flex-shrink:0; border-bottom:1px solid var(--border-color, #30363d);';
      header.innerHTML = [
        '<div style="display:flex; align-items:center; gap:0.4rem;">',
        '  <span style="font-size:1rem;">⚙️</span>',
        '  <strong style="color:var(--text-accent, #00f2fe);">Workspace Settings & Display</strong>',
        '</div>',
        '<div style="display:flex; gap:0.35rem; align-items:center;">',
        '  <button id="btn-close-settings-box" style="background:none; border:none; color:#ff7b72; cursor:pointer; font-weight:bold; font-size:1.1rem; line-height:1; padding:0 0.25rem;">✖</button>',
        '</div>'
      ].join('\n');

      // Section Nav Tabs
      var tabNav = document.createElement('div');
      tabNav.style.cssText = 'display:flex; background:var(--bg-secondary, #0d1117); border-bottom:1px solid var(--border-color, #30363d); padding:0.3rem 0.5rem; gap:0.35rem; flex-shrink:0;';

      var currentTab = 'display';

      var btnTabDisplay = document.createElement('button');
      btnTabDisplay.style.cssText = 'flex:1; padding:0.35rem 0.5rem; background:var(--bg-card, #161b22); color:var(--text-accent, #00f2fe); border:1px solid var(--accent-primary, #00f2fe); border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
      btnTabDisplay.textContent = '🎨 Display & CSS';

      var btnTabWorkflow = document.createElement('button');
      btnTabWorkflow.style.cssText = 'flex:1; padding:0.35rem 0.5rem; background:var(--bg-secondary, #21262d); color:var(--text-secondary, #8b949e); border:1px solid var(--border-color, #30363d); border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
      btnTabWorkflow.textContent = '⚡ Workflow';

      var btnTabVoice = document.createElement('button');
      btnTabVoice.style.cssText = 'flex:1; padding:0.35rem 0.5rem; background:var(--bg-secondary, #21262d); color:var(--text-secondary, #8b949e); border:1px solid var(--border-color, #30363d); border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
      btnTabVoice.textContent = '🎙️ Voice & Tools';

      tabNav.appendChild(btnTabDisplay);
      tabNav.appendChild(btnTabWorkflow);
      tabNav.appendChild(btnTabVoice);

      var body = document.createElement('div');
      body.id = 'settings-box-scroll-body';
      body.style.cssText = 'padding:0.75rem; display:flex; flex-direction:column; gap:0.65rem; flex:1; overflow-y:auto; box-sizing:border-box; position:relative;';

      var isLight = typeof localStorage !== 'undefined' && localStorage.getItem('luno_is_light_mode') === 'true';
      var hue = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_hue_rotate')) || '0', 10);
      var sat = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_saturation')) || '100', 10);
      var contrast = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_contrast')) || '100', 10);
      var fontSize = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_font_size')) || '13', 10);
      var glow = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_glow_level')) || '50', 10);
      var activePreset = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_theme_preset')) || 'default';

      function renderActiveTab() {
        body.innerHTML = '';

        btnTabDisplay.style.background = currentTab === 'display' ? 'var(--bg-card, #161b22)' : 'var(--bg-secondary, #21262d)';
        btnTabDisplay.style.color = currentTab === 'display' ? 'var(--text-accent, #00f2fe)' : 'var(--text-secondary, #8b949e)';
        btnTabDisplay.style.borderColor = currentTab === 'display' ? 'var(--accent-primary, #00f2fe)' : 'var(--border-color, #30363d)';

        btnTabWorkflow.style.background = currentTab === 'workflow' ? 'var(--bg-card, #161b22)' : 'var(--bg-secondary, #21262d)';
        btnTabWorkflow.style.color = currentTab === 'workflow' ? 'var(--accent-green, #3fb950)' : 'var(--text-secondary, #8b949e)';
        btnTabWorkflow.style.borderColor = currentTab === 'workflow' ? 'var(--accent-green, #238636)' : 'var(--border-color, #30363d)';

        btnTabVoice.style.background = currentTab === 'voice' ? 'var(--bg-card, #161b22)' : 'var(--bg-secondary, #21262d)';
        btnTabVoice.style.color = currentTab === 'voice' ? 'var(--accent-secondary, #d2a8ff)' : 'var(--text-secondary, #8b949e)';
        btnTabVoice.style.borderColor = currentTab === 'voice' ? 'var(--accent-secondary, #8257e5)' : 'var(--border-color, #30363d)';

        if (currentTab === 'display') {
          renderDisplayTab();
        } else if (currentTab === 'workflow') {
          renderWorkflowTab();
        } else {
          renderVoiceTab();
        }
      }

      function renderDisplayTab() {
        // 1. Rich Live Interactive Swatch Preview Card showing components
        var swatchCard = document.createElement('div');
        swatchCard.id = 'theme-live-swatch-card';
        swatchCard.style.cssText = 'background:var(--bg-card, #161b22); border:2px solid var(--accent-primary, #00f2fe); border-radius:8px; padding:0.65rem 0.8rem; display:flex; flex-direction:column; gap:0.45rem; box-shadow:0 4px 12px var(--glow-color, rgba(0,242,254,0.2)); transition:border-color 0.15s ease, background 0.15s ease;';
        swatchCard.innerHTML = [
          '<div style="display:flex; justify-content:space-between; align-items:center;">',
          '  <strong style="color:var(--text-accent, #00f2fe); font-size:0.82rem;">✨ Live Color Swatch</strong>',
          '  <span style="font-size:0.68rem; color:var(--text-code, #7ee787); font-weight:bold; background:var(--bg-input, #0d1117); padding:0.1rem 0.35rem; border-radius:4px; border:1px solid var(--border-color, #30363d);">applyCss live</span>',
          '</div>',
          '<div style="font-size:0.75rem; color:var(--text-primary, #f8fafc); line-height:1.35;">',
          '  Cards, headers, inputs, buttons, and badges update synchronously across Luno.',
          '</div>',
          '<div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap; margin-top:0.1rem;">',
          '  <span style="padding:0.2rem 0.45rem; border-radius:4px; font-size:0.68rem; font-weight:bold; background:var(--accent-primary, #00f2fe); color:#ffffff;">Primary</span>',
          '  <span style="padding:0.2rem 0.45rem; border-radius:4px; font-size:0.68rem; font-weight:bold; background:var(--accent-secondary, #8257e5); color:#ffffff;">Outbox</span>',
          '  <span style="padding:0.2rem 0.45rem; border-radius:4px; font-size:0.68rem; font-weight:bold; background:var(--accent-green, #238636); color:#ffffff;">Inbox</span>',
          '  <code style="padding:0.2rem 0.4rem; border-radius:4px; font-size:0.68rem; background:var(--bg-input, #070a13); color:var(--text-code, #7ee787); border:1px solid var(--border-color, #1e293b);">const theme = 1;</code>',
          '</div>'
        ].join('\n');
        body.appendChild(swatchCard);

        // 2. Dark / Light Mode Switch
        var modeRow = document.createElement('div');
        modeRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-input, #0d1117); padding:0.55rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d);';
        modeRow.innerHTML = '<div style="display:flex; flex-direction:column;"><strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">Theme Mode:</strong><span style="font-size:0.7rem; color:var(--text-secondary, #8b949e);">Seamless CSS property switch</span></div>';

        var btnModeToggle = document.createElement('button');
        btnModeToggle.style.cssText = 'padding:0.4rem 0.85rem; background:' + (isLight ? '#0284c7' : 'var(--bg-secondary, #161b22)') + '; color:' + (isLight ? '#fff' : 'var(--text-accent, #00f2fe)') + '; border:1px solid ' + (isLight ? '#0284c7' : 'var(--accent-primary, #00f2fe)') + '; border-radius:6px; cursor:pointer; font-family:monospace; font-weight:bold; font-size:0.78rem; transition:all 0.15s ease;';
        btnModeToggle.textContent = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
        btnModeToggle.onclick = function() {
          isLight = !isLight;
          localStorage.setItem('luno_is_light_mode', String(isLight));
          btnModeToggle.textContent = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
          btnModeToggle.style.background = isLight ? '#0284c7' : 'var(--bg-secondary, #161b22)';
          btnModeToggle.style.color = isLight ? '#fff' : 'var(--text-accent, #00f2fe)';
          btnModeToggle.style.borderColor = isLight ? '#0284c7' : 'var(--accent-primary, #00f2fe)';
          LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
          renderActiveTab();
        };
        modeRow.appendChild(btnModeToggle);
        body.appendChild(modeRow);

        // 3. Preset Palette Buttons Row
        var presetBox = document.createElement('div');
        presetBox.style.cssText = 'background:var(--bg-input, #0d1117); padding:0.6rem; border-radius:8px; border:1px solid var(--border-color, #30363d); display:flex; flex-direction:column; gap:0.4rem;';
        presetBox.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center;"><strong style="font-size:0.78rem; color:var(--text-accent, #00f2fe);">Color Presets:</strong><span style="font-size:0.68rem; color:var(--text-secondary, #8b949e);">Tap to load palette</span></div>';

        var presetGrid = document.createElement('div');
        presetGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); gap:0.35rem;';

        var presets = (typeof LunoCssChunks !== 'undefined' && typeof LunoCssChunks.getPresets === 'function')
          ? LunoCssChunks.getPresets()
          : [];

        presets.forEach(function(p) {
          var isThisActive = (activePreset === p.id);
          var pBtn = document.createElement('button');
          pBtn.style.cssText = 'padding:0.38rem 0.5rem; background:' + (isThisActive ? 'rgba(0,242,254,0.15)' : 'var(--bg-secondary, #161b22)') + '; color:' + (isThisActive ? 'var(--text-accent, #00f2fe)' : 'var(--text-primary, #c9d1d9)') + '; border:1px solid ' + (isThisActive ? 'var(--accent-primary, #00f2fe)' : 'var(--border-color, #30363d)') + '; border-radius:5px; font-size:0.7rem; cursor:pointer; font-family:monospace; font-weight:bold; white-space:nowrap; text-align:center; transition:all 0.15s ease;';
          pBtn.textContent = p.name + (isThisActive ? ' ✓' : '');

          pBtn.onclick = function() {
            isLight = p.isLight;
            hue = p.hue;
            sat = p.sat;
            contrast = p.contrast;
            glow = p.glow;
            activePreset = p.id;

            localStorage.setItem('luno_is_light_mode', String(isLight));
            localStorage.setItem('luno_hue_rotate', String(hue));
            localStorage.setItem('luno_saturation', String(sat));
            localStorage.setItem('luno_contrast', String(contrast));
            localStorage.setItem('luno_glow_level', String(glow));
            localStorage.setItem('luno_theme_preset', p.id);

            LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
            renderActiveTab();
          };
          presetGrid.appendChild(pBtn);
        });

        presetBox.appendChild(presetGrid);
        body.appendChild(presetBox);

        // Helper to build real-time dynamic slider
        function buildSlider(labelText, min, max, value, unit, onUpdate) {
          var wrap = document.createElement('div');
          wrap.style.cssText = 'background:var(--bg-input, #0d1117); padding:0.5rem 0.65rem; border-radius:8px; border:1px solid var(--border-color, #30363d); display:flex; flex-direction:column; gap:0.25rem;';

          var headRow = document.createElement('div');
          headRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;';

          var titleSpan = document.createElement('strong');
          titleSpan.style.color = 'var(--text-primary, #c9d1d9)';
          titleSpan.textContent = labelText;

          var valSpan = document.createElement('span');
          valSpan.style.cssText = 'color:var(--text-accent, #00f2fe); font-weight:bold;';
          valSpan.textContent = value + unit;

          headRow.appendChild(titleSpan);
          headRow.appendChild(valSpan);

          var slider = document.createElement('input');
          slider.type = 'range';
          slider.min = String(min);
          slider.max = String(max);
          slider.value = String(value);
          slider.style.cssText = 'width:100%; cursor:pointer; accent-color:var(--accent-primary, #00f2fe);';

          slider.oninput = function(e) {
            var num = parseInt(e.target.value, 10);
            valSpan.textContent = num + unit;
            onUpdate(num);
          };

          wrap.appendChild(headRow);
          wrap.appendChild(slider);
          return wrap;
        }

        // 4. Sliders with Live Callbacks
        body.appendChild(buildSlider('Color Hue Shift:', 0, 360, hue, '°', function(val) {
          hue = val;
          localStorage.setItem('luno_hue_rotate', String(val));
          LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
        }));

        body.appendChild(buildSlider('Color Saturation:', 0, 100, sat, '%', function(val) {
          sat = val;
          localStorage.setItem('luno_saturation', String(val));
          LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
        }));

        body.appendChild(buildSlider('Contrast & Tone:', 70, 130, contrast, '%', function(val) {
          contrast = val;
          localStorage.setItem('luno_contrast', String(val));
          LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
        }));

        body.appendChild(buildSlider('Base UI Font Size:', 10, 18, fontSize, 'px', function(val) {
          fontSize = val;
          localStorage.setItem('luno_font_size', String(val));
          LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
        }));

        body.appendChild(buildSlider('Card Glow Intensity:', 0, 100, glow, '%', function(val) {
          glow = val;
          localStorage.setItem('luno_glow_level', String(val));
          LunoThemeEngine.applyDynamicTheme({ isLightMode: isLight, hueRotate: hue, saturation: sat, contrast: contrast, fontSize: fontSize, glowLevel: glow });
        }));

        // Reset Button
        var btnReset = document.createElement('button');
        btnReset.style.cssText = 'padding:0.45rem; background:var(--bg-secondary, #21262d); color:var(--text-secondary, #8b949e); border:1px solid var(--border-color, #30363d); border-radius:6px; font-size:0.75rem; cursor:pointer; font-family:monospace; margin-top:0.2rem;';
        btnReset.textContent = '↺ Reset Display Settings to Default';
        btnReset.onclick = function() {
          isLight = false;
          hue = 0;
          sat = 100;
          contrast = 100;
          fontSize = 13;
          glow = 50;
          activePreset = 'default';

          localStorage.setItem('luno_is_light_mode', 'false');
          localStorage.setItem('luno_hue_rotate', '0');
          localStorage.setItem('luno_saturation', '100');
          localStorage.setItem('luno_contrast', '100');
          localStorage.setItem('luno_font_size', '13');
          localStorage.setItem('luno_glow_level', '50');
          localStorage.setItem('luno_theme_preset', 'default');

          LunoThemeEngine.applyDynamicTheme({ isLightMode: false, hueRotate: 0, saturation: 100, contrast: 100, fontSize: 13, glowLevel: 50 });
          renderActiveTab();
        };
        body.appendChild(btnReset);
      }

      function renderWorkflowTab() {
        var autoApprove = (typeof ClientApp !== 'undefined' && ClientApp.autoApprove);
        var autoRow = document.createElement('div');
        autoRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-input, #0d1117); padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d);';
        autoRow.innerHTML = '<div style="display:flex; flex-direction:column;"><strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">Auto-Approve Inbound Payloads:</strong><span style="font-size:0.7rem; color:var(--text-secondary, #8b949e);">Skip modal and apply directly</span></div>';

        var btnAuto = document.createElement('button');
        btnAuto.style.cssText = 'padding:0.35rem 0.75rem; background:' + (autoApprove ? 'var(--accent-green, #238636)' : 'var(--bg-secondary, #21262d)') + '; color:' + (autoApprove ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (autoApprove ? 'var(--accent-green, #3fb950)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-family:monospace; font-weight:bold; font-size:0.75rem;';
        btnAuto.textContent = autoApprove ? 'Auto-Approve ON' : 'Off (Prompt)';
        btnAuto.onclick = function() {
          var next = !autoApprove;
          if (typeof ClientApp !== 'undefined') ClientApp.autoApprove = next;
          try { localStorage.setItem('luno_auto_approve', String(next)); } catch(e){}
          renderWorkflowTab();
        };
        autoRow.appendChild(btnAuto);
        body.appendChild(autoRow);

        var pace = (typeof ClientApp !== 'undefined' && ClientApp.executionPace) || 'methodical';
        var paceRow = document.createElement('div');
        paceRow.style.cssText = 'background:var(--bg-input, #0d1117); padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d); display:flex; flex-direction:column; gap:0.4rem;';
        paceRow.innerHTML = '<strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">Execution Pace:</strong>';

        var paceBtnRow = document.createElement('div');
        paceBtnRow.style.cssText = 'display:flex; gap:0.4rem;';

        var btnMethodical = document.createElement('button');
        btnMethodical.style.cssText = 'flex:1; padding:0.4rem; background:' + (pace === 'methodical' ? 'var(--accent-green, #238636)' : 'var(--bg-secondary, #21262d)') + '; color:' + (pace === 'methodical' ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (pace === 'methodical' ? 'var(--accent-green, #3fb950)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
        btnMethodical.textContent = '🐢 Methodical (Buffered)';
        btnMethodical.onclick = function() {
          if (typeof ClientApp !== 'undefined') ClientApp.executionPace = 'methodical';
          try { localStorage.setItem('luno_execution_pace', 'methodical'); } catch(e){}
          renderWorkflowTab();
        };

        var btnFast = document.createElement('button');
        btnFast.style.cssText = 'flex:1; padding:0.4rem; background:' + (pace === 'fast' ? 'var(--accent-secondary, #8257e5)' : 'var(--bg-secondary, #21262d)') + '; color:' + (pace === 'fast' ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (pace === 'fast' ? 'var(--accent-secondary, #d2a8ff)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
        btnFast.textContent = '⚡ Power (Instant)';
        btnFast.onclick = function() {
          if (typeof ClientApp !== 'undefined') ClientApp.executionPace = 'fast';
          try { localStorage.setItem('luno_execution_pace', 'fast'); } catch(e){}
          renderWorkflowTab();
        };

        paceBtnRow.appendChild(btnMethodical);
        paceBtnRow.appendChild(btnFast);
        paceRow.appendChild(paceBtnRow);
        body.appendChild(paceRow);

        var patchMode = (typeof LunoSettings !== 'undefined' && LunoSettings.getPatchApplyMode) ? LunoSettings.getPatchApplyMode() : 'direct';
        var isDirect = (patchMode === 'direct');

        var patchRow = document.createElement('div');
        patchRow.style.cssText = 'background:var(--bg-input, #0d1117); padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d); display:flex; flex-direction:column; gap:0.4rem;';
        patchRow.innerHTML = '<strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">Patch Application Workflow:</strong>';

        var patchBtnRow = document.createElement('div');
        patchBtnRow.style.cssText = 'display:flex; gap:0.4rem;';

        var btnDirect = document.createElement('button');
        btnDirect.style.cssText = 'flex:1; padding:0.4rem; background:' + (isDirect ? 'var(--accent-green, #238636)' : 'var(--bg-secondary, #21262d)') + '; color:' + (isDirect ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (isDirect ? 'var(--accent-green, #3fb950)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
        btnDirect.textContent = '⚡ Auto-Apply (Base Files)';
        btnDirect.onclick = function() {
          if (typeof LunoSettings !== 'undefined') LunoSettings.setPatchApplyMode('direct');
          else try { localStorage.setItem('luno_patch_apply_mode', 'direct'); } catch(e){}
          renderWorkflowTab();
        };

        var btnPatchLog = document.createElement('button');
        btnPatchLog.style.cssText = 'flex:1; padding:0.4rem; background:' + (!isDirect ? 'var(--accent-secondary, #8257e5)' : 'var(--bg-secondary, #21262d)') + '; color:' + (!isDirect ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (!isDirect ? 'var(--accent-secondary, #d2a8ff)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; font-family:monospace;';
        btnPatchLog.textContent = '🧩 Patch Log Journal';
        btnPatchLog.onclick = function() {
          if (typeof LunoSettings !== 'undefined') LunoSettings.setPatchApplyMode('patchlog');
          else try { localStorage.setItem('luno_patch_apply_mode', 'patchlog'); } catch(e){}
          renderWorkflowTab();
        };

        patchBtnRow.appendChild(btnDirect);
        patchBtnRow.appendChild(btnPatchLog);
        patchRow.appendChild(patchBtnRow);
        body.appendChild(patchRow);

        var duration = 3500;
        try { duration = parseInt(localStorage.getItem('luno_timer_duration') || '3500', 10); } catch(e){}

        var durRow = document.createElement('div');
        durRow.style.cssText = 'background:var(--bg-input, #0d1117); padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d); display:flex; justify-content:space-between; align-items:center;';
        durRow.innerHTML = '<strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">Countdown Buffer:</strong>';

        var durSelect = document.createElement('select');
        durSelect.style.cssText = 'background:var(--bg-secondary, #161b22); color:var(--text-accent, #00f2fe); border:1px solid var(--accent-primary, #00f2fe); padding:0.25rem 0.5rem; border-radius:6px; font-family:monospace; font-size:0.75rem; font-weight:bold; cursor:pointer;';
        durSelect.innerHTML = '<option value="800"' + (duration === 800 ? ' selected' : '') + '>0.8s (Fast)</option>' +
                              '<option value="1500"' + (duration === 1500 ? ' selected' : '') + '>1.5s (Balanced)</option>' +
                              '<option value="3500"' + (duration === 3500 ? ' selected' : '') + '>3.5s (Safe Methodical)</option>';
        durSelect.onchange = function(e) {
          var nextDur = parseInt(e.target.value, 10);
          try { localStorage.setItem('luno_timer_duration', String(nextDur)); } catch(err){}
          if (typeof InboxActionTimer !== 'undefined') InboxActionTimer.defaultDuration = nextDur;
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast('Buffer set to ' + (nextDur / 1000).toFixed(1) + 's', 'info', '⏱️');
          }
        };
        durRow.appendChild(durSelect);
        body.appendChild(durRow);
      }

      function renderVoiceTab() {
        var isDictation = true;
        try {
          if (typeof LunoSettings !== 'undefined' && typeof LunoSettings.dictationEnabled === 'function') {
            isDictation = LunoSettings.dictationEnabled();
          } else if (typeof localStorage !== 'undefined') {
            isDictation = localStorage.getItem('luno_dictation_enabled') !== 'false';
          }
        } catch(e){}

        var dictRow = document.createElement('div');
        dictRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-input, #0d1117); padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d);';
        dictRow.innerHTML = '<div style="display:flex; flex-direction:column;"><strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">🎙️ Voice Dictation in Outbox:</strong><span style="font-size:0.7rem; color:var(--text-secondary, #8b949e);">Enable speech-to-text in prompt notes</span></div>';

        var btnDict = document.createElement('button');
        btnDict.style.cssText = 'padding:0.35rem 0.75rem; background:' + (isDictation ? 'var(--accent-green, #238636)' : 'var(--bg-secondary, #21262d)') + '; color:' + (isDictation ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (isDictation ? 'var(--accent-green, #3fb950)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-family:monospace; font-weight:bold; font-size:0.75rem;';
        btnDict.textContent = isDictation ? 'Enabled ✓' : 'Disabled ✗';
        btnDict.onclick = function() {
          var next = !isDictation;
          if (typeof LunoSettings !== 'undefined' && typeof LunoSettings.setDictationEnabled === 'function') {
            LunoSettings.setDictationEnabled(next);
          } else {
            try { localStorage.setItem('luno_dictation_enabled', String(next)); } catch(e){}
          }
          renderVoiceTab();
        };
        dictRow.appendChild(btnDict);
        body.appendChild(dictRow);

        var showTelemetry = true;
        try {
          if (typeof localStorage !== 'undefined') {
            showTelemetry = localStorage.getItem('luno_show_telemetry') !== 'false';
          }
        } catch(e){}

        var telemRow = document.createElement('div');
        telemRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-input, #0d1117); padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color, #30363d);';
        telemRow.innerHTML = '<div style="display:flex; flex-direction:column;"><strong style="font-size:0.8rem; color:var(--text-primary, #f0f6fc);">⚡ Telemetry Drawer:</strong><span style="font-size:0.7rem; color:var(--text-secondary, #8b949e);">Show diagnostic event logger on Home</span></div>';

        var btnTelem = document.createElement('button');
        btnTelem.style.cssText = 'padding:0.35rem 0.75rem; background:' + (showTelemetry ? 'var(--accent-green, #238636)' : 'var(--bg-secondary, #21262d)') + '; color:' + (showTelemetry ? '#fff' : 'var(--text-secondary, #8b949e)') + '; border:1px solid ' + (showTelemetry ? 'var(--accent-green, #3fb950)' : 'var(--border-color, #30363d)') + '; border-radius:6px; cursor:pointer; font-family:monospace; font-weight:bold; font-size:0.75rem;';
        btnTelem.textContent = showTelemetry ? 'Visible ✓' : 'Hidden ✗';
        btnTelem.onclick = function() {
          var next = !showTelemetry;
          if (typeof LunoPlaybackLogger !== 'undefined' && typeof LunoPlaybackLogger.setVisible === 'function') {
            LunoPlaybackLogger.setVisible(next);
          } else {
            try { localStorage.setItem('luno_show_telemetry', String(next)); } catch(e){}
          }
          renderVoiceTab();
        };
        telemRow.appendChild(btnTelem);
        body.appendChild(telemRow);
      }

      btnTabDisplay.onclick = function() { currentTab = 'display'; renderActiveTab(); };
      btnTabWorkflow.onclick = function() { currentTab = 'workflow'; renderActiveTab(); };
      btnTabVoice.onclick = function() { currentTab = 'voice'; renderActiveTab(); };

      var resizeHandle = document.createElement('div');
      resizeHandle.className = 'luno-settings-resize-handle';
      resizeHandle.style.cssText = 'position:absolute; bottom:2px; right:2px; width:22px; height:22px; cursor:se-resize; user-select:none; z-index:10; color:var(--text-accent, #00f2fe); font-size:13px; text-align:right; line-height:22px; font-weight:bold; opacity:0.85;';
      resizeHandle.textContent = '◢';

      var isResizing = false;
      var rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0;

      var startResize = function(e) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        isResizing = true;
        var evt = e.touches ? e.touches[0] : e;
        rStartX = evt.clientX;
        rStartY = evt.clientY;
        rStartW = card.offsetWidth;
        rStartH = card.offsetHeight;
      };

      var doResize = function(e) {
        if (!isResizing) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        var evt = e.touches ? e.touches[0] : e;
        card.style.width = Math.max(320, rStartW + (evt.clientX - rStartX)) + 'px';
        card.style.height = Math.max(380, rStartH + (evt.clientY - rStartY)) + 'px';
      };

      var stopResize = function() {
        if (!isResizing) return;
        isResizing = false;
        var geo = {};
        try { geo = JSON.parse(localStorage.getItem('luno_settings_box_geo') || '{}'); } catch(e){}
        geo.width = card.offsetWidth;
        geo.height = card.offsetHeight;
        try { localStorage.setItem('luno_settings_box_geo', JSON.stringify(geo)); } catch(e){}
      };

      resizeHandle.addEventListener('mousedown', startResize);
      window.addEventListener('mousemove', doResize);
      window.addEventListener('mouseup', stopResize);

      resizeHandle.addEventListener('touchstart', startResize, { passive: false });
      window.addEventListener('touchmove', doResize);
      window.addEventListener('touchend', stopResize);

      card.appendChild(header);
      card.appendChild(tabNav);
      card.appendChild(body);
      card.appendChild(resizeHandle);
      document.body.appendChild(card);

      document.getElementById('btn-close-settings-box').onclick = function() { card.style.display = 'none'; };

      renderActiveTab();
      LunoThemeEngine.setupFloatingThemeDrag(card, header, savedGeo);
    }
  static createSettingsModal() {
      LunoThemeEngine.openFloatingWidget();
    }

  static applyCssChunk(chunkKey, cssString) {
      if (!chunkKey || !cssString) return;

      if (typeof DomBasics !== 'undefined' && typeof DomBasics.run === 'function') {
        DomBasics.run();
      }

      var id = 'luno_chunk_' + chunkKey;
      if (typeof globalThis.applyCss === 'function') {
        globalThis.applyCss(cssString, id);
      } else if (typeof document !== 'undefined') {
        var styleEl = document.getElementById('cssId_' + id);
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'cssId_' + id;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = cssString;
      }
    }
}

globalThis.LunoThemeEngine = LunoThemeEngine;
if (typeof module !== "undefined" && module.exports) module.exports = LunoThemeEngine;