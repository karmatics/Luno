class LunoSettings {
  constructor() {}

  static INVALID_PROJECT_NAMES = ['web', 'storage', 'emulated', 'LunoWeb', '0', 'Library'];

  static DEFAULTS = {
    executionPace: 'methodical',
    autoApprove: false,
    activeDockView: 'workspace',
    verbosityLevel: 'chatty',
    maxPackageSize: 500000,
    timerDuration: 3500,
    isLightMode: false,
    hueRotate: 0,
    contrast: 100,
    fontSize: 13,
    glowLevel: 50,
    glowEnabled: true,
    themeWidgetExpanded: true,
    acornSource: 'auto',
    hotPatchMemoryMode: true,
    patchApplyMode: 'direct' // 'direct' = auto-apply to base file (default), 'patchlog' = write to LunoPatchLog.html
  };

  static KEYS = {
    executionPace: 'luno_execution_pace',
    autoApprove: 'luno_auto_approve',
    activeDockView: 'luno_active_dock_view',
    verbosityLevel: 'luno_verbosity_level',
    maxPackageSize: 'luno_max_pkg_size',
    timerDuration: 'luno_timer_duration',
    isLightMode: 'luno_is_light_mode',
    hueRotate: 'luno_hue_rotate',
    contrast: 'luno_contrast',
    fontSize: 'luno_font_size',
    glowEnabled: 'luno_glow',
    glowLevel: 'luno_glow_level',
    themeWidgetExpanded: 'luno_theme_widget_expanded',
    acornSource: 'luno_acorn_source',
    hotPatchMemoryMode: 'luno_hotpatch_memory_mode',
    patchApplyMode: 'luno_patch_apply_mode'
  };

  static getItem(key, fallback = null) {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {}
    return fallback;
  }

  static setItem(key, val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(val));
      }
    } catch (e) {}
  }

  static hotPatchMemoryMode() {
    const raw = LunoSettings.getItem(LunoSettings.KEYS.hotPatchMemoryMode);
    return raw !== null ? raw === 'true' : LunoSettings.DEFAULTS.hotPatchMemoryMode;
  }

  static setHotPatchMemoryMode(val) {
    LunoSettings.setItem(LunoSettings.KEYS.hotPatchMemoryMode, Boolean(val));
  }

  static getPatchApplyMode() {
    const mode = LunoSettings.getItem(LunoSettings.KEYS.patchApplyMode);
    return (mode === 'patchlog' || mode === 'direct') ? mode : LunoSettings.DEFAULTS.patchApplyMode;
  }

  static setPatchApplyMode(mode) {
    const validMode = (mode === 'patchlog') ? 'patchlog' : 'direct';
    LunoSettings.setItem(LunoSettings.KEYS.patchApplyMode, validMode);
  }

  static dictationEnabled() {
      try {
        if (typeof localStorage !== 'undefined') {
          const val = localStorage.getItem('luno_dictation_enabled');
          if (val !== null) return val === 'true';
        }
      } catch (e) {}
      return false; // Default off (enabled as preference)
    }

  static setDictationEnabled(val) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('luno_dictation_enabled', String(Boolean(val)));
        }
      } catch (e) {}
    }
}

globalThis.LunoSettings = LunoSettings;
if (typeof module !== "undefined" && module.exports) module.exports = LunoSettings;