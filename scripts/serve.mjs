import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root = resolve('dist/web')
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1')
    let path = decodeURIComponent(url.pathname).replace(/^\/recipe-box(?=\/)/, '')
    if (path.endsWith('/')) path += 'index.html'
    const file = resolve(root, `.${path}`)
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw new Error('Not found')
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(await readFile(file))
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(4173, '127.0.0.1', () =>
  console.log('Recipe Box production preview: http://127.0.0.1:4173'),
)
