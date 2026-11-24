# Portfolio summary

Recipe Box is a local-first recipe manager built with Vue 3, strict TypeScript, and Vite. Its standalone web demo and Manifest V3 Chrome extension share a JSON-LD importer, editable preview, recipe collection, and quantity scaler. The extension imports from the user-selected tab with temporary permissions; the demo runs without installation or an account. Recipes and personal notes persist locally, while cooking checkmarks and serving adjustments remain separate from saved content.

The project includes deterministic fixtures, domain and component tests, production-build browser journeys, a packaged extension, a static deployment workflow, and captured desktop/mobile showcase assets. The extension integration test installs a freshly extracted release zip and exercises the browser action and real content-extraction path.

## Resume-ready bullets

- Built a local-first recipe manager with Vue 3 and strict TypeScript, sharing import, editing, search, and cooking flows between a standalone web app and a Manifest V3 Chrome extension using only `activeTab` and `scripting` permissions.
- Implemented JSON-LD normalization and serving scaling for fractions, ranges, and packaged ingredients; verified persistence, failure recovery, responsive keyboard flows, and the packaged extension’s real tab-import path with Vitest and Playwright.

## Honest presentation

This is a portfolio project with original sample content, not a claim of production adoption. The [public demo](https://corey-farr.github.io/recipe-box/) and [extension release](https://github.com/Corey-Farr/recipe-box/releases/tag/v1.0.0) are available. No user counts, business outcomes, or performance improvements are claimed. Review the code and interview notes before presenting implementation decisions as your own work.
