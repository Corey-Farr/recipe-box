# Release verification · 1.0.0

Verified locally on **November 24, 2026**, on Windows with Node.js **22.13.1**, npm **10.9.2**, Playwright **1.65.1**, and its bundled Chromium **159.0.8154.6**. Public deployment and remote CI were subsequently verified as recorded below.

## Checks actually run

| Check                                | Result                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `npm ci` in a new local clone        | Passed; no inherited `node_modules` or build output                                       |
| `npx playwright install chromium`    | Passed; pinned browser available                                                          |
| `npm run typecheck`                  | Passed, strict TypeScript and Vue templates                                               |
| `npm run lint`                       | Passed, zero warnings/errors                                                              |
| `npm test`                           | **25 passed** across two domain/component test files                                      |
| `npm run build`                      | Passed for `dist/web` and `dist/extension`                                                |
| `npm run package`                    | Passed; versioned Manifest V3 zip with seven files                                        |
| `npm run test:e2e`                   | **13 passed**, including three actual extension integration tests                         |
| `npm run check` from the clean clone | Passed, full sequence above                                                               |
| `npm run format:check`               | Passed                                                                                    |
| `npm audit` / clean `npm ci` audit   | Zero reported vulnerabilities at verification time                                        |
| Production subpath                   | `/recipe-box/` loaded assets and completed sample import in a browser test                |
| Release archive                      | Extracted into fresh temporary directories; actual extracted extension loaded in Chromium |
| Showcase capture                     | Three real screenshots and an approximately 19-second WebM recording                      |

## Clean-checkout rehearsal

Cloned the local Git repository with `git clone --no-hardlinks` into a new ignored `.rehearsal/final-check` directory at application commit **`a89b18d`**. The clone started without dependencies or build output. Ran:

```sh
npm ci
npx playwright install chromium
npm run check
```

The full suite passed with `CI=1`, which prevents reuse of another preview server. The test harness served the clone’s production build itself. The clone remained clean after packaging: the regenerated extension zip was byte-for-byte identical to the checked-in release artifact. Only documentation was added after this rehearsal.

Also launched the documented `npm run dev` and `npm run preview` commands from that clone. Both the app and their localhost fixture pages returned HTTP 200. These servers were stopped after verification.

The earlier rehearsal exposed an automation startup race: the browser action could be triggered before a cold extension installation had initialized its worker. The test now waits for the real service worker execution context before invoking the browser action. The final fresh-clone run passed without retries or skipped tests.

## What the browser tests prove

- Production web sample import reads the local HTML fixture, allows correction, saves, reloads, and finds the edited recipe by ingredient.
- The extension suite extracts the shipped zip, checks the manifest and least-privilege permission list, loads it in Chromium, and invokes the actual browser action against an active localhost fixture tab. The production worker, tab lookup, `scripting.executeScript`, JSON-LD importer, editor, and storage all run. A separate extension collection page confirms persistence.
- Unusable metadata retains the source in a manual preview. Cancel adds nothing; manual completion saves a recipe. Restricted Chrome pages produce recoverable feedback.
- Serving changes, ingredient checkboxes, saved notes, and a fresh session preserve original ingredients and notes. Ambiguous yields require a user-entered baseline.
- Desktop (1360 px) and phone (390 px) workflows, visible focus, native keyboard form navigation, and no horizontal document overflow are checked. Screenshots were visually inspected; a clipped decorative caption was removed.
- Failed storage writes preserve the editable draft, and saving from two open tabs preserves both new recipes.

Automation substitutes Chromium’s `Extensions.triggerAction` call for a physical toolbar click. It does **not** stub extraction or add host permissions. This release uses a full-tab preview, not a toolbar popup. See [the interview notes](interview.md).

## Artifact identity

`release/recipe-box-1.0.0.zip` SHA-256:

```text
082bae411b8f660aa7488ff2e4eee0b4f4becb1dccd4f0279cffb82db7763e30
```

Source line endings and ZIP timestamps are normalized for reproducible packaging. The ZIP contains the production extension, not source dependencies or test mocks.

## Not performed

- Chrome Web Store submission: the extension is distributed as an unpacked ZIP through GitHub Releases.
- macOS execution, other browser engines, physical phones, and screen-reader audits: local runs cover Windows Chromium; remote CI runs on Ubuntu with Node 24. Phone widths are emulated.
- No automated physical toolbar mouse click is claimed. The test starts at the browser action API as described above.

## Public deployment follow-up

Published on November 24, 2026:

- [Public repository](https://github.com/Corey-Farr/recipe-box) and [version 1.0.0 release](https://github.com/Corey-Farr/recipe-box/releases/tag/v1.0.0), including the tested extension ZIP.
- [Remote CI passed](https://github.com/Corey-Farr/recipe-box/actions/runs/45448686851) on Ubuntu and Node 24 for application commit `cd166a7`.
- [GitHub Pages deployment succeeded](https://github.com/Corey-Farr/recipe-box/actions/runs/45449533092) on attempt 2. The first attempt could not locate the uploaded Pages artifact; rerunning all jobs succeeded without source changes.
- [Live app](https://corey-farr.github.io/recipe-box/) was checked in the browser: the sample importer offered recipe candidates, an edited recipe saved, four-to-six serving scaling produced `2¼ cups rice`, and the saved recipe and note persisted after reload. Serving count correctly reset to the original four.

The web demo and downloadable extension are public. Chrome Web Store publication is separate and was not performed.
