# 🏛️ Luno Tiered Storage & Serverless Architecture Specification

## 1. Storage Tiers Overview

### Tier 1: IndexedDB Virtual Filesystem (Browser-Local)
- **Target Environment**: GitHub Pages (`*.github.io`), static web hosts, mobile browsers.
- **Persistence**: Browser IndexedDB (`luno_vfs_database`).
- **Key Schema**: `${projectName}::${relativePath}` (e.g. `Basic3D::src/App.js`).
- **Bootstrap Lifecycle**:
  1. Check IndexedDB for requested asset.
  2. If missing, fetch from static HTTP webroot (`./${relativePath}`).
  3. Store incoming edits, AST patches, and forks directly in IndexedDB.

### Tier 2: Web File System Access API (Folder Picker)
- **Target Environment**: Chromium Desktop (Chrome/Edge), Android Chrome with FSA flags.
- **Entrypoint**: `window.showDirectoryPicker({ mode: 'readwrite' })`.
- **Persistence**: Directly on host device filesystem.
- **Lifecycle**: User grants permission per session; all reads/writes bypass Node and go directly to disk handles.

### Tier 3: Local Node.js Server (Full System)
- **Target Environment**: Localhost (`http://localhost:8080`), Termux on Android, Node CLI.
- **Persistence**: Direct POSIX filesystem access via `fs` module.
- **Capabilities**: Local `git` execution, privileged backend scripts (`data-action="run-server"`), and multi-project routing.

---

## 2. Universal Path Standard
To ensure manifests run identically on `localhost:8080` and GitHub Pages:
- All paths inside `luno.json` are relative to the project root (e.g. `app/ClientApp.js`, `src/App.js`).
- Absolute root imports (`/Library/...`) are dynamically mapped to `./library/...` on static hosts.