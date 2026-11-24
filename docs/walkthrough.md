# A 60-second walkthrough

Before the call: `npm ci`, `npm run dev`, then open http://127.0.0.1:5173. Use a fresh browser profile for a repeatable collection. Keep the extension installed and the fixture tab ready if you want the extension variant. Do not clear a browser profile containing recipes you want to keep.

| Time   | Action and talking point                                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–10s  | Show the collection. “Recipe Box keeps the version I actually cooked, along with the source and my notes. Everything is local; no account.”                                                  |
| 10–20s | Click **Try a sample import**, select the lemon rice, and review it. “This reads a bundled HTML fixture through the real JSON-LD importer. The extension reads the page I choose in Chrome.” |
| 20–30s | Change the title to “Sunday lemon rice”, then save. “The preview is a draft. I can fix metadata before it changes my collection.”                                                            |
| 30–40s | Change servings from 4 to 6. “One and a half cups becomes two and a quarter. Package sizes stay unchanged, and every change starts from the original.”                                       |
| 40–50s | Check rice, write “Add dill next time”, and save the note. Start a fresh cooking session. “Checkmarks clear; the personal note stays.”                                                       |
| 50–60s | Return to the collection, reload, and search “chickpeas”. “The saved version survives reloads. The same Vue UI powers the web demo and extension.”                                           |

Extension variant: replace the sample-import click with the Chrome toolbar action on http://127.0.0.1:5173/fixtures/recipes.html. It opens the full-tab preview and reads the actual fixture tab. Mention that the extension and hosted demo have separate local collections.

The included [short recording](media/demo.webm) is an automated capture of the real production web app, not a mockup. It demonstrates the sample import, title edit, serving change, checkbox, and note flow. Use the script above for a narrated live presentation.
