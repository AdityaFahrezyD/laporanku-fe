import { test, expect } from '@playwright/test'

const labels = { incomes: 'Pemasukan', expenses: 'Pengeluaran', transfers: 'Transfer' }
const keys = { incomes: 'income_id', expenses: 'expense_id', transfers: 'transfer_id' }
const wallet = { wallet_id: 'w1', name: 'Bank Utama', type: 'bank', balance: '1000.00', is_active: true }
function records(resource, count) {
  return Array.from({ length: count }, (_, i) => ({
    [keys[resource]]: `${resource}-${i}`, description: `${labels[resource]} ${i}`, amount: '10.00',
    transaction_date: `2026-09-${String(i + 1).padStart(2, '0')}T03:00:00Z`,
    income_wallet: wallet, expense_wallet: wallet, transfer_from: wallet, transfer_to: { ...wallet, name: 'Tunai' },
  }))
}
async function setup(page, hash = '', count = 11) {
  const db = { wallets: [wallet], ...Object.fromEntries(Object.keys(labels).map(resource => [resource, records(resource, count)])) }
  const state = { fail: false }
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/attachments/')) return route.fallback()
    const resource = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ status: resource === 'user' ? 401 : state.fail ? 429 : 200,
      headers: state.fail ? { 'Retry-After': '60' } : {}, contentType: 'application/json', body: JSON.stringify({ data: db[resource] || [] }) })
  })
  await page.goto('/' + hash)
  await expect(page.getByRole('table')).toHaveCount(1)
  return { db, state }
}
async function navigate(page, name) {
  await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name, exact: true }).click()
}

for (const view of ['ringkasan', 'incomes', 'expenses', 'transfers']) {
  test(`${view} detail shows all attachments and opens full images`, async ({ page }) => {
    const { db } = await setup(page, '#' + view, 1)
    const resource = view === 'ringkasan' ? 'incomes' : view
    const attachmentUrl = (id) => `/api/${resource}/${resource}-0/attachments/${id}`
    db[resource][0].attachments = [1, 2].map(id => ({ attachment_id: `a${id}`, url: attachmentUrl(id) }))
    await page.context().route('**/attachments/*', route => route.fulfill({
      contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>',
    }))
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Muat ulang', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: `Detail ${labels[resource]} 0`, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Detail transaksi' })
    await expect(dialog.getByRole('heading', { name: 'Bukti transaksi' })).toBeVisible()
    await expect(dialog.getByRole('img')).toHaveCount(2)
    for (const id of [1, 2]) {
      const img = dialog.getByRole('img', { name: `Bukti transaksi ${id}`, exact: true })
      await img.scrollIntoViewIfNeeded()
      await expect.poll(() => img.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true)
      await expect(dialog.getByRole('link', { name: `Buka gambar ${id} ukuran penuh` })).toHaveAttribute('href', attachmentUrl(id))
    }
    const popupPromise = page.waitForEvent('popup')
    await dialog.getByRole('link', { name: 'Buka gambar 2 ukuran penuh' }).click()
    const popup = await popupPromise
    await expect(popup).toHaveURL(new RegExp(attachmentUrl(2) + '$'))
    await popup.close()
    await expect(dialog.locator('input[type=file]')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /Upload|Hapus|Simpan/ })).toHaveCount(0)
    await page.setViewportSize({ width: 390, height: 600 })
    await dialog.getByRole('link', { name: 'Buka gambar 2 ukuran penuh' }).scrollIntoViewIfNeeded()
    expect(await dialog.evaluate(node => node.scrollHeight > node.clientHeight && node.scrollTop > 0)).toBe(true)
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  })
}

test('attachment detail handles empty lists, legacy URLs and failed images', async ({ page }) => {
  const { db } = await setup(page, '#incomes', 1)
  await page.getByRole('button', { name: 'Detail Pemasukan 0', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Detail transaksi' })
  await expect(dialog.getByText('Belum ada attachment.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Tutup', exact: true }).click()
  db.incomes[0].attachments = [
    { attachment_id: 'legacy', url: null },
    { attachment_id: 'missing', url: '/api/incomes/incomes-0/attachments/missing' },
  ]
  await page.route('**/attachments/missing', route => route.fulfill({ status: 404 }))
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Muat ulang', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Detail Pemasukan 0', exact: true }).click()
  await expect(dialog.getByText('Gambar lama belum tersedia.')).toBeVisible()
  await dialog.getByRole('link', { name: 'Buka gambar 2 ukuran penuh' }).scrollIntoViewIfNeeded()
  await expect(dialog.getByText('Gambar tidak dapat dimuat')).toBeVisible()
  await expect(dialog.getByRole('link')).toHaveCount(1)
})

test('summary shows one globally sorted table and retains wallet cards', async ({ page }) => {
  const { db } = await setup(page)
  await expect(page.getByRole('heading', { name: 'Dompet', exact: true })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Transaksi terbaru' }).locator('tbody tr')).toHaveCount(5)
  const names = await page.locator('tbody tr td:first-child .font-medium').allTextContents()
  expect(names).toEqual(['Pengeluaran 10', 'Pemasukan 10', 'Transfer 10', 'Pengeluaran 9', 'Pemasukan 9'])
  await expect(page.getByRole('navigation', { name: 'Paginasi transaksi' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Dompet', exact: true })).toHaveCount(0)
  db.expenses = []; db.transfers = []
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
  await expect(page.locator('tbody tr td:first-child .font-medium')).toHaveText(['Pemasukan 10', 'Pemasukan 9', 'Pemasukan 8', 'Pemasukan 7', 'Pemasukan 6'])
})

for (const [resource, label] of Object.entries(labels)) {
  test(`${label} isolates its records and paginates 0, 10 and 11 rows`, async ({ page }) => {
    const { db } = await setup(page, '#' + resource)
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dompet', exact: true })).toHaveCount(0)
    await expect(page.getByText('Total saldo', { exact: true })).toHaveCount(0)
    const rows = page.getByRole('table', { name: label, exact: true }).locator('tbody tr')
    await expect(rows).toHaveCount(10)
    for (const name of await rows.locator('td:first-child .font-medium').allTextContents()) expect(name).toMatch(new RegExp('^' + label + ' '))
    await expect(page.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled()
    await page.getByRole('button', { name: 'Berikutnya' }).click()
    await expect(rows).toHaveCount(1)
    await expect(page.getByText('Halaman 2 dari 2')).toBeVisible()
    await page.getByRole('button', { name: `Detail ${label} 0`, exact: true }).click()
    await expect(page.getByRole('dialog').getByText(`${resource}-0`, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Tutup', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Berikutnya' })).toBeDisabled()
    db[resource] = records(resource, 10)
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(rows).toHaveCount(10)
    await expect(page.getByText('Halaman 1 dari 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Berikutnya' })).toBeDisabled()
    db[resource] = []
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(rows).toHaveCount(0)
    await expect(page.getByText(`Belum ada transaksi ${label.toLowerCase()} dalam pembukuan ini.`)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled()
  })
}

test('navigation resets pagination and supports history, reload and mobile', async ({ page }) => {
  await setup(page, '#incomes')
  await page.getByRole('button', { name: 'Berikutnya' }).click()
  await navigate(page, 'Pengeluaran')
  await expect(page.getByText('Halaman 1 dari 2')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('table', { name: 'Pemasukan', exact: true })).toBeVisible()
  await expect(page.getByText('Halaman 1 dari 2')).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('table', { name: 'Pengeluaran', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('table', { name: 'Pengeluaran', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
  await page.getByRole('dialog', { name: 'Menu navigasi' }).getByRole('link', { name: 'Transfer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('table', { name: 'Transfer', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('unknown hash falls back to summary and cooldown keeps data on transaction views', async ({ page }) => {
  const { state } = await setup(page, '#unknown')
  await expect(page.getByRole('heading', { name: 'Ringkasan keuangan' })).toBeVisible()
  await navigate(page, 'Pemasukan')
  state.fail = true
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 429')
  await expect(page.getByRole('button', { name: /Tunggu \d+ detik/ })).toBeDisabled()
  await expect(page.locator('tbody tr')).toHaveCount(10)
  await navigate(page, 'Transfer')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: /Tunggu \d+ detik/ })).toBeDisabled()
})

test('short mobile drawer fills the screen, scrolls only its menu and restores page position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 })
  await setup(page)
  await page.evaluate(() => window.scrollTo(0, 240))
  const originalScroll = await page.evaluate(() => window.scrollY)
  expect(originalScroll).toBeGreaterThan(0)
  const trigger = page.getByRole('button', { name: 'Buka menu navigasi' })
  // Open at an existing scroll position without Playwright scrolling the header into view.
  await trigger.evaluate((button) => { button.focus({ preventScroll: true }); button.click() })
  const drawer = page.getByRole('dialog', { name: 'Menu navigasi' })
  const menu = drawer.getByRole('navigation', { name: 'Navigasi utama' })
  const footer = drawer.locator('.sidebar-footer')
  const geometry = await drawer.evaluate((el) => ({
    bottom: el.getBoundingClientRect().bottom,
    height: el.getBoundingClientRect().height,
    headerColor: getComputedStyle(el.firstElementChild).backgroundColor,
    bodyColor: getComputedStyle(el.children[1]).backgroundColor,
    bodyBottom: el.children[1].getBoundingClientRect().bottom,
  }))
  expect(geometry).toEqual({ bottom: 480, height: 480, headerColor: 'rgb(255, 255, 255)', bodyColor: 'rgb(31, 68, 76)', bodyBottom: 480 })
  const footerBefore = await footer.boundingBox()
  const lockedScroll = await page.evaluate(() => window.scrollY)
  expect(await page.evaluate(() => document.body.style.position)).toBe('fixed')
  await menu.hover()
  await page.mouse.wheel(0, 900)
  await expect.poll(() => menu.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  await page.mouse.wheel(0, 900)
  expect(await drawer.evaluate((el) => el.scrollTop)).toBe(0)
  expect(await footer.boundingBox()).toEqual(footerBefore)
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScroll)
  await page.mouse.move(380, 200)
  await page.mouse.wheel(0, 900)
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScroll)
  await drawer.getByRole('button', { name: 'Tutup dialog' }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(menu.getByRole('link', { name: 'Transfer', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(originalScroll)
  expect(await page.evaluate(() => document.body.style.position)).toBe('')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.setViewportSize({ width: 390, height: 844 })
  await trigger.click()
  await page.screenshot({ path: 'test-results/sidebar-mobile.png' })
  await drawer.getByRole('button', { name: 'Tutup dialog' }).click()
  await expect(drawer).not.toBeVisible()
})

test('desktop sidebar keeps its footer fixed and lets dashboard scroll independently', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 320 })
  await setup(page)
  const menu = page.getByRole('navigation', { name: 'Navigasi utama' })
  const footer = page.locator('aside .sidebar-footer')
  const before = await footer.boundingBox()
  await menu.hover()
  await page.mouse.wheel(0, 900)
  await expect.poll(() => menu.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  expect(await footer.boundingBox()).toEqual(before)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.mouse.move(1000, 250)
  await page.mouse.wheel(0, 500)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  expect(await footer.boundingBox()).toEqual(before)
})
