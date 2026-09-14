import { test, expect } from '@playwright/test'
import { queryFixture } from '../queryFixture.js'

const keys = { incomes: 'income_id', expenses: 'expense_id', transfers: 'transfer_id' }
const labels = { guest: { incomes: 'Pemasukan', expenses: 'Pengeluaran', transfers: 'Transfer' }, admin: { incomes: 'Income', expenses: 'Expenses', transfers: 'Transfer' } }
const total = page => page.getByRole('status', { name: 'Total hasil filter' })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

async function setup(page, role) {
  await page.clock.setFixedTime(new Date('2026-09-14T03:00:00Z'))
  const wallet = { wallet_id: 'w1', name: 'Bank', type: 'bank', balance: '1000.00', is_active: true }
  const db = { wallets: [wallet], categories: [] }
  for (const resource of Object.keys(keys)) db[resource] = Array.from({ length: 12 }, (_, i) => ({
    [keys[resource]]: resource + '-' + i, amount: '10.00', description: `${resource} item ${i}`, transaction_date: '2026-09-14T03:00:00Z',
    wallet_id: 'w1', from_wallet_id: 'w1', to_wallet_id: 'w1', attachments: [], income_wallet: wallet, expense_wallet: wallet, transfer_from: wallet, transfer_to: wallet,
  }))
  const state = { requests: [], error: null, gate: null }
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'token', url: 'http://127.0.0.1:5178' }])
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const [, resource, id] = url.pathname.split('/').filter(Boolean)
    if (resource === 'user') return route.fulfill({ status: role === 'admin' ? 200 : 401, json: { id: 'a1', role, name: 'Admin' } })
    state.requests.push({ resource, query: url.search, method: route.request().method() })
    if (state.error) return route.fulfill({ status: state.error, headers: { 'Retry-After': '60' }, json: {} })
    if (route.request().method() === 'DELETE') {
      db[resource] = db[resource].filter(row => row[keys[resource]] !== id)
      return route.fulfill({ json: {} })
    }
    const body = queryFixture(db, url.href) || { data: id ? db[resource].find(row => row[keys[resource]] === id) : db[resource] }
    const gate = state.gate
    if (gate?.resource === resource && !id) {
      gate.started.resolve()
      await gate.wait.promise
    }
    await route.fulfill({ json: body })
  })
  await page.goto('/#incomes')
  await expect(total(page)).toContainText('Rp 120')
  await expect(page.getByText('Memperbarui…', { exact: true })).toHaveCount(0)
  const count = resource => state.requests.filter(r => r.resource === resource && r.method === 'GET').length
  const hold = resource => {
    const gate = { resource, started: deferred(), wait: deferred() }
    state.gate = gate
    return { started: gate.started.promise, release: () => { state.gate = null; gate.wait.resolve() } }
  }
  return { db, state, count, hold }
}

async function navigate(page, role, resource) {
  if (role === 'admin') await page.getByRole('tab', { name: labels[role][resource], exact: true }).click()
  else await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: labels[role][resource], exact: true }).click()
}

for (const role of ['guest', 'admin']) {
  test(`${role}: navigation reuses fresh pages and does not reload master data`, async ({ page }) => {
    const { count, hold } = await setup(page, role)
    expect(count('incomes')).toBe(1)
    expect(count('wallets')).toBe(1)
    expect(count('dashboard-summary')).toBe(1)
    if (role === 'admin') await page.getByText('Total income', { exact: true }).evaluate(el => { el.dataset.persisted = 'yes' })
    const gate = hold('expenses')
    try {
      await navigate(page, role, 'expenses')
      await gate.started
      await expect(total(page)).toHaveCount(0)
      if (role === 'admin') await expect(page.getByText('Total income', { exact: true })).toHaveAttribute('data-persisted', 'yes')
      await navigate(page, role, 'incomes')
      await expect(total(page)).toContainText('Rp 120')
      expect(count('incomes')).toBe(1)
      gate.release()
      await navigate(page, role, 'expenses')
      await expect(total(page)).toContainText('Rp 120')
      expect(count('expenses')).toBe(1)
      expect(count('wallets')).toBe(1)
      expect(count('dashboard-summary')).toBe(1)
      expect(count('categories')).toBe(role === 'admin' ? 1 : 0)
      await page.getByRole('button', { name: 'Berikutnya', exact: true }).click()
      await expect(page.locator('tbody tr')).toHaveCount(2)
      await page.getByRole('button', { name: 'Sebelumnya', exact: true }).click()
      await expect(page.locator('tbody tr')).toHaveCount(10)
      expect(count('expenses')).toBe(2)
    } finally { gate.release() }
  })

  test(`${role}: stale results remain visible and refresh once in the background`, async ({ page }) => {
    const { db, count, hold } = await setup(page, role)
    await navigate(page, role, 'expenses')
    await expect(total(page)).toContainText('Rp 120')
    for (const row of db.incomes) row.amount = '20.00'
    await page.clock.setFixedTime(new Date('2026-09-14T03:01:01Z'))
    const gate = hold('incomes')
    try {
      await navigate(page, role, 'incomes')
      await gate.started
      await expect(total(page)).toContainText('Rp 120')
      await expect(page.getByText('Memperbarui…', { exact: true })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(10)
      await navigate(page, role, 'expenses')
      await navigate(page, role, 'incomes')
      expect(count('incomes')).toBe(2)
      gate.release()
      await expect(total(page)).toContainText('Rp 240')
      expect(count('wallets')).toBe(2)
      expect(count('dashboard-summary')).toBe(2)
      db.incomes[0].amount = '30.00'
      await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
      await expect(total(page)).toContainText('Rp 250')
      expect(count('incomes')).toBe(3)
    } finally { gate.release() }
  })

  test(`${role}: cooldown preserves visited results and blocks new requests`, async ({ page }) => {
    const { state } = await setup(page, role)
    await navigate(page, role, 'expenses')
    await expect(total(page)).toContainText('Rp 120')
    state.error = 429
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(total(page)).toContainText('Rp 120')
    const before = state.requests.length
    await navigate(page, role, 'incomes')
    await expect(total(page)).toContainText('Rp 120')
    await navigate(page, role, 'transfers')
    await expect(total(page)).toHaveCount(0)
    expect(state.requests).toHaveLength(before)
    state.error = null
    await page.clock.setFixedTime(new Date('2026-09-14T03:01:01Z'))
    await expect(page.getByRole('button', { name: 'Muat ulang', exact: true })).toBeEnabled()
    expect(state.requests).toHaveLength(before)
    await page.getByRole('button', { name: 'Muat ulang', exact: true }).click()
    await expect(total(page)).toContainText('Rp 120')
    const afterRetry = state.requests.length
    await page.reload()
    await expect(total(page)).toContainText('Rp 120')
    expect(state.requests.length).toBeGreaterThan(afterRetry)
  })
}

test('admin mutation invalidates visited pages and retains active data while updating', async ({ page }) => {
  const { db, count, hold } = await setup(page, 'admin')
  await navigate(page, 'admin', 'expenses')
  await expect(total(page)).toContainText('Rp 120')
  await navigate(page, 'admin', 'incomes')
  db.expenses[0].amount = '20.00'
  const gate = hold('incomes')
  try {
    await page.getByRole('button', { name: 'Hapus', exact: true }).first().click()
    await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click()
    await gate.started
    await expect(total(page)).toContainText('Rp 120')
    await expect(page.getByText('Memperbarui…', { exact: true })).toBeVisible()
    gate.release()
    await expect(total(page)).toContainText('Rp 110')
    await navigate(page, 'admin', 'expenses')
    await expect(total(page)).toContainText('Rp 130')
    expect(count('expenses')).toBe(2)
  } finally { gate.release() }
})

test('admin form keeps unsaved fields and wallet choices during a slow refresh', async ({ page }) => {
  const { hold } = await setup(page, 'admin')
  await page.getByRole('button', { name: '+ Tambah income', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Tambah income', exact: true })
  await form.getByLabel('Dompet', { exact: true }).selectOption('w1')
  await form.getByLabel('Deskripsi (opsional)', { exact: true }).fill('Belum disimpan')
  const gate = hold('dashboard-summary')
  try {
    // Simulate a refresh notification while a form owns the modal focus trap.
    await page.getByRole('button', { name: 'Muat ulang', exact: true, includeHidden: true }).evaluate(el => el.click())
    await gate.started
    await expect(form.getByLabel('Deskripsi (opsional)', { exact: true })).toHaveValue('Belum disimpan')
    await expect(form.getByLabel('Dompet', { exact: true })).toHaveValue('w1')
    gate.release()
    await expect(page.getByRole('button', { name: 'Muat ulang', exact: true, includeHidden: true })).toBeEnabled()
    await expect(form.getByLabel('Deskripsi (opsional)', { exact: true })).toHaveValue('Belum disimpan')
  } finally { gate.release() }
})
