import { test, expect } from '@playwright/test'

const backend = 'https://laporanku.my.id'
async function api(page) {
  let signedIn = false
  let expired = false
  const writes = []
  const seen = []
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'test-token', url: 'http://127.0.0.1:5180' }])
  await page.context().route(backend + '/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    seen.push(path)
    const reply = (body, status = 200) => route.fulfill({ status, headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://127.0.0.1:5180',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    }, body: status === 204 ? undefined : JSON.stringify(body) })
    if (request.method() === 'OPTIONS') return reply(null, 204)
    if (request.method() !== 'GET') writes.push({ path, method: request.method(), body: request.postDataJSON() })
    if (path === '/sanctum/csrf-cookie') return reply(null, 204)
    if (path === '/api/user') return signedIn ? reply({ id: 'admin', role: 'admin', name: 'Admin' }) : reply({}, 401)
    if (path === '/api/login') {
      if (expired) return reply({}, 419)
      if (request.postDataJSON().password !== 'correct-password') return reply({ errors: { email: ['Email atau password tidak sesuai.'] } }, 422)
      signedIn = true
      return reply({})
    }
    if (path === '/api/logout') { signedIn = false; return reply(null, 204) }
    return reply({ data: [] })
  })
  return { writes, seen, expire: () => { expired = true }, restore: () => { expired = false } }
}

async function controlled(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  })
}

test('admin route, legacy bookmarks and authentication still use the backend API', async ({ page }) => {
  const mock = await api(page)
  for (const old of ['/login', '/login/', '/api/login', '/api/login/']) {
    await page.goto(old + '?next=dashboard#login')
    await expect(page).toHaveURL('/admin?next=dashboard#login')
    await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
  }
  await page.goto('/admin/')
  await page.getByRole('textbox', { name: 'Email (wajib)', exact: true }).fill('admin@example.com')
  await page.getByLabel(/^Password/).fill('wrong-password')
  await page.getByRole('button', { name: /Masuk/, exact: false }).click()
  await expect(page.getByText('Email atau password tidak sesuai.')).toBeVisible()
  mock.expire()
  await page.getByLabel(/^Password/).fill('correct-password')
  await page.getByRole('button', { name: /Masuk/, exact: false }).click()
  await expect(page.getByText('Sesi formulir kedaluwarsa. Silakan coba masuk kembali.')).toBeVisible()
  mock.restore()
  await page.getByRole('button', { name: /Masuk/, exact: false }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: '+ Tambah income', exact: true })).toBeVisible()
  await page.goto('/admin')
  await expect(page).toHaveURL('/')
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ringkasan keuangan' })).toBeVisible()
  expect(mock.writes.filter((write) => write.path === '/api/login')).toHaveLength(3)
  expect(mock.writes.every((write) => write.method === 'POST')).toBe(true)
  expect(mock.writes.at(-1).path).toBe('/api/logout')
})

test('production manifest, icons and service worker meet installability checks', async ({ page, request }) => {
  await api(page)
  await page.goto('/')
  await controlled(page)
  const manifestResponse = await request.get('/manifest.webmanifest')
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json')
  const manifest = await manifestResponse.json()
  expect(manifest).toMatchObject({ id: '/', name: 'LaporanKu', start_url: '/', scope: '/', display: 'standalone' })
  for (const icon of [...manifest.icons, { src: '/apple-touch-icon.png', sizes: '180x180' }]) {
    const dimensions = await page.evaluate(async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      return image.naturalWidth + 'x' + image.naturalHeight
    }, icon.src)
    expect(dimensions).toBe(icon.sizes)
  }
  const workerResponse = await request.get('/sw.js')
  expect(workerResponse.headers()['content-type']).toContain('application/javascript')
  expect(await workerResponse.text()).not.toContain('<!doctype html>')
  const cdp = await page.context().newCDPSession(page)
  // Playwright contexts are incognito; inspect all app requirements except that browser-mode restriction.
  await expect.poll(async () => (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.filter((error) => error.errorId !== 'in-incognito')).toEqual([])
})

test('offline navigation recovers and service worker caches only public assets', async ({ page, context }) => {
  const mock = await api(page)
  await page.goto('/admin')
  await controlled(page)
  await page.evaluate(async (base) => {
    await fetch(base + '/api/incomes', { credentials: 'include' })
    await fetch(base + '/storage/receipt.png')
    await fetch(base + '/sanctum/csrf-cookie', { credentials: 'include' })
  }, backend)
  await context.setOffline(true)
  await expect(page.getByText(/Data yang tampil mungkin belum terbaru/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Koneksi terputus' })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Koneksi terputus' })).toBeVisible()
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((request) => request.url)))).flat())
  expect(cached.some((url) => url.includes('/offline.html'))).toBe(true)
  expect(cached.length).toBeGreaterThan(5)
  for (const url of cached) {
    expect(new URL(url).origin).toBe('http://127.0.0.1:5180')
    expect(new URL(url).pathname).toMatch(/^\/(assets\/|offline\.html$|manifest\.webmanifest$|icon\.svg$|pwa-[\w-]+\.png$|apple-touch-icon\.png$)/)
  }
  expect(mock.seen).toContain('/storage/receipt.png')
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.getByRole('heading', { name: 'Ringkasan keuangan' })).toBeVisible()
})

test('new service worker waits for consent and postponing preserves form input', async ({ page, request }) => {
  await api(page)
  await page.goto('/admin')
  await controlled(page)
  await page.getByRole('textbox', { name: 'Email (wajib)', exact: true }).fill('draft@example.com')
  await page.getByLabel(/^Password/).fill('unfinished-password')
  await page.evaluate(() => { window.formDocument = 'original' })
  const otherTab = await page.context().newPage()
  await otherTab.goto('/admin')
  await controlled(otherTab)
  await otherTab.getByLabel(/^Password/).fill('other-tab-draft')
  await otherTab.evaluate(() => { window.formDocument = 'original' })
  await request.post('/__test/update')
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
  await expect(page.getByText('Versi baru tersedia')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Email (wajib)', exact: true })).toHaveValue('draft@example.com')
  await page.getByRole('button', { name: 'Nanti', exact: true }).click()
  await expect(page.getByLabel(/^Password/)).toHaveValue('unfinished-password')
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting))).toBe(true)
  await page.getByRole('button', { name: 'Pembaruan tersedia', exact: true }).click()
  const reloaded = page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame() })
  await page.getByRole('button', { name: 'Perbarui', exact: true }).click()
  await reloaded
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
  expect(await page.evaluate(() => window.formDocument)).toBeUndefined()
  await expect(page.getByText('Versi baru tersedia')).toHaveCount(0)
  await expect(otherTab.getByLabel(/^Password/)).toHaveValue('other-tab-draft')
  expect(await otherTab.evaluate(() => window.formDocument)).toBe('original')
  await otherTab.close()
})

test('install offer uses browser prompt and disappears after installation', async ({ page }) => {
  await api(page)
  await page.goto('/admin')
  await expect(page.getByRole('textbox', { name: 'Email (wajib)', exact: true })).toBeVisible()
  // Native install dialogs are outside Playwright; exercise the browser event contract.
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = async () => { window.installRequested = true }
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(event)
  })
  await page.getByRole('button', { name: 'Pasang aplikasi', exact: true }).click()
  expect(await page.evaluate(() => window.installRequested)).toBe(true)
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(page.getByRole('button', { name: 'Pasang aplikasi', exact: true })).toHaveCount(0)
})

test('iOS install guidance is available and standalone mode hides it', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { get: () => 'iPhone Safari' }))
  await api(page)
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Cara memasang aplikasi' }).click()
  await expect(page.getByText(/Di Safari, buka menu Bagikan/)).toBeVisible()
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cara memasang aplikasi' })).toHaveCount(0)
})
