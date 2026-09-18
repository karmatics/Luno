# 🗺️ SPS1: Multi-Project Workspace Vision & Flat Directory Topology
**Document ID**: SPS1
**Series**: Sibling Project Survey & Multi-Project Architecture
**Date**: August 2026

---

## 1. Architectural Mandate & System Overview
Luno is designed to fulfill two distinct roles simultaneously:
1. **Self-Improving Meta-System**: A standalone browser-centric development environment that can parse, edit, and patch its own source code in real time using AST tools and the HTML Container Protocol.
2. **Multi-Project Workspace Hub**: An orchestrator that loads, tests, previews, and deploys multiple sibling applications (AccuCAD, MySituation, VideoEditor, Basic3D, guessTheNoteGame, etc.) from a single localhost server or independently to GitHub Pages.

---

## 2. The Flat Directory Topology vs Legacy Nested Paths
In legacy Recursi, projects were trapped in deep nested subdirectories under a shared web/ folder, causing hardcoded import failures when exported to standalone domains or GitHub Pages.

In Luno, all projects are treated as first-class peers:
- On the local development server (localhost:8080), every sibling folder in web/ is directly addressable and mountable in Luno SPA tabs (e.g. /app-preview?project=MySituation).
- On GitHub Pages (https://username.github.io/ProjectName/), each project operates as an independent root with zero reliance on the parent workspace server.

```
/storage/emulated/0/Luno/web/   <-- Local Workspace Root
├── Library/                     <-- Central shared UI & audio modules
├── Luno/                        <-- Core development environment (Git repo)
├── MySituation/                 <-- Executive portfolio & dossier (Git repo)
├── VideoEditor/                 <-- Audio/video track & code studio
├── guessTheNoteGame/            <-- Music piano note training game
├── Basic3D/                     <-- Three.js 3D viewport starter template
├── BasicsWithDialogBox/         <-- Interactive UI dialog starter template
└── SimpleTest/                  <-- Lightweight preview test app
```

---

## 3. Core Strategy Summary
- **Manifest Unification**: Upgrade all legacy files.json manifests into rich luno.json declarations.
- **Library Centralization**: Centralize DomBasics.js (makeElement, applyCss) and UITools.js into web/Library/.
- **Universal Dialogs**: Fuse Recursi's 8-way resize window engine with Luno's cyber-dark glowing visual design.
- **1-Tap GitHub Deploy**: Direct repository synchronization from the Luno header navigation.
