import { queryFixture } from '../queryFixture.js'
import { test, expect } from '@playwright/test'

const resources = ['incomes', 'expenses', 'transfers']
const keys = { incomes: 'income_id', expenses: 'expense_id', transfers: 'transfer_id' }
const guestLabels = { incomes: 'Pemasukan', expenses: 'Pengeluaran', transfers: 'Transfer' }
const adminLabels = { incomes: 'Income', expenses: 'Expenses', transfers: 'Transfer' }
const singulars = { incomes: 'income', expenses: 'expense', transfers: 'transfer' }
test.use({ timezoneId: 'America/Los_Angeles' })
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-09-14T03:00:00Z')) })

async function setup(page, role, resource = 'incomes') {
  const wallet = { wallet_id: 'w1', name: 'Bank', balance: '1000.00', is_active: true, type: 'bank' }
  const db = { wallets: [wallet, { ...wallet, wallet_id: 'w2', name: 'Tunai' }], categories: [] }
  for (const key of resources) {
    db[key] = Array.from({ length: 11 }, (_, index) => ({
      [keys[key]]: `${key}-${index}`, amount: '10.01', description: `September ${index}`,
      transaction_date: index === 10 ? '2026-09-13T17:00:00Z' : '2026-09-10T03:00:00Z',
      wallet_id: 'w1', from_wallet_id: 'w1', to_wallet_id: 'w2', category_id: null, attachments: [],
      income_wallet: wallet, expense_wallet: wallet, transfer_from: wallet, transfer_to: db.wallets[1],
    }))
    db[key].push({ ...db[key][0], [keys[key]]: `${key}-old`, description: 'Agustus', amount: '200.25', transaction_date: '2026-08-31T16:59:59Z' })
  }
  const state = { fail: false, requests: 0 }
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'token', url: 'http://127.0.0.1:5178' }])
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  await page.route('**/api/**', async route => {
    state.requests++
    const [, key, id] = new URL(route.request().url()).pathname.split('/').filter(Boolean)
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (key === 'user') return role === 'admin' ? reply({ id: 'admin', role, name: 'Admin' }) : reply({}, 401)
    if (state.fail) return reply({}, 500)
    const paginated = queryFixture(db, route.request().url())
    if (paginated) return reply(paginated)
    const method = route.request().method()
    if (method === 'DELETE') {
      db[key] = db[key].filter(row => row[keys[key]] !== id)
      return reply({})
    }
    if (['POST', 'PATCH'].includes(method)) {
      const body = route.request().postDataJSON()
      const [date, time] = body.transaction_date.split(' ')
      const [day, month, year] = date.split('-')
      const record = method === 'POST' ? { ...db[key][0], [keys[key]]: `${key}-new` } : db[key].find(row => row[keys[key]] === id)
      Object.assign(record, body, { transaction_date: new Date(`${year}-${month}-${day}T${time}:00+07:00`).toISOString() })
      if (method === 'POST') db[key].push(record)
      return reply({ data: record })
    }
    return reply({ data: id ? db[key].find(row => row[keys[key]] === id) : db[key] })
  })
  await page.goto('/#' + resource)
  await expect(page.getByRole('status', { name: 'Total hasil filter' })).toBeVisible()
  await expect(trigger(page)).toContainText('Semua waktu')
  await choose(page, 'Bulan ini')
  return { db, state }
}

const total = page => page.getByRole('status', { name: 'Total hasil filter' })
const trigger = page => page.getByRole('button', { name: /^Filter periode:/ })
async function choose(page, label, values = {}) {
  await trigger(page).click()
  const dialog = page.getByRole('dialog', { name: 'Filter periode' })
  await dialog.getByRole('radio', { name: label, exact: true }).check()
  if (values.month) {
    await dialog.getByRole('combobox', { name: 'Bulan', exact: true }).selectOption(values.month)
    await dialog.getByLabel('Tahun', { exact: true }).fill(values.year || '2026')
  }
  if (values.start) {
    await dialog.getByLabel('Tanggal mulai').fill(values.start)
    await dialog.getByLabel('Tanggal akhir').fill(values.end)
  }
  await dialog.getByRole('button', { name: 'Terapkan' }).click()
  await expect(dialog).not.toBeVisible()
}

for (const role of ['guest', 'admin']) {
  test(`${role}: a delayed search cannot overwrite newer results`, async ({ page }) => {
    const { db } = await setup(page, role)
    await choose(page, 'Semua waktu')
    let release
    let started
    const waiting = new Promise(resolve => { release = resolve })
    const incoming = new Promise(resolve => { started = resolve })
    await page.route('**/api/incomes?*', async route => {
      if (new URL(route.request().url()).searchParams.get('q') !== 'September') return route.fallback()
      const body = queryFixture(db, route.request().url())
      started()
      await waiting
      await route.fulfill({ json: body })
    })
    const search = page.getByRole('textbox', { name: role === 'guest' ? 'Cari transaksi' : 'Cari Income' })
    try {
      await search.fill('September')
      await incoming
      await expect(total(page)).toHaveCount(0)
      await search.fill('Agustus')
      await expect(total(page)).toContainText('Rp 200,25')
      const finished = page.waitForResponse(response => new URL(response.url()).searchParams.get('q') === 'September')
      release()
      await finished
      await expect(total(page)).toContainText('Rp 200,25')
      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.locator('tbody tr')).toContainText(['Agustus'])
    } finally { release() }
  })
}

for (const role of ['guest', 'admin']) {
  for (const resource of resources) {
    test(`${role} ${resource}: totals include all pages and follow every period`, async ({ page }) => {
      const { state } = await setup(page, role, resource)
      const rows = page.locator('tbody tr')
      await expect(trigger(page)).toHaveText('Bulan ini▾')
      await expect(rows).toHaveCount(10)
      await expect(total(page)).toContainText('Rp 110,11')
      await page.getByRole('button', { name: 'Berikutnya', exact: true }).click()
      await expect(rows).toHaveCount(1)
      await expect(total(page)).toContainText('Rp 110,11')
      const requestsBefore = state.requests
      await choose(page, 'Minggu ini')
      await expect(rows).toHaveCount(1)
      await expect(total(page)).toContainText('Rp 10,01')
      await expect(page.getByText('Halaman 1 dari 1')).toBeVisible()
      await choose(page, 'Pilih bulan', { month: '08' })
      await expect(rows).toContainText(['Agustus'])
      await expect(total(page)).toContainText('Rp 200,25')
      await choose(page, 'Rentang tanggal', { start: '2026-09-14', end: '2026-09-14' })
      await expect(total(page)).toContainText('Rp 10,01')
      await choose(page, 'Rentang tanggal', { start: '2020-01-01', end: '2020-01-02' })
      await expect(rows).toHaveCount(0)
      await expect(page.getByText('Tidak ada transaksi pada filter ini')).toBeVisible()
      await expect(total(page)).toContainText('Rp 0')
      await choose(page, 'Semua waktu')
      await expect(total(page)).toContainText('Rp 310,36')
      expect(state.requests).toBeGreaterThan(requestsBefore)
      state.fail = true
      await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(total(page)).toContainText('Rp 310,36')
      await expect(page.getByText(/Data terakhir mungkin|hasil pemuatan terakhir/)).toBeVisible()
    })
  }

  test(`${role}: period persists across navigation and data reload, browser reload resets`, async ({ page }) => {
    await setup(page, role)
    await choose(page, 'Pilih bulan', { month: '08' })
    for (const resource of ['expenses', 'transfers', 'incomes']) {
      if (role === 'admin') await page.getByRole('tab', { name: adminLabels[resource], exact: true }).click()
      else await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: guestLabels[resource], exact: true }).click()
      await expect(trigger(page)).toContainText('Agu 2026')
      await expect(total(page)).toContainText('Rp 200,25')
    }
    if (role === 'admin') {
      await page.getByRole('tab', { name: 'Dompet', exact: true }).click()
      await expect(trigger(page)).toHaveCount(0)
      await expect(total(page)).toHaveCount(0)
      await page.getByRole('tab', { name: 'Income', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Muat ulang', exact: true })).toBeEnabled()
    await expect(trigger(page)).toContainText('Agu 2026')
    await page.reload()
    await expect(trigger(page)).toContainText('Semua waktu')
    await expect(total(page)).toContainText('Rp 310,36')
  })

  for (const width of [320, 390, 430, 1280]) {
    test(`${role} ${width}px: accessible responsive filter, validation and visible total`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      const { db } = await setup(page, role)
      db.incomes[0].amount = '9999999999999.99'
      await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
      await expect(total(page)).toContainText('Rp 10.000.000.000.100,09')
      await trigger(page).click()
      const dialog = page.getByRole('dialog', { name: 'Filter periode' })
      const bounds = await dialog.boundingBox()
      if (width < 640) {
        expect(bounds.x).toBe(0)
        expect(bounds.width).toBe(width)
        expect(bounds.y + bounds.height).toBe(844)
      } else {
        expect(Math.abs(bounds.y - (844 - bounds.height) / 2)).toBeLessThanOrEqual(1)
      }
      await dialog.getByRole('button', { name: 'Tutup dialog' }).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(dialog.getByRole('button', { name: 'Terapkan' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Tutup dialog' })).toBeFocused()
      await dialog.getByRole('radio', { name: 'Semua waktu' }).check()
      await page.keyboard.press('Escape')
      await expect(trigger(page)).toBeFocused()
      await expect(trigger(page)).toContainText('Bulan ini')
      await trigger(page).click()
      await dialog.getByRole('radio', { name: 'Rentang tanggal' }).check()
      await dialog.getByLabel('Tanggal mulai').fill('2026-09-15')
      await dialog.getByLabel('Tanggal akhir').fill('2026-09-14')
      await dialog.getByRole('button', { name: 'Terapkan' }).click()
      await expect(dialog.getByRole('alert')).toContainText('Tanggal akhir tidak boleh mendahului tanggal mulai.')
      await dialog.getByLabel('Tanggal akhir').fill('')
      await dialog.getByRole('button', { name: 'Terapkan' }).click()
      expect(await dialog.getByLabel('Tanggal akhir').evaluate(el => el.validity.valid)).toBe(false)
      await dialog.getByRole('button', { name: 'Batal' }).click()
      await expect(trigger(page)).toContainText('Bulan ini')
      await choose(page, 'Rentang tanggal', { start: '2025-12-31', end: '2026-12-31' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      const buttonBox = await trigger(page).boundingBox()
      expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(width)
      const summary = total(page)
      await summary.scrollIntoViewIfNeeded()
      const before = await summary.boundingBox()
      await page.locator('.table-scroll').evaluate(el => { el.scrollLeft = el.scrollWidth })
      expect(await summary.boundingBox()).toEqual(before)
      expect(await summary.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      if (width === 390) {
        await page.locator('.table-scroll').evaluate(el => { el.scrollLeft = 0 })
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await page.screenshot({ path: `test-results/period-${role}-mobile.png`, fullPage: true })
        await trigger(page).click()
        await page.screenshot({ path: `test-results/period-${role}-sheet.png` })
      }
    })
  }
}

for (const resource of resources) {
  test(`admin ${resource}: search and CRUD update total while keeping the period`, async ({ page }) => {
    await setup(page, 'admin', resource)
    await choose(page, 'Semua waktu')
    const search = page.getByRole('textbox', { name: `Cari ${adminLabels[resource]}` })
    await search.fill('Agustus')
    await expect(total(page)).toContainText('Rp 200,25')
    await search.fill('September')
    await expect(total(page)).toContainText('Rp 110,11')
    await search.fill('')
    const singular = singulars[resource]
    await page.getByRole('button', { name: `+ Tambah ${singular}`, exact: true }).click()
    let form = page.getByRole('dialog', { name: `Tambah ${singular}`, exact: true })
    if (resource === 'transfers') {
      await form.getByLabel('Dompet asal', { exact: true }).selectOption('w1')
      await form.getByLabel('Dompet tujuan', { exact: true }).selectOption('w2')
    } else await form.getByLabel('Dompet', { exact: true }).selectOption('w1')
    await form.getByLabel('Nominal (Rp)', { exact: true }).fill('5,50')
    await form.getByLabel('Deskripsi (opsional)', { exact: true }).fill('Transaksi baru')
    await form.getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(total(page)).toContainText('Rp 315,86')
    await expect(trigger(page)).toContainText('Semua waktu')
    await search.fill('Transaksi baru')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    form = page.getByRole('dialog', { name: `Edit ${singular}`, exact: true })
    await form.getByLabel('Nominal (Rp)', { exact: true }).fill('7,75')
    await form.getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(total(page)).toContainText('Rp 7,75')
    await page.getByRole('button', { name: 'Hapus', exact: true }).click()
    await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click()
    await expect(total(page)).toContainText('Rp 0')
    await search.fill('')
    await expect(total(page)).toContainText('Rp 310,36')
    await choose(page, 'Bulan ini')
    await page.getByRole('button', { name: 'Berikutnya', exact: true }).click()
    await page.getByRole('button', { name: 'Hapus', exact: true }).click()
    await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click()
    await expect(page.getByText('Halaman 1 dari 1')).toBeVisible()
    await expect(total(page)).toContainText('Rp 100,10')
  })
}

for (const role of ['guest', 'admin']) {
  test(`${role}: initial load failure never displays a zero total`, async ({ page }) => {
    await page.route('**/api/**', route => {
      const user = route.request().url().endsWith('/user')
      return route.fulfill({ status: user ? role === 'admin' ? 200 : 401 : 500, contentType: 'application/json',
        body: JSON.stringify(user ? { id: 'admin', role, name: 'Admin' } : {}) })
    })
    await page.goto('/#incomes')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(total(page)).toHaveCount(0)
  })
}
