class LunoThemeEngine {
  /**
   * ⚙️ CONSTRUCTOR: LunoThemeEngine()
   */
  constructor() {

  }

  /**
   * ⚙️ METHOD: setupFloatingThemeDrag(box, header, savedGeo)
   * - Type: Static Method
   * - Modifier: sync
   */
  static setupFloatingThemeDrag(box, header, savedGeo) {

    let isDragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    const startDrag = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.classList.contains('luno-theme-resize-handle')) return;
      isDragging = true;
      header.style.cursor = 'grabbing';
      const evt = e.touches ? e.touches[0] : e;
      startX = evt.clientX;
      startY = evt.clientY;
      origLeft = box.offsetLeft;
      origTop = box.offsetTop;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };

    const doDrag = (e) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const evt = e.touches ? e.touches[0] : e;
      const dx = evt.clientX - startX;
      const dy = evt.clientY - startY;

      const minLeft = 10;
      const maxLeft = window.innerWidth - 60;
      const minTop = 10;
      const maxTop = window.innerHeight - 60;

      const newLeft = Math.max(minLeft, Math.min(maxLeft, origLeft + dx));
      const newTop = Math.max(minTop, Math.min(maxTop, origTop + dy));
      box.style.left = newLeft + 'px';
      box.style.top = newTop + 'px';
    };

    const stopDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      header.style.cursor = 'grab';
      const geo = { top: box.offsetTop, left: box.offsetLeft, width: box.offsetWidth, height: box.offsetHeight };
      try { localStorage.setItem('luno_theme_box_geo', JSON.stringify(geo)); } catch(e){}
    };

    header.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);

    header.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);

  }
  /**
   * ⚙️ METHOD: applyDynamicTheme()
   * - Type: Static Method
   * - Modifier: sync
   */
    static applyDynamicTheme() {
      const isLight = typeof localStorage !== 'undefined' && localStorage.getItem('luno_is_light_mode') === 'true';
      const hueRotate = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_hue_rotate')) || '0', 10);
      const contrast = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_contrast')) || '100', 10);
      const fontSize = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_font_size')) || '13', 10);
      const glowLevel = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_glow_level')) || '50', 10);
  
      let styleEl = document.getElementById('luno-dynamic-theme-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'luno-dynamic-theme-style';
        document.head.appendChild(styleEl);
      }
  
      if (typeof LunoCssChunks !== 'undefined' && LunoCssChunks.getVariableCSS) {
        styleEl.textContent = LunoCssChunks.getVariableCSS({
          isLightMode: isLight,
          hueRotate: hueRotate,
          contrast: contrast,
          fontSize: fontSize,
          glowLevel: glowLevel
        });
      }
  
      if (typeof document !== 'undefined') {
        if (document.documentElement) document.documentElement.style.filter = 'none';
        if (document.body) {
          document.body.style.filter = 'none';
          if (isLight) document.body.classList.add('light-mode');
          else document.body.classList.remove('light-mode');
        }
      }
    }
  /**
   * ⚙️ METHOD: openFloatingWidget()
   * - Type: Static Method
   * - Modifier: sync
   */
  static openFloatingWidget() {

    var existing = document.getElementById('luno-floating-theme-box');
    if (existing) {
      existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
      return;
    }

    var savedGeo = { top: 70, left: window.innerWidth - 370, width: 350, height: 480 };
    try {
      var raw = localStorage.getItem('luno_theme_box_geo');
      if (raw) Object.assign(savedGeo, JSON.parse(raw));
    } catch(e){}

    if (savedGeo.left > window.innerWidth - 80) savedGeo.left = Math.max(10, window.innerWidth - 370);
    if (savedGeo.top > window.innerHeight - 80) savedGeo.top = 70;

    var card = document.createElement('div');
    card.id = 'luno-floating-theme-box';
    card.style.cssText = [
      'position: fixed;',
      'top: ' + savedGeo.top + 'px;',
      'left: ' + savedGeo.left + 'px;',
      'width: ' + savedGeo.width + 'px;',
      'height: ' + savedGeo.height + 'px;',
      'min-width: 280px;',
      'min-height: 280px;',
      'background: rgba(22, 27, 34, 0.95);',
      'color: #c9d1d9;',
      'border: 2px solid #00f2fe;',
      'border-radius: 10px;',
      'z-index: 9850;',
      'box-shadow: 0 10px 32px rgba(0,242,254,0.35);',
      'display: flex;',
      'flex-direction: column;',
      'font-family: monospace;',
      'box-sizing: border-box;',
      'overflow: hidden;',
      'backdrop-filter: blur(8px);'
    ].join('\n');

    var header = document.createElement('div');
    header.style.cssText = 'background:#003847; color:#00f2fe; padding:0.45rem 0.65rem; user-select:none; font-weight:bold; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:grab; border-radius:8px 8px 0 0; flex-shrink:0;';
    header.innerHTML = [
      '<span>🎨 Theme & Color Controls</span>',
      '<div style="display:flex; gap:0.3rem; align-items:center;">',
      '  <button id="btn-close-theme-window" style="background:none; border:none; color:#ff7b72; cursor:pointer; font-weight:bold; font-size:0.9rem; padding:0 0.2rem;">✖</button>',
      '</div>'
    ].join('\n');

    var body = document.createElement('div');
    body.style.cssText = 'padding:0.65rem; display:flex; flex-direction:column; gap:0.6rem; flex:1; overflow-y:auto; box-sizing:border-box; position:relative;';

    var isLight = typeof localStorage !== 'undefined' && localStorage.getItem('luno_is_light_mode') === 'true';
    var hueRotate = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_hue_rotate')) || '0', 10);
    var contrast = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_contrast')) || '100', 10);
    var fontSize = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_font_size')) || '13', 10);
    var glowLevel = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('luno_glow_level')) || '50', 10);

    // Mode Toggle
    var modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d;';
    modeRow.innerHTML = '<span style="font-size:0.78rem; font-weight:bold;">Theme Mode:</span>';

    var btnModeToggle = document.createElement('button');
    btnModeToggle.style.cssText = 'padding:0.35rem 0.75rem; background:' + (isLight ? '#0284c7' : '#161b22') + '; color:' + (isLight ? '#fff' : '#00f2fe') + '; border:1px solid #00f2fe; border-radius:6px; cursor:pointer; font-family:monospace; font-weight:bold; font-size:0.75rem;';
    btnModeToggle.textContent = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
    btnModeToggle.onclick = function() {
      isLight = !isLight;
      localStorage.setItem('luno_is_light_mode', String(isLight));
      btnModeToggle.textContent = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
      btnModeToggle.style.background = isLight ? '#0284c7' : '#161b22';
      btnModeToggle.style.color = isLight ? '#fff' : '#00f2fe';
      LunoThemeEngine.applyDynamicTheme();
    };
    modeRow.appendChild(btnModeToggle);

    // Hue Slider
    var hueWrap = document.createElement('div');
    hueWrap.style.cssText = 'background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d;';
    var hueLabel = document.createElement('label');
    hueLabel.style.cssText = 'fontSize:0.75rem; color:#8b949e; display:block; margin-bottom:0.2rem; font-family:monospace;';
    hueLabel.textContent = 'Color Hue Rotation (' + hueRotate + '°):';
    var hueInput = document.createElement('input');
    hueInput.type = 'range'; hueInput.min = '0'; hueInput.max = '360'; hueInput.value = String(hueRotate);
    hueInput.style.cssText = 'width:100%; cursor:pointer;';
    hueInput.oninput = function(e) {
      hueRotate = parseInt(e.target.value, 10);
      hueLabel.textContent = 'Color Hue Rotation (' + hueRotate + '°):';
      localStorage.setItem('luno_hue_rotate', String(hueRotate));
      LunoThemeEngine.applyDynamicTheme();
    };
    hueWrap.appendChild(hueLabel);
    hueWrap.appendChild(hueInput);

    // Contrast Slider
    var contrastWrap = document.createElement('div');
    contrastWrap.style.cssText = 'background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d;';
    var contrastLabel = document.createElement('label');
    contrastLabel.style.cssText = 'fontSize:0.75rem; color:#8b949e; display:block; margin-bottom:0.2rem; font-family:monospace;';
    contrastLabel.textContent = 'Contrast Level (' + contrast + '%):';
    var contrastInput = document.createElement('input');
    contrastInput.type = 'range'; contrastInput.min = '60'; contrastInput.max = '140'; contrastInput.value = String(contrast);
    contrastInput.style.cssText = 'width:100%; cursor:pointer;';
    contrastInput.oninput = function(e) {
      contrast = parseInt(e.target.value, 10);
      contrastLabel.textContent = 'Contrast Level (' + contrast + '%):';
      localStorage.setItem('luno_contrast', String(contrast));
      LunoThemeEngine.applyDynamicTheme();
    };
    contrastWrap.appendChild(contrastLabel);
    contrastWrap.appendChild(contrastInput);

    // Font Size Slider
    var fontWrap = document.createElement('div');
    fontWrap.style.cssText = 'background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d;';
    var fontLabel = document.createElement('label');
    fontLabel.style.cssText = 'fontSize:0.75rem; color:#8b949e; display:block; margin-bottom:0.2rem; font-family:monospace;';
    fontLabel.textContent = 'UI Font Size (' + fontSize + 'px):';
    var fontInput = document.createElement('input');
    fontInput.type = 'range'; fontInput.min = '10'; fontInput.max = '18'; fontInput.value = String(fontSize);
    fontInput.style.cssText = 'width:100%; cursor:pointer;';
    fontInput.oninput = function(e) {
      fontSize = parseInt(e.target.value, 10);
      fontLabel.textContent = 'UI Font Size (' + fontSize + 'px):';
      localStorage.setItem('luno_font_size', String(fontSize));
      LunoThemeEngine.applyDynamicTheme();
    };
    fontWrap.appendChild(fontLabel);
    fontWrap.appendChild(fontInput);

    // Glow Intensity Slider
    var glowWrap = document.createElement('div');
    glowWrap.style.cssText = 'background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d;';
    var glowLabel = document.createElement('label');
    glowLabel.style.cssText = 'fontSize:0.75rem; color:#8b949e; display:block; margin-bottom:0.2rem; font-family:monospace;';
    glowLabel.textContent = 'Card Glow Intensity (' + glowLevel + '%):';
    var glowInput = document.createElement('input');
    glowInput.type = 'range'; glowInput.min = '0'; glowInput.max = '100'; glowInput.value = String(glowLevel);
    glowInput.style.cssText = 'width:100%; cursor:pointer;';
    glowInput.oninput = function(e) {
      glowLevel = parseInt(e.target.value, 10);
      glowLabel.textContent = 'Card Glow Intensity (' + glowLevel + '%):';
      localStorage.setItem('luno_glow_level', String(glowLevel));
      LunoThemeEngine.applyDynamicTheme();
    };
    glowWrap.appendChild(glowLabel);
    glowWrap.appendChild(glowInput);

    // Preset Color Palettes Row
    var presetRow = document.createElement('div');
    presetRow.style.cssText = 'background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d; display:flex; flex-direction:column; gap:0.3rem;';
    presetRow.innerHTML = '<span style="font-size:0.75rem; color:#8b949e; font-weight:bold;">Color Theme Presets:</span>';

    var presetBtns = document.createElement('div');
    presetBtns.style.cssText = 'display:flex; gap:0.3rem; flex-wrap:wrap;';

    var presets = [
      { name: 'Default Cyan', hue: 0 },
      { name: 'Cyber Magenta', hue: 280 },
      { name: 'Nordic Blue', hue: 200 },
      { name: 'Emerald Green', hue: 120 },
      { name: 'Sunset Gold', hue: 40 }
    ];

    presets.forEach(function(p) {
      var btn = document.createElement('button');
      btn.style.cssText = 'padding:0.25rem 0.5rem; background:#161b22; color:#00f2fe; border:1px solid #00f2fe66; border-radius:4px; font-size:0.68rem; cursor:pointer; font-family:monospace; font-weight:bold;';
      btn.textContent = p.name;
      btn.onclick = function() {
        hueRotate = p.hue;
        hueInput.value = String(hueRotate);
        hueLabel.textContent = 'Color Hue Rotation (' + hueRotate + '°):';
        localStorage.setItem('luno_hue_rotate', String(hueRotate));
        LunoThemeEngine.applyDynamicTheme();
      };
      presetBtns.appendChild(btn);
    });

    presetRow.appendChild(presetBtns);

    // Resize Handle
    var resizeHandle = document.createElement('div');
    resizeHandle.className = 'luno-theme-resize-handle';
    resizeHandle.style.cssText = 'position:absolute; bottom:1px; right:1px; width:20px; height:22px; cursor:se-resize; user-select:none; z-index:10; color:#00f2fe; font-size:12px; text-align:right; line-height:22px; font-weight:bold; opacity:0.85;';
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
      card.style.width = Math.max(280, rStartW + (evt.clientX - rStartX)) + 'px';
      card.style.height = Math.max(280, rStartH + (evt.clientY - rStartY)) + 'px';
    };

    var stopResize = function() {
      if (!isResizing) return;
      isResizing = false;
      var geo = {};
      try { geo = JSON.parse(localStorage.getItem('luno_theme_box_geo') || '{}'); } catch(e){}
      geo.width = card.offsetWidth;
      geo.height = card.offsetHeight;
      try { localStorage.setItem('luno_theme_box_geo', JSON.stringify(geo)); } catch(e){}
    };

    resizeHandle.addEventListener('mousedown', startResize);
    window.addEventListener('mousemove', doResize);
    window.addEventListener('mouseup', stopResize);

    resizeHandle.addEventListener('touchstart', startResize, { passive: false });
    window.addEventListener('touchmove', doResize, { passive: false });
    window.addEventListener('touchend', stopResize);

    body.appendChild(modeRow);
    body.appendChild(hueWrap);
    body.appendChild(contrastWrap);
    body.appendChild(fontWrap);
    body.appendChild(glowWrap);
    body.appendChild(presetRow);
    body.appendChild(resizeHandle);

    card.appendChild(header);
    card.appendChild(body);
    document.body.appendChild(card);

    document.getElementById('btn-close-theme-window').onclick = function() { card.style.display = 'none'; };

    LunoThemeEngine.setupFloatingThemeDrag(card, header, savedGeo);
    LunoThemeEngine.applyDynamicTheme();

  }

  static createSettingsModal() {
      // Open floating color controls
      LunoThemeEngine.openFloatingWidget();

      // Inject dictation preference toggle if not already present in the floating window
      setTimeout(() => {
        const body = document.getElementById('luno-floating-theme-box');
        if (!body) return;
        if (document.getElementById('luno-dictation-toggle-row')) return;

        const isDictation = (typeof LunoSettings !== 'undefined' && LunoSettings.dictationEnabled) ? LunoSettings.dictationEnabled() : false;

        const dictRow = document.createElement('div');
        dictRow.id = 'luno-dictation-toggle-row';
        dictRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#0d1117; padding:0.5rem; border-radius:6px; border:1px solid #30363d; margin-top:0.35rem;';
        dictRow.innerHTML = '<span style="font-size:0.75rem; font-weight:bold; color:#f0f6fc;">🎙️ Voice Dictation Widget:</span>';

        const btnToggle = document.createElement('button');
        btnToggle.style.cssText = 'padding:0.3rem 0.65rem; background:' + (isDictation ? '#238636' : '#21262d') + '; color:' + (isDictation ? '#fff' : '#8b949e') + '; border:1px solid ' + (isDictation ? '#3fb950' : '#30363d') + '; border-radius:6px; cursor:pointer; font-family:monospace; font-weight:bold; font-size:0.72rem;';
        btnToggle.textContent = isDictation ? 'Enabled ✓' : 'Disabled ✗';
        btnToggle.onclick = () => {
          const next = !LunoSettings.dictationEnabled();
          LunoSettings.setDictationEnabled(next);
          btnToggle.textContent = next ? 'Enabled ✓' : 'Disabled ✗';
          btnToggle.style.background = next ? '#238636' : '#21262d';
          btnToggle.style.color = next ? '#fff' : '#8b949e';
          btnToggle.style.borderColor = next ? '#3fb950' : '#30363d';
          if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
            ClientApp.showToast(next ? 'Voice Dictation enabled in prompt writer!' : 'Voice Dictation disabled.', 'info', '🎙️');
          }
        };

        dictRow.appendChild(btnToggle);
        const innerBody = body.querySelector('#luno-floating-theme-box > div:nth-child(2)');
        if (innerBody) {
          innerBody.appendChild(dictRow);
        }
      }, 100);
    }
}

globalThis.LunoThemeEngine = LunoThemeEngine;
if (typeof module !== "undefined" && module.exports) module.exports = LunoThemeEngine;