# 🗺️ SPS4: GitHub Pages Multi-Repository & Standalone Distribution Blueprint
**Document ID**: SPS4
**Series**: Sibling Project Survey & Multi-Project Architecture
**Date**: August 2026

---

## 1. Dual Deployment Architecture

```
                    ┌───────────────────────────────────────┐
                    │       Local Multi-App Server          │
                    │        (http://localhost:8080)        │
                    └──────────────────┬────────────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               ▼                       ▼                       ▼
    ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
    │     web/Luno/       │ │   web/MySituation/  │ │    web/AccuCAD/     │
    │  (Meta-Editor Repo) │ │ (Dossier Git Repo)  │ │ (CAD Geometry Repo) │
    └─────────────────────┘ └──────────┬──────────┘ └──────────┬──────────┘
                                       │                       │
                                       ▼                       ▼
                            ┌─────────────────────┐ ┌─────────────────────┐
                            │ GitHub Pages Deploy │ │ GitHub Pages Deploy │
                            │ user.github.io/site │ │ user.github.io/cad  │
                            └─────────────────────┘ └─────────────────────┘
```

---

## 2. Dynamic Asset Path Resolution
When running on GitHub Pages, projects are served under a subpath (e.g. https://username.github.io/MySituation/).

LunoLoader.js detects the hosting environment dynamically:
- Local Server: uses standard /Library/ absolute paths.
- GitHub Pages: falls back to local relative ./library/ vendor paths or GitHub CDN.

---

## 3. 1-Tap Git Deploy Pipeline (/api/deploy)
The /api/deploy endpoint provides instant repository deployment from the Luno UI:
1. Validates project directory and removes stale .git/index.lock if present.
2. Stages all changes: git add .
3. Commits with timestamp: git commit -m "Automated deployment from Luno"
4. Pushes to remote: git push origin main
5. GitHub Pages builds and serves the updated application live within seconds.
