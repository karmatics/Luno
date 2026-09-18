# 🗺️ SPS2: Comprehensive Sibling Inventory & Manifest Conversion Matrix
**Document ID**: SPS2
**Series**: Sibling Project Survey & Multi-Project Architecture
**Date**: August 2026

---

## 1. Sibling Directory Inventory Matrix

| Project Directory | Category | Git Repo | Manifest Status | Entry Point | Shared Library Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MySituation** | Major Portfolio Dossier | ✅ Yes (.git) | luno.json + files.json | SituationApp.run() | DomBasics.js, UITools.js |
| **Luno** | Workspace Core | ✅ Yes (.git) | luno.json | ClientApp.init() | Embedded runtime tools |
| **VideoEditor** | Video / Code Studio | ❌ No | Modernized to luno.json | VideoEditor.js | DomBasics.js, UITools.js |
| **guessTheNoteGame**| Piano Synth Game | ❌ No | Modernized to luno.json | GuessTheNoteGame.js | GraphicPiano.js, GlowPiano.js, sound_engines/* |
| **VideoPrepper** | Video Chunk Slicer | ❌ No | luno.json + files.json | VideoSectionApp.init() | None |
| **Basic3D** | Three.js Starter App | ❌ No | luno.json + files.json | Basic3d.run() | DomBasics.js, UITools.js, ThreeJSLoader.js |
| **BasicsWithDialogBox**| Dialog Starter App | ❌ No | luno.json + files.json | BasicsWithDialogBox | DomBasics.js, UITools.js |
| **SimpleTest** | Minimal Verification | ❌ No | luno.json | SimpleApp.init() | DomBasics.js |
| **Library/** | Shared Module Hub | ❌ No | luno.json | Reusable primitives | 43 Component Modules |
| **images/** | Media Asset Hub | ❌ No | Static Directory | N/A | Shared static images |

---

## 2. Standardized luno.json Schema Specification

Every project in Luno uses a standardized luno.json that replaces legacy files.json:

```json
{
  "name": "Project Name",
  "version": "1.0.0",
  "description": "Short description of project functionality",
  "type": "luno-web-app",
  "entrypoint": {
    "file": "path/to/EntryPoint.js",
    "class": "AppClassName",
    "method": "run"
  },
  "main": [
    "path/to/Dependency1.js",
    "path/to/EntryPoint.js"
  ],
  "library": [
    "DomBasics.js",
    "UITools.js"
  ],
  "styles": [
    "css/style.css"
  ]
}
```
