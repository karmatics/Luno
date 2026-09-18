# 🏛️ Luno Core Modularization & Sibling Decoupling Proposal

## 1. Motivation
The Luno workspace core has grown to over 40 scripts. Whenever a developer bundles Luno to send to an LLM, the package exceeds 400KB due to:
1. 63 diagnostic test cases in `LunoTestRunner.js` (70KB+).
2. Large satellite tools (`LunoSvgStudio.js`, `LunoEs6Converter.js`, `AiStudioRelayDocs.js`).
3. 7 extensive architectural markdown documents declared in `luno.json`'s `"docs"` array.

---

## 2. Proposed Topology

### Tier A: Luno Core (The Cockpit) - Target ~18 Files
Focused strictly on the rapid development loop:
- **Pasting & Execution**: `ClientApp.js`, `ClientAppPaster.js`, `ClientAppUI.js`
- **AST Patcher & Parser**: `LunoPayloadParser.js`, `LunoContainerParser.js`, `LunoClassPatcher.js`, `LunoManifestDecisionEngine.js`, `LunoLinePatcher.js`
- **Outbox Management**: `OutboxQueue.js`, `OutboxWidgetRenderer.js`, `OutboxOptionsModal.js`, `OutboxPromptBox.js`, `LunoPromptInstructions.js`
- **Navigation & Storage**: `LunoSpaDock.js`, `LunoSpaHeaderNav.js`, `LunoProjectTemplates.js`, `LunoDeployEngine.js`, `LunoFileSystem.js`, `LunoApiClient.js`
- **UI Styling**: `LunoThemeEngine.js`, `LunoCssChunks.js`, `LunoAnimationEngine.js`

### Tier B: Standalone Sibling Projects (Peer Folders in Web Root)
Each tool gets its own `luno.json` and standalone HTML shell:
1. **`LunoTests/`**:
   - Files: `index.html`, `luno.json`, `LunoTestRunner.js`, test fixtures (`protocol_test.js`, `math_helper.js`).
   - Run in an isolated preview tab (`📱 LunoTests`).
   - Bundled ONLY when working on protocol / AST patcher diagnostics.
2. **`SvgStudio/`**:
   - Files: `index.html`, `luno.json`, `SvgStudio.js`.
   - Independent vector design utility. Can be deployed to GitHub Pages.
3. **`Es6Converter/`**:
   - Files: `index.html`, `luno.json`, `Es6Converter.js`.
   - Code refactoring workbench.
4. **`BookmarkletWorkshop/`**:
   - Promotes `Luno/bookmarklet/` into a first-class peer application.

### Tier C: Demand-Paged Documentation
- Remove `"docs"` array from `Luno/luno.json` so markdown files are never bundled into Outbox packages automatically.
- Docs tab in Luno uses lazy HTTP fetching (`/api/fs/read?path=docs/filename.md`) only when the user selects a doc topic.