================================================================================
🌙 LUNO WORKSPACE: MASTER ARCHITECTURAL DOSSIER & NEXT-THREAD HANDOFF
================================================================================
Date: September 2026
Author & Context: Rob & AI Collaboration
Platform: macOS (Apple Silicon darwin arm64), Node.js v22.14.0, Chrome/Desktop
Current Server Port: http://localhost:8080

--------------------------------------------------------------------------------
1. DIRECTORY TOPOLOGY & REPOSITORIES
--------------------------------------------------------------------------------
• Active Projects Web Root: /Users/rob/source/LunoProjects
  The parent directory housing all independent sibling projects, the shared
  Library hub, and the Luno workspace server.
• Luno Core Root: /Users/rob/source/LunoProjects/Luno
  The meta-development environment and live editor.
• Legacy Recursi Archive: /Users/rob/source/recursi/web
  Archive containing 50+ legacy applications awaiting modernization.

--------------------------------------------------------------------------------
2. CORE PHILOSOPHY & ARCHITECTURAL MANDATES
--------------------------------------------------------------------------------
A. KEEP THE APPS DEAD SIMPLE:
   - Application code must remain clean, readable, and focused purely on its
     own domain logic (drawing, math, piano, game physics, etc.).
   - Apps must NEVER be burdened with defensive script checks, window hacks, or
     manual loader boilerplate.
   - All boilerplate is pushed into the loaders (`LunoLoader.js` and `ThreeJSLoader.js`)
     and declarations are pushed into `luno.json`.

B. UNIVERSAL 3D ARCHITECTURE (ThreeJSLoader.js):
   - 3D should be effortless for both the user and the LLM.
   - Default Lighting: Handled automatically by `ThreeJSLoader`. Provides soft,
     natural illumination (~0.85 total intensity) that keeps colors deep and
     saturated. Never blast scenes with overexposure that washes colors into pastels.
   - Default Environment Reflections: Photorealistic reflections via
     `/assets/venice_sunset_1k.hdr` are active by default (`options.environment !== false`).
     `ThreeJSLoader` manages `RGBELoader` and `PMREMGenerator` behind the scenes.
   - Simple Toggles:
     • Turn off environment map: `{ environment: false }` or `app.setEnvironment(false)`
     • Turn off default lights: `{ lighting: false }` or `app.setLighting(false)`
       (used when an app wants to define its own specialized lighting rig).
   - Thick Lines & Addons: `ThreeJSLoader` exposes `LineGeometry`, `LineMaterial`,
     and `Line2` as globals for CAD/vector rendering, and provides `_fetchAndRewrite`
     for dynamic ES module loading (bloom, post-processing).

C. STANDARDIZED PROJECT SHELL:
   - `index.html`: A minimal, generic HTML5 shell referencing `/Library/LunoLoader.js`,
     mounting `<div id="app-container"></div>`.
   - `luno.json`: Single source of truth. Declares `name`, `entrypoint` (`class` and
     `method: "run"`), `library` dependencies, `main` scripts in dependency order,
     and `styles`.
   - App Entrypoint: A clean ES6 class with `run(env)` that mounts to `env.container`.

D. BUNDLING & PROMPT CONTEXT STRATEGY:
   - Full App Bundles > Piecemeal Snippets: LLMs work best when given 100% of an
     app's source code at once. Whenever working on a project, tell the user:
     "Please bundle [AppName] from the Outbox" — this gives you full context.
   - Keep Bundles Lean: Do NOT bundle the entire Luno meta-workspace (100+ files,
     test runners, and documentation) when working on sibling apps. When target is set
     to a sibling project (`MathStorm`, `Calculator`, `accuCad`, etc.), only that
     project's files and declared library modules are bundled (~5k–25k tokens).
   - Diagnostic tests (`LunoTestRunner.js`, 78 KB) should be excluded from default
     bundles unless specifically working on Luno's internal patch engine.

--------------------------------------------------------------------------------
3. CURRENT APPLICATION STATUS MATRIX
--------------------------------------------------------------------------------
✅ WORKING EXCELLENTLY:
• TriBlob: Stunning 3D simulation with glossy HDR reflections and smooth physics.
• teacup: 3D Utah teacup mesh rendering cleanly with environment reflection toggling.
• LegoDetective: 3D models rendering with rich, saturated primary colors (pastels fixed!).
• Basic3D: Clean Three.js starter with rotating geometry.
• situation: Executive career dossier and economic valuation portfolio.
• ValuationOfAccudraw: Historical AccuDraw valuation interactive dossier.
• BasicsWithDialogBox: Resizable 8-handle floating dialogs.
• AlphabetGame: Interactive children's drawing and letter matching.

⚠️ ACTIVE ISSUE TRACKER (NEXT FOCUS):
1. guessTheNoteGame:
   - Shows initial menu UI, but piano keyboard does not appear.
   - Need to check audio engine initialization, canvas sizing, and soundfont loaders.
2. Calculator:
   - Broken beyond font rendering.
   - Inspect modular arithmetic helpers (`Fractions.js`, `Parentheses.js`,
     `RepeatingDecimal.js`, `RepeatingDecimalExpander.js`), state flow, and button event wiring.
3. accuCad:
   - P2P connector (`P2PConnector.js`) throws errors when peer signaling servers
     are unreachable.
   - P2P networking must fail gracefully/silently and never block local 3D drawing.
4. Squircle:
   - Verify font loading (`Architects Daughter`, `Roboto`) and math graph rendering.
5. BulbAndButton & PleasureAndPain:
   - Verify that post-processing bloom loads via `_fetchAndRewrite` without error.

--------------------------------------------------------------------------------
4. UPCOMING ROADMAP & ACCUDRAW MERGER
--------------------------------------------------------------------------------
PHASE 1: STABILIZE EXISTING SIBLINGS
• Fix `guessTheNoteGame` (piano keyboard rendering & Web Audio).
• Fix `Calculator` (modular math execution and display).
• Make `P2PConnector.js` in `accuCad` non-blocking and silent on disconnect.

PHASE 2: THE ACCUDRAW MERGER
• Merge the `accudraw` app with `ValuationOfAccudraw`.
• Background & History: 30 years ago, Rob created AccuDraw at Bentley Systems
  (patented computer-aided drafting constraint system with polar/rectangular
  compasses and smart distance/angle locks).
• `accuCad` contains the modern Three.js reimplementation of AccuDraw (`AccuDraw.js`,
  `AccuDrawLogic.js`, `AccuDrawUi.js`).
• The merged project will document the historical patent, portfolio valuation,
  and provide an interactive 3D demonstration of the AccuDraw compass.

PHASE 3: MIGRATING CREATIVE & MEDIA TOOLS FROM RECURSI/WEB
• DrawingApp:
  - 14 JS files in `recursi/web/DrawingApp`.
  - Splines (`CurveFitter.js`), Bezier curves (`BezierVertex.js`, `Curve.js`),
    color pickers (`HueRingCP.js`, `TriangleCP.js`), and MIDI mapping.
• AardvarkPlaylist & aardvarkBookmarklet:
  - Advanced YouTube playlist manager and falling-note "Guitar Hero for piano" visualizer.
  - Links with 850 MIDI piano rolls in `recursi/web/pianorolls/`.
================================================================================