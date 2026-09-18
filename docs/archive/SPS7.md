# 🗺️ SPS7: Master Planning Dossier & Prompting Packet for Claude
**Document ID**: SPS7
**Series**: Sibling Project Survey & Multi-Project Architecture
**Target Recipient**: Anthropic Claude / Planning Thread
**Date**: August 2026

---

## 1. System Prompt & Context Packet for Downstream Thread

```text
================================================================================
🌙 LUNO MULTI-PROJECT WORKSPACE: MASTER ARCHITECTURAL PACKET
================================================================================

1. SYSTEM ROLES:
- Luno is both a self-editing browser development workspace and an orchestrator for multiple sibling projects.
- Shared libraries reside in web/Library/ (43 files, including DomBasics.js and UITools.js).

2. SURVEYED SIBLING DIRECTORIES:
- MySituation: Executive dossier & career valuation app (Git repo, live on GitHub Pages).
- AccuCAD: High-precision 2D/3D CAD drawing engine with geometric constraint snapping.
- MidiYouTube: Web Audio piano synthesis player with YouTube API synchronization & browser extension.
- VideoEditor: Interactive video timeline, code editor, and studio tool.
- guessTheNoteGame: Musical piano synthesis game with multi-engine audio players.
- Basic3D & BasicsWithDialogBox: Three.js and DOM windowing starter templates.

3. ARCHITECTURAL MANDATES:
- Unify makeElement and applyCss from Library/DomBasics.js across all projects.
- Fuse UITools.js 8-handle resizing engine with Luno's cyber-dark glowing UI aesthetics.
- Ensure all projects run identically on localhost:8080 and as independent GitHub Pages sites.
- Replace legacy files.json manifests and recursi.js scripts with luno.json and LunoLoader.js.
================================================================================
```
