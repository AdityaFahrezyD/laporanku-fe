import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import config from '../vite.config.js'

test('login page navigation serves the SPA while API methods reach the backend', async () => {
  const requests = []
  const backend = createHttpServer((req, res) => {
    requests.push([req.method, req.url])
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ backend: true }))
  })
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  let vite
  try {
    const settings = config({ mode: 'test' })
    const target = 'http://127.0.0.1:' + backend.address().port
    for (const proxy of Object.values(settings.server.proxy)) proxy.target = target
    vite = await createServer({
      ...settings,
      configFile: false,
      logLevel: 'silent',
      server: { ...settings.server, host: '127.0.0.1', port: 0, open: false },
    })
    await vite.listen()
    const origin = 'http://127.0.0.1:' + vite.httpServer.address().port
    for (const path of ['/api/login', '/api/login/', '/api/login?next=dashboard', '/api/login/?next=dashboard', '/login']) {
      const response = await fetch(origin + path)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type'), /text\/html/)
      assert.match(await response.text(), /src\/main.jsx/)
    }
    const head = await fetch(origin + '/api/login/?next=dashboard', { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.match(head.headers.get('content-type'), /text\/html/)
    assert.deepEqual(requests, [])
    for (const [method, path] of [
      ['POST', '/api/login'],
      ['POST', '/api/logout'],
      ['GET', '/api/user'],
      ['GET', '/api/wallets'],
      ['GET', '/api/login/other'],
      ['GET', '/api/logout'],
      ['GET', '/sanctum/csrf-cookie'],
    ]) {
      const response = await fetch(origin + path, { method })
      assert.deepEqual(await response.json(), { backend: true })
      assert.deepEqual(requests.at(-1), [method, path])
    }
  } finally {
    if (vite) await vite.close()
    backend.closeAllConnections()
    await new Promise((resolve) => backend.close(resolve))
  }
})
