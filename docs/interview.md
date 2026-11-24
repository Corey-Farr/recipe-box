# Three implementation decisions

## 1. Import starts at the toolbar and keeps temporary tab access

[`extension/background.js`](../extension/background.js) receives Chrome’s `action.onClicked` event. Chrome grants `activeTab` for the tab the user chose; the worker passes that tab’s ID to a new extension editor tab. Opening a full tab keeps an unsaved draft alive when the user clicks away and gives the same comfortable layout as the web demo.

[`src/platform/extension.ts`](../src/platform/extension.ts) resolves the original tab with `chrome.tabs.get` and calls `chrome.scripting.executeScript` there. It extracts only the JSON-LD blocks and source URL. The Vue app consumes the import launch parameter once, feeds the strings to [`src/domain/importer.ts`](../src/domain/importer.ts), and opens a candidate selector or editable fallback. No background scan or permanent host access is needed. The source tab must remain open long enough to extract its metadata.

The tradeoff is a new editor tab for each toolbar action. This is deliberate: a transient popup closes when focus leaves it. The service worker stays small, and ordinary-browser code never invokes Chrome APIs.

## 2. Scaling changes the leading quantity and retains the original

[`src/domain/scaler.ts`](../src/domain/scaler.ts) parses only a leading number or number range, calculates a ratio from the numeric baseline, and joins the scaled quantity to the untouched remainder. Thus doubling `2 (14 oz) cans of tomatoes` changes the can count but preserves `14 oz`. Qualifiers such as `salt to taste` stay unchanged. Unicode, ASCII, and mixed fractions share the same numeric path.

[`src/domain/recipe.ts`](../src/domain/recipe.ts) conservatively infers a baseline only from an unambiguous numeric serving yield. The editor asks the user to supply a baseline for a loaf, a cookie count, or a serving range. [`src/App.vue`](../src/App.vue) always passes saved original ingredients into the scaler, so changing servings repeatedly cannot compound rounding errors. A return to the original yield preserves the exact original string.

The tradeoff is intentionally limited natural-language support. The scaler does not guess quantities in prose, convert units, rewrite plural nouns, or change quantities embedded in directions. These limits are visible in the UI and README. [`tests/unit/domain.test.ts`](../tests/unit/domain.test.ts) covers the required examples, invalid inputs, range forms, and repeated scaling.

## 3. Browser tests cross the actual extension boundary

[`tests/e2e/extension.spec.ts`](../tests/e2e/extension.spec.ts) unzips the versioned release artifact into a fresh temporary directory, verifies its Manifest V3 permissions, and launches a persistent Chromium profile with that unpacked extension. It opens [`public/fixtures/recipes.html`](../public/fixtures/recipes.html) in a real tab.

**Automation begins at Chromium’s browser-level `Extensions.triggerAction` call**, targeting that fixture’s tab target. It substitutes for the physical toolbar click; it does not substitute for the production action handler, `activeTab` grant, `tabs.get`, `scripting.executeScript`, importer, editor, or storage. No test-only host permissions or pre-extracted data are injected. The production toolbar worker opens the editor, which extracts the page and saves through the real UI. A separate extension collection page confirms persistence and the source URL. A second fixture verifies manual fallback and cancel, and a restricted page verifies actionable feedback.

The test uses the [Chromium DevTools Extensions domain](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/); that automation surface is browser-version-specific, so the Playwright lockfile and installed Chromium version matter. These are Chromium integration checks, not a claim that an automated mouse physically clicked Chrome’s toolbar.

[`tests/e2e/web.spec.ts`](../tests/e2e/web.spec.ts) separately covers desktop/mobile workflows, keyboard import, storage-write failures, multi-tab saves, note retention, baseline entry, and production assets under `/recipe-box/`. [`tests/unit/editor.test.ts`](../tests/unit/editor.test.ts) verifies isolated drafts and failed-save preservation without a browser extension.
