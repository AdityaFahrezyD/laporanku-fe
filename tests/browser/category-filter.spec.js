import { test, expect } from '@playwright/test'
import { queryFixture } from '../queryFixture.js'

const kinds = ['incomes', 'expenses']
const total = page => page.getByRole('status', { name: 'Total hasil filter' })
const select = page => page.getByRole('combobox', { name: 'Filter kategori', exact: true })
const labels = { guest: { incomes: 'Pemasukan', expenses: 'Pengeluaran', transfers: 'Transfer' }, admin: { incomes: 'Income', expenses: 'Expenses', transfers: 'Transfer' } }

async function setup(page, role, resource = 'incomes') {
  await page.clock.setFixedTime(new Date('2026-09-14T03:00:00Z'))
  const wallet = { wallet_id: 'w1', name: 'Bank', type: 'bank', balance: '1000.00', is_active: true }
  const db = { wallets: [wallet], transfers: [], categories: [] }
  for (const kind of kinds) {
    const type = kind.slice(0, -1)
    db.categories.push(
      { category_id: kind + '-z', name: 'Zeta ' + type, type },
      { category_id: kind + '-a', name: 'Alpha ' + type, type },
      { category_id: kind + '-empty', name: 'Belum dipakai ' + type, type },
    )
    const key = type + '_id'
    const record = (id, category, amount, date = '2026-09-14T03:00:00Z') => ({
      [key]: kind + '-' + id, category_id: category, description: 'item ' + id, amount, transaction_date: date,
      wallet_id: 'w1', income_wallet: wallet, expense_wallet: wallet, attachments: [],
    })
    db[kind] = Array.from({ length: 12 }, (_, i) => record(String(i), kind + '-a', '10.00'))
    db[kind].push(record('z', kind + '-z', '50.00'), record('old', kind + '-a', '30.00', '2026-08-14T03:00:00Z'), record('uncategorized', null, '5.00'))
  }
  const requests = []
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const key = url.pathname.split('/').pop()
    if (key === 'user') return route.fulfill({ status: role === 'admin' ? 200 : 401, json: { id: 'admin', role, name: 'Admin' } })
    requests.push(url)
    return route.fulfill({ json: queryFixture(db, url.href) || { data: db[key] || [] } })
  })
  await page.goto('/#' + resource)
  await expect(total(page)).toContainText('Rp 205')
  await expect(select(page)).toBeEnabled()
  return { db, requests }
}

async function navigate(page, role, resource) {
  if (role === 'admin') await page.getByRole('tab', { name: labels[role][resource], exact: true }).click()
  else await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: labels[role][resource], exact: true }).click()
}

for (const role of ['guest', 'admin']) {
  for (const resource of kinds) {
    test(`${role} ${resource}: category and period combine with search, totals and pagination`, async ({ page }) => {
      const { requests } = await setup(page, role, resource)
      const type = resource.slice(0, -1)
      await expect(select(page).locator('option')).toHaveText(['Semua kategori', 'Alpha ' + type, 'Belum dipakai ' + type, 'Zeta ' + type])
      await expect(select(page)).toHaveValue('')
      await select(page).selectOption(resource + '-a')
      await expect(total(page)).toContainText('Rp 150')
      await page.getByRole('button', { name: /^Filter periode:/ }).click()
      const dialog = page.getByRole('dialog', { name: 'Filter periode' })
      await dialog.getByRole('radio', { name: 'Bulan ini', exact: true }).check()
      await dialog.getByRole('button', { name: 'Terapkan' }).click()
      await expect(total(page)).toContainText('Rp 120')
      await page.getByRole('button', { name: 'Berikutnya', exact: true }).click()
      await expect(page.locator('tbody tr')).toHaveCount(2)
      await expect(total(page)).toContainText('Rp 120')
      const secondPage = requests.find(url => url.searchParams.get('page') === '2' && url.searchParams.get('category_id') === resource + '-a')
      expect(secondPage.searchParams.get('start_date')).toBe('2026-09-01')
      await select(page).selectOption(resource + '-z')
      await expect(total(page)).toContainText('Rp 50')
      await expect(page.getByText('Halaman 1 dari 1')).toBeVisible()
      await select(page).selectOption(resource + '-empty')
      await expect(total(page)).toContainText('Rp 0')
      await expect(page.getByText('Tidak ada transaksi pada filter ini')).toBeVisible()
      await select(page).selectOption(resource + '-a')
      const search = page.getByRole('textbox', { name: role === 'guest' ? 'Cari transaksi' : 'Cari ' + labels[role][resource] })
      await search.fill('item 0')
      await expect(total(page)).toContainText('Rp 10')
      await expect(page.locator('tbody tr')).toHaveCount(1)
      await search.fill('')
      await expect(total(page)).toContainText('Rp 120')
      await select(page).selectOption('')
      await expect(total(page)).toContainText('Rp 175')
      const other = resource === 'incomes' ? 'expenses' : 'incomes'
      await navigate(page, role, other)
      await expect(select(page)).toHaveValue('')
      await expect(select(page).locator('option')).toHaveText(['Semua kategori', 'Alpha ' + other.slice(0, -1), 'Belum dipakai ' + other.slice(0, -1), 'Zeta ' + other.slice(0, -1)])
      await expect(total(page)).toContainText('Rp 175')
      await navigate(page, role, 'transfers')
      await expect(select(page)).toHaveCount(0)
      expect(requests.filter(url => url.pathname === '/api/categories')).toHaveLength(1)
      expect(requests.filter(url => url.pathname === '/api/transfers').every(url => !url.searchParams.has('category_id'))).toBe(true)
    })
  }

  test(`${role}: cached categories stay separate and a deleted selection resets on refresh`, async ({ page }) => {
    const { db, requests } = await setup(page, role)
    await select(page).selectOption('incomes-z')
    await expect(total(page)).toContainText('Rp 50')
    await select(page).selectOption('incomes-a')
    await expect(total(page)).toContainText('Rp 150')
    const before = requests.length
    await select(page).selectOption('incomes-z')
    await expect(total(page)).toContainText('Rp 50')
    expect(requests).toHaveLength(before)
    await select(page).selectOption('incomes-empty')
    await expect(total(page)).toContainText('Rp 0')
    db.categories = db.categories.filter(row => row.category_id !== 'incomes-empty')
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(select(page)).toHaveValue('')
    await expect(total(page)).toContainText('Rp 205')
    db.categories.push({ category_id: 'new', name: 'Abadi income', type: 'income' })
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(select(page).locator('option')).toHaveText(['Semua kategori', 'Abadi income', 'Alpha income', 'Zeta income'])
  })

  test(`${role}: category dropdown fits a 320px screen`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await setup(page, role)
    await select(page).selectOption('incomes-z')
    await expect(total(page)).toContainText('Rp 50')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    const box = await select(page).boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
  })
}
