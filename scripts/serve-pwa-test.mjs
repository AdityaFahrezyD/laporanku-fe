import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Local production-build fixture only; never shipped in dist or used by hosting.
const root = fileURLToPath(new URL('../dist/', import.meta.url))
let revision = 0
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname
  if (pathname === '/__test/update' && req.method === 'POST') {
    revision++
    res.writeHead(204).end()
    return
  }
  const file = resolve(root, '.' + decodeURIComponent(pathname))
  if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return }
  try {
    const document = ['/', '/admin', '/admin/', '/login', '/login/', '/api/login', '/api/login/'].includes(pathname)
    const target = document ? resolve(root, 'index.html') : file
    let body = await readFile(target)
    if (pathname === '/sw.js') body = Buffer.concat([body, Buffer.from('\n// Test deployment revision ' + revision)])
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch { res.writeHead(404).end('Not found') }
})
server.listen(5180, '127.0.0.1')
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.closeAllConnections(); server.close(() => process.exit(0)) })
