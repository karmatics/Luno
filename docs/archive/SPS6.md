# 🗺️ SPS6: Step-by-Step Recursi ➔ Luno Migration & Refactoring Protocol
**Document ID**: SPS6
**Series**: Sibling Project Survey & Multi-Project Architecture
**Date**: August 2026

---

## 1. Four-Step Project Migration Protocol
To transition any legacy Recursi application into a modern standalone Luno project:

### Step 1: Manifest Conversion
Convert files.json to luno.json:
- Map "main" array to Luno script loading sequence.
- Declare the primary class and method under "entrypoint": { "file": "...", "class": "...", "method": "run" }.
- Specify shared library modules under "library": ["DomBasics.js", "UITools.js"].

### Step 2: HTML Shell Replacement
Replace legacy index.html referencing recursi.js with the clean LunoLoader.js entry shell.

### Step 3: Library Path Normalization
Ensure all DOM creation calls use makeElement(...) and dynamic stylesheets use applyCss(...).

### Step 4: Standalone Verification
Test project mounting locally via http://localhost:8080/app-preview?project=ProjectName and verify standalone execution.
