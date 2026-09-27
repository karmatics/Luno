class LunoCssChunks {
  constructor() {

  }

    static getVariableCSS(state) {
        return LunoCssChunks.getPaletteVariables(state);
      }
        static getLayoutCSS() {
      return [
        '* { box-sizing: border-box; margin: 0; padding: 0; }',
        'body { background-color: var(--bg-primary, #070a13); color: var(--text-primary, #f8fafc); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-size: var(--font-size-val, 13px); }',
        'button, input, select, textarea { font-family: inherit; }'
      ].join('\n');
    }

  static getCardCSS() {
      return [
        LunoCssChunks.getComponentCardsCSS(),
        LunoCssChunks.getLightModeOverridesCSS()
      ].join('\n\n');
    }
  static getAnimationCSS(glowEnabled, animEnabled) {

    var glow = glowEnabled !== undefined ? glowEnabled : true;
    if (!glow) return '';
    return [
      '@keyframes gentleGlow {',
      '  from { box-shadow: 0 0 4px var(--glow-color); }',
      '  to { box-shadow: 0 0 var(--glow-blur) var(--glow-color); }',
      '}',
      '.glow-card, .inbox-card, .outbox-card, #luno-theme-widget-card { animation: gentleGlow 2.5s infinite alternate; }'
    ].join('\n');

  }

  static getPresets() {
      return [
        { id: 'default', name: 'Midnight Cyan', isLight: false, hue: 0, sat: 100, contrast: 100, glow: 50 },
        { id: 'cyber', name: 'Cyber Neon', isLight: false, hue: 135, sat: 100, contrast: 105, glow: 65 },
        { id: 'nord', name: 'Nordic Azure', isLight: false, hue: 25, sat: 80, contrast: 95, glow: 40 },
        { id: 'emerald', name: 'Emerald Glow', isLight: false, hue: 310, sat: 90, contrast: 100, glow: 55 },
        { id: 'solar', name: 'Solar Amber', isLight: false, hue: 215, sat: 95, contrast: 105, glow: 50 },
        { id: 'amethyst', name: 'Royal Amethyst', isLight: false, hue: 85, sat: 95, contrast: 100, glow: 55 },
        { id: 'amoled', name: 'AMOLED Black', isLight: false, hue: 0, sat: 100, contrast: 130, glow: 70 },
        { id: 'monokai', name: 'Monokai Slate', isLight: false, hue: 70, sat: 75, contrast: 110, glow: 35 },
        { id: 'clean-light', name: 'Studio Light', isLight: true, hue: 15, sat: 85, contrast: 100, glow: 0 },
        { id: 'warm-paper', name: 'Warm Paper', isLight: true, hue: 200, sat: 70, contrast: 95, glow: 0 }
      ];
    }

  static getAllCSS(state) {
      var s = state || {};
      var isLight = Boolean(s.isLightMode);
      var glow = s.glowLevel !== undefined ? s.glowLevel : 50;
      var glowEnabled = !isLight && glow > 0;

      return [
        LunoCssChunks.getPaletteVariables(s),
        LunoCssChunks.getBaseAndResetCSS(),
        LunoCssChunks.getScrollbarAndUtilityCSS(),
        LunoCssChunks.getHeaderAndNavCSS(),
        LunoCssChunks.getComponentCardsCSS(),
        LunoCssChunks.getFormAndInputCSS(),
        LunoCssChunks.getButtonAndBadgeCSS(),
        LunoCssChunks.getModalAndFloatingBoxCSS(),
        LunoCssChunks.getCodeAndOutputFeedbackCSS(),
        LunoCssChunks.getLightModeOverridesCSS(),
        LunoCssChunks.getAnimationCSS(glowEnabled, true)
      ].join('\n\n');
    }
  static getPaletteVariables(state) {
      var s = state || {};
      var isLight = Boolean(s.isLightMode);
      var hue = s.hueRotate !== undefined ? parseInt(s.hueRotate, 10) : 0;
      var sat = s.saturation !== undefined ? parseInt(s.saturation, 10) : 100;
      var contrast = s.contrast !== undefined ? parseInt(s.contrast, 10) : 100;
      var fontSize = s.fontSize !== undefined ? parseInt(s.fontSize, 10) : 13;
      var glowLevel = s.glowLevel !== undefined ? parseInt(s.glowLevel, 10) : 50;

      if (isNaN(hue)) hue = 0;
      if (isNaN(sat)) sat = 100;
      if (isNaN(contrast)) contrast = 100;
      if (isNaN(fontSize)) fontSize = 13;
      if (isNaN(glowLevel)) glowLevel = 50;

      var actualGlow = isLight ? 0 : glowLevel;
      var glowBlur = Math.round(actualGlow * 0.35);
      var glowOpacity = (actualGlow * 0.008).toFixed(2);

      // Primary Brand Accent (e.g. Cyan / Teal / User Custom Hue)
      var primaryAccent = isLight
        ? 'hsl(' + ((195 + hue) % 360) + ', ' + Math.min(100, Math.round(sat * 0.9)) + '%, 38%)'
        : 'hsl(' + ((185 + hue) % 360) + ', ' + Math.min(100, sat) + '%, 50%)';

      // Secondary Accent for Outbox / Prompts / Badges (Purple / Magenta)
      var secondaryAccent = isLight
        ? 'hsl(' + ((270 + hue) % 360) + ', ' + Math.min(100, Math.round(sat * 0.85)) + '%, 46%)'
        : 'hsl(' + ((265 + hue) % 360) + ', ' + Math.min(100, sat) + '%, 68%)';

      // Green Accent for Inbox / Success
      var successGreen = isLight
        ? 'hsl(' + ((140 + (hue * 0.15)) % 360) + ', 72%, 34%)'
        : 'hsl(' + ((140 + (hue * 0.15)) % 360) + ', 75%, 48%)';

      var glowColor = isLight
        ? 'rgba(2, 132, 199, 0.12)'
        : 'hsla(' + ((185 + hue) % 360) + ', ' + Math.min(100, sat) + '%, 50%, ' + glowOpacity + ')';

      // Surface backgrounds computed from contrast slider
      var bgPrimary = isLight
        ? 'hsl(215, 25%, ' + Math.max(93, Math.min(99, 97 - (contrast - 100) * 0.08)) + '%)'
        : 'hsl(222, 45%, ' + Math.max(2, Math.min(12, 6 - (contrast - 100) * 0.05)) + '%)';

      var bgSecondary = isLight
        ? '#ffffff'
        : 'hsl(216, 28%, ' + Math.max(6, Math.min(18, 11 - (contrast - 100) * 0.05)) + '%)';

      var bgCard = isLight
        ? '#ffffff'
        : 'hsl(217, 24%, ' + Math.max(7, Math.min(20, 13 - (contrast - 100) * 0.05)) + '%)';

      var bgInput = isLight ? '#ffffff' : 'hsl(222, 45%, 4%)';
      var bgHover = isLight ? 'hsl(215, 20%, 94%)' : 'hsl(215, 25%, 16%)';

      var textPrimary = isLight
        ? 'hsl(222, 45%, ' + Math.max(5, Math.min(22, 11 - (contrast - 100) * 0.1)) + '%)'
        : 'hsl(210, 40%, ' + Math.max(86, Math.min(100, 96 + (contrast - 100) * 0.08)) + '%)';

      var textSecondary = isLight ? '#475569' : '#8b949e';
      var textCode = isLight ? '#15803d' : '#7ee787';

      var borderColor = isLight
        ? 'hsl(215, 20%, ' + Math.max(75, Math.min(90, 84 - (contrast - 100) * 0.1)) + '%)'
        : 'hsl(215, 20%, 20%)';

      var cardShadow = isLight
        ? '0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)'
        : '0 4px 14px rgba(0, 0, 0, 0.4)';

      var outboxGrad = isLight
        ? 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'
        : 'linear-gradient(135deg, #271052 0%, #161b22 100%)';

      var inboxGrad = isLight
        ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
        : 'linear-gradient(135deg, #0d2818 0%, #161b22 100%)';

      return [
        ':root {',
        '  --bg-primary: ' + bgPrimary + ';',
        '  --bg-secondary: ' + bgSecondary + ';',
        '  --bg-card: ' + bgCard + ';',
        '  --bg-input: ' + bgInput + ';',
        '  --bg-hover: ' + bgHover + ';',
        '  --text-primary: ' + textPrimary + ';',
        '  --text-secondary: ' + textSecondary + ';',
        '  --text-accent: ' + primaryAccent + ';',
        '  --text-code: ' + textCode + ';',
        '  --border-color: ' + borderColor + ';',
        '  --accent-primary: ' + primaryAccent + ';',
        '  --accent-secondary: ' + secondaryAccent + ';',
        '  --accent-green: ' + successGreen + ';',
        '  --glow-color: ' + glowColor + ';',
        '  --glow-blur: ' + glowBlur + 'px;',
        '  --card-shadow: ' + cardShadow + ';',
        '  --outbox-grad: ' + outboxGrad + ';',
        '  --inbox-grad: ' + inboxGrad + ';',
        '  --font-size-val: ' + fontSize + 'px;',
        '}',
        'html {',
        '  font-size: ' + fontSize + 'px !important;',
        '  background-color: var(--bg-primary) !important;',
        '  color: var(--text-primary) !important;',
        '}',
        'html, body, #app-root {',
        '  font-size: var(--font-size-val);',
        '  filter: none !important;',
        '}',
        '/* Strict protection for WebGL 3D canvases, images, video, and iframes */',
        'canvas, iframe, img, video {',
        '  filter: none !important;',
        '}'
      ].join('\n');
    }

  static getBaseAndResetCSS() {
      return [
        '* { box-sizing: border-box; margin: 0; padding: 0; }',
        'body {',
        '  background-color: var(--bg-primary, #070a13);',
        '  color: var(--text-primary, #f8fafc);',
        '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;',
        '  font-size: var(--font-size-val, 13px);',
        '  min-height: 100vh;',
        '  line-height: 1.45;',
        '}',
        'button, input, select, textarea { font-family: inherit; font-size: inherit; }'
      ].join('\n');
    }

  static getScrollbarAndUtilityCSS() {
      return [
        '/* Polished custom scrollbars that adapt between dark and light modes */',
        '::-webkit-scrollbar { width: 8px; height: 8px; }',
        '::-webkit-scrollbar-track { background: var(--bg-primary, #070a13); }',
        '::-webkit-scrollbar-thumb {',
        '  background: var(--border-color, #334155);',
        '  border-radius: 4px;',
        '}',
        '::-webkit-scrollbar-thumb:hover {',
        '  background: var(--accent-primary, #00f2fe);',
        '}',
        '.luno-main-container {',
        '  background-color: var(--bg-primary, #070a13);',
        '  color: var(--text-primary, #f8fafc);',
        '  width: 100%;',
        '  min-height: 100vh;',
        '}'
      ].join('\n');
    }

  static getHeaderAndNavCSS() {
      return [
        'header.luno-header, header {',
        '  border-bottom: 1px solid var(--border-color, #30363d) !important;',
        '  color: var(--text-primary, #f8fafc);',
        '}',
        '#global-target-project-select {',
        '  background: var(--bg-input, #0d1117) !important;',
        '  color: var(--text-accent, #00f2fe) !important;',
        '  border: 1px solid var(--accent-primary, #00f2fe) !important;',
        '}',
        '.luno-nav-tab {',
        '  background: var(--bg-secondary, #21262d);',
        '  color: var(--text-primary, #c9d1d9);',
        '  border: 1px solid var(--border-color, #30363d);',
        '  transition: all 0.15s ease;',
        '}',
        '.luno-nav-tab.active {',
        '  background: var(--accent-green, #238636) !important;',
        '  color: #ffffff !important;',
        '  border-color: var(--accent-green, #3fb950) !important;',
        '}'
      ].join('\n');
    }

  static getComponentCardsCSS() {
      return [
        '.luno-starter-panel {',
        '  background-color: var(--bg-card, #161b22) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '}',
        '.luno-starter-card {',
        '  background-color: var(--bg-secondary, #0d1117) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '  transition: transform 0.15s ease, border-color 0.15s ease;',
        '}',
        '.luno-starter-card:hover {',
        '  transform: translateY(-2px);',
        '  border-color: var(--accent-primary, #00f2fe) !important;',
        '}',
        '.outbox-card, .luno-outbox-card {',
        '  background: var(--outbox-grad) !important;',
        '  border: 2px solid var(--accent-secondary, #8257e5) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '}',
        '.inbox-card, .luno-inbox-card {',
        '  background: var(--inbox-grad) !important;',
        '  border: 2px solid var(--accent-green, #238636) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '}',
        '#luno-target-checkpoint-card {',
        '  background-color: var(--bg-card, #161b22) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '}',
        '.luno-project-card {',
        '  background-color: var(--bg-card, #0d1117) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '}'
      ].join('\n');
    }

  static getFormAndInputCSS() {
      return [
        'input[type="text"], input[type="password"], textarea, select {',
        '  background-color: var(--bg-input, #0d1117) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '  border-radius: 6px;',
        '  outline: none;',
        '  transition: border-color 0.15s ease, box-shadow 0.15s ease;',
        '}',
        'input[type="text"]:focus, input[type="password"]:focus, textarea:focus, select:focus {',
        '  border-color: var(--accent-primary, #00f2fe) !important;',
        '  box-shadow: 0 0 8px var(--glow-color, rgba(0, 242, 254, 0.25));',
        '}',
        'input[type="checkbox"], input[type="radio"] {',
        '  accent-color: var(--accent-primary, #00f2fe);',
        '}'
      ].join('\n');
    }

  static getButtonAndBadgeCSS() {
      return [
        'button {',
        '  font-family: inherit;',
        '  transition: transform 0.1s ease, filter 0.15s ease, background-color 0.15s ease;',
        '}',
        'button:active {',
        '  transform: scale(0.98);',
        '}',
        '.btn-primary, #btn-paste-chatbot {',
        '  background-color: var(--accent-green, #238636) !important;',
        '  color: #ffffff !important;',
        '  border: none !important;',
        '}',
        '#btn-bundle-code, .btn-purple {',
        '  background-color: var(--accent-secondary, #8257e5) !important;',
        '  color: #ffffff !important;',
        '  border: none !important;',
        '}',
        '#btn-main-copy-outbox {',
        '  border-color: var(--accent-secondary, #8257e5) !important;',
        '}',
        '#active-root-label {',
        '  background: var(--bg-input, #21262d) !important;',
        '  color: var(--text-accent, #00f2fe) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '}',
        '#luno-version-tag {',
        '  background: var(--bg-card, #161b22) !important;',
        '  color: var(--text-secondary, #8b949e) !important;',
        '  border: 1px solid var(--border-color, #30363d) !important;',
        '}'
      ].join('\n');
    }

  static getModalAndFloatingBoxCSS() {
      return [
        '#luno-floating-settings-box,',
        '#luno-floating-prompt-box,',
        '#luno-floating-file-editor,',
        '#luno-diff-approval-modal > div,',
        '#luno-smart-help-modal > div,',
        '#luno-bundle-options-modal > div {',
        '  background-color: var(--bg-card, #161b22) !important;',
        '  border-color: var(--accent-primary, #00f2fe) !important;',
        '  color: var(--text-primary, #f8fafc) !important;',
        '  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px var(--glow-color, rgba(0, 242, 254, 0.2)) !important;',
        '}'
      ].join('\n');
    }

  static getCodeAndOutputFeedbackCSS() {
      return [
        'pre, code {',
        '  background-color: var(--bg-input, #070a13) !important;',
        '  color: var(--text-code, #7ee787) !important;',
        '  border: 1px solid var(--border-color, #1e293b);',
        '  font-family: monospace;',
        '}',
        '#feedback-card {',
        '  background-color: var(--bg-card, #0d1117) !important;',
        '  border-color: var(--accent-primary, #00f2fe) !important;',
        '  box-shadow: 0 4px 12px var(--glow-color, rgba(0, 242, 254, 0.25)) !important;',
        '}',
        '#feedback-text-area {',
        '  background-color: var(--bg-input, #070a13) !important;',
        '}'
      ].join('\n');
    }

  static getLightModeOverridesCSS() {
      return [
        '/* Exhaustive Light Mode Overrides for Perfect Legibility */',
        'body.light-mode {',
        '  background-color: var(--bg-primary, #f8fafc) !important;',
        '  color: var(--text-primary, #0f172a) !important;',
        '}',
        'body.light-mode div,',
        'body.light-mode section,',
        'body.light-mode article,',
        'body.light-mode main {',
        '  color: var(--text-primary, #0f172a);',
        '}',
        'body.light-mode .card,',
        'body.light-mode .glow-card,',
        'body.light-mode .luno-starter-panel,',
        'body.light-mode .luno-starter-card,',
        'body.light-mode #luno-target-checkpoint-card,',
        'body.light-mode #luno-floating-settings-box,',
        'body.light-mode #luno-floating-prompt-box,',
        'body.light-mode #luno-floating-file-editor,',
        'body.light-mode #outbox-queue-container > div,',
        'body.light-mode #item-list-container > div,',
        'body.light-mode .luno-project-card {',
        '  background-color: #ffffff !important;',
        '  background-image: none !important;',
        '  color: var(--text-primary, #0f172a) !important;',
        '  border-color: var(--border-color, #e2e8f0) !important;',
        '  box-shadow: var(--card-shadow) !important;',
        '}',
        'body.light-mode .outbox-card,',
        'body.light-mode .luno-outbox-card {',
        '  background: var(--outbox-grad) !important;',
        '  border: 2px solid var(--accent-secondary, #7e22ce) !important;',
        '  color: #0f172a !important;',
        '}',
        'body.light-mode .inbox-card,',
        'body.light-mode .luno-inbox-card {',
        '  background: var(--inbox-grad) !important;',
        '  border: 2px solid var(--accent-green, #16a34a) !important;',
        '  color: #0f172a !important;',
        '}',
        'body.light-mode .outbox-item-row {',
        '  background: #ffffff !important;',
        '  border-color: var(--border-color, #e2e8f0) !important;',
        '}',
        'body.light-mode input[type="text"],',
        'body.light-mode input[type="password"],',
        'body.light-mode textarea,',
        'body.light-mode select {',
        '  background-color: #ffffff !important;',
        '  color: #0f172a !important;',
        '  border: 1px solid var(--border-color, #cbd5e1) !important;',
        '}',
        'body.light-mode pre,',
        'body.light-mode code,',
        'body.light-mode #feedback,',
        'body.light-mode #feedback-text-area {',
        '  background-color: #f1f5f9 !important;',
        '  color: var(--text-accent, #0284c7) !important;',
        '  border-color: #cbd5e1 !important;',
        '}',
        'body.light-mode a {',
        '  color: var(--text-accent, #0284c7) !important;',
        '}',
        'body.light-mode #active-root-label {',
        '  background: #f1f5f9 !important;',
        '  color: #0284c7 !important;',
        '  border-color: #cbd5e1 !important;',
        '}',
        'body.light-mode #luno-version-tag {',
        '  background: #f8fafc !important;',
        '  color: #64748b !important;',
        '  border-color: #e2e8f0 !important;',
        '}'
      ].join('\n');
    }
}

globalThis.LunoCssChunks = LunoCssChunks;
if (typeof module !== "undefined" && module.exports) module.exports = LunoCssChunks;