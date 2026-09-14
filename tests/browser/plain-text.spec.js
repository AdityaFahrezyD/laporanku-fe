import { test, expect } from '@playwright/test'
import { queryFixture } from '../queryFixture.js'

const inputs = {
  'script tag': '<script>alert(1)</script>',
  'image event handler': '<img src=x onerror=alert(1)>',
  'quotes and Indonesian text': 'Iuran "warga" & \'kas\' < > café',
  'literal entities': 'Kas &amp; &lt;b&gt; warga',
}
const resources = [
  ['incomes', 'Income', 'income', 'income_id'],
  ['expenses', 'Expenses', 'expense', 'expense_id'],
  ['transfers', 'Transfer', 'transfer', 'transfer_id'],
  ['wallets', 'Dompet', 'dompet', 'wallet_id'],
  ['categories', 'Kategori', 'kategori', 'category_id'],
]

async function setup(page, text, admin) {
  await page.clock.setFixedTime(new Date('2026-09-15T03:00:00Z'))
  const dialogs = []
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss() })
  const wallets = [
    { wallet_id: 'w1', name: text, type: 'bank', balance: '100.00', is_active: true },
    { wallet_id: 'w2', name: text, type: 'cash', balance: '100.00', is_active: true },
  ]
  const categories = ['income', 'expense'].map(type => ({ category_id: type, name: text, type }))
  const db = { wallets, categories }
  for (const [resource, , singular, key] of resources.slice(0, 3)) {
    db[resource] = [{
      [key]: resource + '-1', description: text, amount: '10.00',
      transaction_date: '2026-09-15T03:00:00Z', attachments: [],
      ...(resource === 'transfers'
        ? { from_wallet_id: 'w1', to_wallet_id: 'w2', transfer_from: wallets[0], transfer_to: wallets[1] }
        : { wallet_id: 'w1', category_id: singular, category: categories.find(c => c.type === singular), [singular + '_wallet']: wallets[0] }),
    }]
  }
  const writes = []
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'token', url: 'http://127.0.0.1:5178' }])
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  // Only API responses are mocked; all rendering, form handling and fetch code is real.
  await page.route('**/api/**', async route => {
    const request = route.request()
    const [, resource, id] = new URL(request.url()).pathname.split('/').filter(Boolean)
    if (resource === 'user') return route.fulfill({ status: admin ? 200 : 401, json: admin ? { id: 'admin', role: 'admin', name: 'Administrator' } : {} })
    if (request.method() === 'GET') {
      const query = queryFixture(db, request.url())
      if (query) return route.fulfill({ json: query })
    }
    const meta = resources.find(([name]) => name === resource)
    if (!meta) return route.fulfill({ status: 404, json: {} })
    const row = db[resource].find(record => record[meta[3]] === id)
    if (request.method() === 'PATCH' && row) {
      const body = request.postDataJSON()
      writes.push({ resource, body })
      Object.assign(row, body)
      if (body.transaction_date) {
        const [date, time] = body.transaction_date.split(' ')
        const [day, month, year] = date.split('-')
        row.transaction_date = new Date(`${year}-${month}-${day}T${time}:00+07:00`).toISOString()
      }
      return route.fulfill({ json: { data: row } })
    }
    if (request.method() === 'GET') return route.fulfill({ json: { data: id ? row : db[resource] } })
    return route.fulfill({ status: 405, json: {} })
  })
  await page.goto('/')
  return { writes, dialogs }
}

async function assertNoInjectedHtml(page, dialogs) {
  // Checking DOM nodes also catches script tags that innerHTML inserts without executing.
  await expect(page.locator('#root script, #root img[src="x"], #root [onerror]')).toHaveCount(0)
  expect(dialogs).toEqual([])
}

for (const [label, text] of Object.entries(inputs)) {
  test(`guest renders ${label} as text in cards, lists, filters and details`, async ({ page }) => {
    const { dialogs } = await setup(page, text, false)
    await expect(page.locator('#dompet h3')).toHaveText([text, text])
    await expect(page.locator('tbody tr')).toHaveCount(3)
    await expect(page.locator('tbody tr').first().getByText(text, { exact: true }).first()).toBeVisible()
    await assertNoInjectedHtml(page, dialogs)

    // The summary and all three transaction tabs have their own detail entry points.
    for (const view of ['ringkasan', 'incomes', 'expenses', 'transfers']) {
      if (view !== 'ringkasan') {
        await page.getByRole('navigation', { name: 'Navigasi utama' }).locator(`a[href="#${view}"]`).click()
        await expect(page.locator('tbody tr')).toHaveCount(1)
      }
      const row = page.locator('tbody tr').first()
      await expect(row.getByText(text, { exact: true }).first()).toBeVisible()
      if (['incomes', 'expenses'].includes(view)) {
        await expect(page.getByLabel('Filter kategori').locator('option').last()).toHaveText(text)
      }
      await row.getByRole('button', { name: 'Detail ' + text, exact: true }).click()
      const detail = page.getByRole('dialog', { name: 'Detail transaksi', exact: true })
      await expect(detail.locator('dd').first()).toHaveText(text)
      await expect(detail.locator('dd').filter({ hasText: text })).toHaveCount(3)
      await assertNoInjectedHtml(page, dialogs)
      await detail.getByRole('button', { name: 'Tutup', exact: true }).click()
    }
    await assertNoInjectedHtml(page, dialogs)
  })

  test(`admin renders and resaves ${label} without encoding`, async ({ page }) => {
    const { writes, dialogs } = await setup(page, text, true)
    for (const [resource, tab, singular] of resources) {
      const transaction = ['incomes', 'expenses', 'transfers'].includes(resource)
      const field = transaction ? 'description' : 'name'
      await page.getByRole('tab', { name: tab, exact: true }).click()
      const row = page.locator('tbody tr').first()
      await expect(row.getByText(text, { exact: true }).first()).toBeVisible()
      await row.getByRole('button', { name: 'Detail', exact: true }).click()
      const detail = page.getByRole('dialog', { name: 'Detail data', exact: true })
      await expect(detail.locator('dd').first()).toHaveText(text)
      await assertNoInjectedHtml(page, dialogs)
      await detail.getByRole('button', { name: 'Tutup', exact: true }).click()

      for (let attempt = 0; attempt < 2; attempt++) {
        await row.getByRole('button', { name: 'Edit', exact: true }).click()
        const form = page.getByRole('dialog', { name: 'Edit ' + singular, exact: true })
        const input = form.getByLabel(transaction ? 'Deskripsi (opsional)' : 'Nama', { exact: true })
        await expect(input).toHaveValue(attempt === 0 ? text : text + ' revisi')
        if (transaction) {
          const walletLabels = resource === 'transfers' ? ['Dompet asal', 'Dompet tujuan'] : ['Dompet']
          for (const walletLabel of walletLabels) {
            await expect(form.getByLabel(walletLabel, { exact: true }).locator('option[value="w1"]')).toHaveText(text)
          }
          if (resource !== 'transfers') {
            await expect(form.getByLabel('Kategori (opsional)').locator('option').last()).toHaveText(text)
          }
        }
        await input.fill(text + ' revisi')
        await assertNoInjectedHtml(page, dialogs)
        const before = writes.length
        await form.getByRole('button', { name: 'Simpan', exact: true }).click()
        await expect(form).not.toBeVisible()
        expect(writes).toHaveLength(before + 1)
        expect(writes.at(-1)).toMatchObject({ resource, body: { [field]: text + ' revisi' } })
        await expect(row.getByText(text + ' revisi', { exact: true }).first()).toBeVisible()
        await assertNoInjectedHtml(page, dialogs)
      }
    }
  })
}