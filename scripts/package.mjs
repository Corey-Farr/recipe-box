import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { zipSync, unzipSync } from 'fflate'
const root = 'dist/extension'
const files = {}
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path)
    else files[relative(root, path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path))
  }
}
await walk(root)
const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']))
if (manifest.manifest_version !== 3) throw new Error('Expected Manifest V3')
await mkdir('release', { recursive: true })
const output = `release/recipe-box-${manifest.version}.zip`
// A fixed ZIP timestamp makes repeated builds of unchanged files byte-for-byte stable.
await writeFile(output, zipSync(files, { level: 9, mtime: new Date(2000, 0, 1) }))
const unpacked = unzipSync(new Uint8Array(await readFile(output)))
if (!unpacked['manifest.json'] || !unpacked['index.html']) throw new Error('Invalid archive root')
console.log(
  `${output}: ${Object.keys(unpacked).length} files, manifest and preview at archive root. Browser tests extract this zip into a fresh temporary directory.`,
)
