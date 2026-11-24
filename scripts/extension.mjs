import { copyFile, readFile } from 'node:fs/promises'
await copyFile('extension/manifest.json', 'dist/extension/manifest.json')
await copyFile('extension/background.js', 'dist/extension/background.js')
const manifest = JSON.parse(await readFile('dist/extension/manifest.json', 'utf8'))
await readFile('dist/extension/index.html')
await readFile(`dist/extension/${manifest.background.service_worker}`)
console.log(`Extension ${manifest.version} built; preview entry and toolbar worker exist.`)
