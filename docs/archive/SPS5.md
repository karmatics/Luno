# 🗺️ SPS5: Deep Dive into Complex Projects (AccuCAD, YouTube MIDI, SVG Color Picker)
**Document ID**: SPS5
**Series**: Sibling Project Survey & Multi-Project Architecture
**Date**: August 2026

---

## 1. Complex Project Profiles

### 1.1. AccuCAD (Precision CAD Drawing & Geometry Engine)
- **Heritage**: Based on computer-aided design snapping and geometric constraint algorithms.
- **Components**:
  - Interactive drawing canvas with real-time vector coordinate projection.
  - Polar/rectangular constraint lock engine (AccuDraw compass).
  - Multi-layer geometry serialization and SVG/DXF export pipelines.
- **Architectural Role**: Exemplar high-performance standalone application with its own dedicated Git repository.

### 1.2. MidiYouTube (Interactive YouTube MIDI Player & Chrome Extension)
- **Components**:
  - Interactive multi-octave graphical pianos (GlowPiano.js, GraphicPiano.js).
  - Real-time MIDI input mapping and Web Audio sound synthesizer engines (TinySynth.js, WafPlayer.js, PianoSamplePlayer.js).
  - Embedded YouTube iframe synchronization for interactive play-along tutorials.
  - Chrome browser extension bridge injecting Luno overlay widgets directly into YouTube web pages.
- **Architectural Role**: Advanced multi-threaded media application requiring Web Audio, Web MIDI, and cross-window postMessage bridges.

### 1.3. Rotating SVG & Canvas Interactive Color Picker
- **Components**:
  - ColorPicker.js (1,092 LOC), HueRingCP.js, TriangleCP.js.
  - Intricate layered SVGs combined with rotating HTML5 2D canvas elements.
  - Real-time polar hue rotation and HSV/HSL color-space transformation.
- **Architectural Role**: Reusable visual UI component sample ideal for design tools and customizable theme engines.
