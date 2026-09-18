# 🗺️ SPS3: Library Unification, Windowing Engines & HTML Loader Shells
**Document ID**: SPS3
**Series**: Sibling Project Survey & Multi-Project Architecture
**Date**: August 2026

---

## 1. Library/DomBasics.js Core Primitives
All workspace projects rely on two foundational utilities provided by Library/DomBasics.js:

```javascript
// 1. Recursive DOM element builder with SVG namespace support
globalThis.makeElement = function(type, ...args) { /* ... */ };

// 2. Dynamic stylesheet injector with idempotent replacement
globalThis.applyCss = function(cssString, id, doc) { /* ... */ };
```

### Key Capabilities of makeElement:
- **SVG Elements**: Prefixes like svg:path, svg:rect, svg:circle automatically create elements in the SVG namespace (http://www.w3.org/2000/svg).
- **Child Array Flattening**: Nested child arrays are recursively flattened and appended.
- **Event & Style Handling**: Object arguments automatically bind styles and event listeners.

---

## 2. Dialog Framework Fusion: Recursi UITools.js + Luno Cyber-Dark Styling
- **Recursi UITools.js (2,669 LOC)**: Full-featured desktop windowing engine with 8-way directional resize handles (n, s, e, w, nw, ne, se, sw), iframe mouse covers, and auto z-index elevation.
- **Luno Floating Dialogs**: Single bottom-right resize handle, touch-friendly dragging, cyber-dark palette, glowing borders, and backdrop-filter blur.
- **Unified Window Component (LunoDialog.js)**: Fuses UITools 8-handle resizing engine with Luno's glowing UI aesthetic.
