import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

async function setup(page, role = 'admin', failSecond = false) {
  const db = { incomes: [], expenses: [], transfers: [], wallets: [
    { wallet_id: 'w1', name: 'Bank Utama', type: 'bank', balance: '1000.00', is_active: true },
    { wallet_id: 'w2', name: 'Tunai', type: 'cash', balance: '100.00', is_active: true },
  ], categories: [{ category_id: 'c1', name: 'Gaji', type: 'income' }, { category_id: 'c2', name: 'Belanja', type: 'expense' }] }
  const keys = { incomes: 'income_id', expenses: 'expense_id', transfers: 'transfer_id', wallets: 'wallet_id', categories: 'category_id' }
  const writes = []
  let uploads = 0
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'token', url: 'http://127.0.0.1:5178' }])
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    if (request.resourceType() === 'document') return route.continue()
    const parts = new URL(request.url()).pathname.split('/').filter(Boolean)
    const [, resource, id, attachments, attachmentId] = parts
    const method = request.method()
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (resource === 'user') return role ? reply({ id: 'admin', role, name: 'Administrator' }) : reply({}, 401)
    if (resource === 'logout') return route.fulfill({ status: 204 })
    if (!db[resource]) return reply({}, 404)
    if (method !== 'GET') writes.push({ resource, method, id, attachmentId, body: attachments ? request.postData() : request.postDataJSON() })
    const row = db[resource].find((r) => r[keys[resource]] === id)
    if (attachments) {
      if (method === 'POST') {
        uploads++
        if (failSecond && uploads === 2) return reply({ errors: { image: ['Gambar kedua gagal divalidasi.'] } }, 422)
        const a = { attachment_id: 'a' + uploads, url: null, mime_type: 'image/avif', size: 123, width: 1, height: 1 }
        row.attachments.push(a)
        return reply({ data: a }, 201)
      }
      if (method === 'DELETE') { row.attachments = row.attachments.filter((a) => a.attachment_id !== attachmentId); return route.fulfill({ status: 204 }) }
    }
    if (method === 'GET') return reply({ data: id ? row : db[resource] })
    if (method === 'DELETE') { db[resource] = db[resource].filter((r) => r[keys[resource]] !== id); return reply({ message: 'Dihapus' }) }
    const body = request.postDataJSON()
    if (method === 'PATCH') { Object.assign(row, body); return reply({ data: row }) }
    const created = { ...body, [keys[resource]]: resource + (db[resource].length + 1), attachments: [], transaction_date: '2026-09-10T03:00:00Z', income_wallet: db.wallets[0], expense_wallet: db.wallets[0], transfer_from: db.wallets[0], transfer_to: db.wallets[1] }
    db[resource].push(created)
    return reply({ data: created }, 201)
  })
  await page.goto('/')
  return { db, writes }
}

test('money input formats typing, preserves caret and blocks invalid submissions', async ({ page }) => {
  const { writes } = await setup(page)
  await page.getByRole('button', { name: '+ Tambah income', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Tambah income', exact: true })
  await form.getByLabel('Dompet', { exact: true }).selectOption('w1')
  const amount = form.getByLabel('Nominal (Rp)', { exact: true })
  await amount.pressSequentially('1000000')
  await expect(amount).toHaveValue('1.000.000')
  await amount.evaluate((el) => el.setSelectionRange(2, 2))
  await amount.press('Backspace')
  await expect(amount).toHaveValue('000.000')
  expect(await amount.evaluate((el) => el.selectionStart)).toBe(0)
  await amount.fill('12345')
  await amount.evaluate((el) => el.setSelectionRange(1, 1))
  await amount.pressSequentially('9')
  await expect(amount).toHaveValue('192.345')
  expect(await amount.evaluate((el) => el.selectionStart)).toBe(2)
  await amount.evaluate((el) => el.setSelectionRange(3, 3))
  await amount.press('Delete')
  await expect(amount).toHaveValue('19.245')
  await amount.evaluate((el) => el.setSelectionRange(0, el.value.length))
  await amount.pressSequentially('1000,50')
  await expect(amount).toHaveValue('1.000,50')
  for (const invalid of ['', '0', '-1', '1,234', '10000000000000', 'abc']) {
    await amount.fill(invalid)
    await form.getByRole('button', { name: 'Simpan', exact: true }).click()
    expect(await amount.evaluate((el) => el.validity.valid)).toBe(false)
    expect(writes).toHaveLength(0)
  }
  await amount.fill('9.999.999.999.999,99')
  expect(await amount.evaluate((el) => el.validity.valid)).toBe(true)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(() => navigator.clipboard.writeText('1.000,50'))
  await amount.selectText()
  await amount.press('Control+v')
  await expect(amount).toHaveValue('1.000,50')
  await form.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(form).not.toBeVisible()
  expect(writes[0].body.amount).toBe('1000.50')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Nominal (Rp)', { exact: true })).toHaveValue('1.000,50')
})

test('admin tabs create income and retry only failed attachment then edit and delete', async ({ page }) => {
  const { writes } = await setup(page, 'admin', true)
  await expect(page.getByRole('tab')).toHaveCount(5)
  await page.getByRole('button', { name: '+ Tambah income', exact: true }).click()
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Tambah income', exact: true }) })
  await dialog.getByLabel('Dompet', { exact: true }).selectOption('w1')
  await dialog.getByLabel('Nominal (Rp)', { exact: true }).fill('25,50')
  await dialog.getByLabel('Kategori (opsional)', { exact: true }).selectOption('c1')
  await expect(dialog.locator('input[type=file]')).toHaveCount(1)
  await dialog.getByRole('button', { name: '+ Tambah gambar' }).click()
  await expect(dialog.locator('input[type=file]')).toHaveCount(2)
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2; return canvas.toDataURL('image/png').split(',')[1] })
  for (let i = 0; i < 2; i++) {
    await dialog.locator('input[type=file]').nth(i).setInputFiles({ name: 'receipt' + i + '.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
    await expect(dialog.getByText('receipt' + i + '.png', { exact: true })).toBeVisible()
  }
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(dialog.getByText('Gambar kedua gagal divalidasi.')).toBeVisible()
  await expect(dialog.locator('input[type=file]')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Lanjutkan upload' }).click()
  await expect(dialog).not.toBeVisible()
  expect(writes.filter((w) => w.resource === 'incomes' && w.method === 'POST' && !w.id)).toHaveLength(1)
  expect(writes.filter((w) => typeof w.body === 'string')).toHaveLength(3)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit income', exact: true })
  await expect(edit.getByLabel('Nominal (Rp)', { exact: true })).toHaveValue('25,50')
  await edit.getByLabel('Nominal (Rp)', { exact: true }).fill('30,00')
  await edit.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(edit).not.toBeVisible()
  expect(writes.find((w) => w.method === 'PATCH').body.amount).toBe('30.00')
  await page.getByRole('button', { name: 'Hapus', exact: true }).click()
  await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click()
  await expect(page.getByText('Belum ada data. Mulai dengan tombol tambah.')).toBeVisible()
})

test('wallet edit deactivates without balance and category CRUD is available on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { writes } = await setup(page)
  await page.getByRole('tab', { name: 'Dompet', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Hapus', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Edit dompet', exact: true })
  await expect(dialog.getByLabel('Saldo awal (Rp)')).toHaveCount(0)
  await dialog.getByLabel('Dompet aktif').uncheck()
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(writes[0].body.is_active).toBe(false)
  expect(writes[0].body.balance).toBeUndefined()
  await page.getByRole('tab', { name: 'Kategori', exact: true }).click()
  await page.getByRole('button', { name: '+ Tambah kategori', exact: true }).click()
  await page.getByRole('dialog', { name: 'Tambah kategori' }).getByLabel('Nama', { exact: true }).fill('Bonus')
  await page.getByRole('dialog', { name: 'Tambah kategori' }).getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Bonus', exact: true })).toBeVisible()
})
test('guest retains public dashboard and cannot see CRUD tabs', async ({ page }) => {
  await setup(page, null)
  await expect(page.getByRole('heading', { name: 'Ringkasan keuangan' })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Tambah/ })).toHaveCount(0)
})

test('all admin menu items remain reachable above the fixed footer on a short screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 400 })
  await setup(page)
  await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
  const drawer = page.getByRole('dialog', { name: 'Menu navigasi' })
  const menu = drawer.getByRole('navigation', { name: 'Navigasi utama' })
  await expect(menu.getByRole('link')).toHaveCount(5)
  const footer = await drawer.locator('.sidebar-footer').boundingBox()
  await menu.getByRole('link', { name: 'Kategori', exact: true }).focus()
  const last = await menu.getByRole('link', { name: 'Kategori', exact: true }).boundingBox()
  expect(last.y + last.height).toBeLessThanOrEqual(footer.y)
  await page.keyboard.press('Enter')
  await expect(drawer).not.toBeVisible()
  await expect(page.getByRole('button', { name: '+ Tambah kategori', exact: true })).toBeVisible()
})

for (const [label, resource, singular] of [['Expenses', 'expenses', 'expense'], ['Transfer', 'transfers', 'transfer']]) {
  test(label + ' supports create detail edit and delete with attachment slots', async ({ page }) => {
    const { writes } = await setup(page)
    await page.getByRole('tab', { name: label, exact: true }).click()
    await page.getByRole('button', { name: '+ Tambah ' + singular, exact: true }).click()
    const form = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Tambah ' + singular, exact: true }) })
    if (resource === 'transfers') {
      await form.getByLabel('Dompet asal', { exact: true }).selectOption('w1')
      await expect(form.getByLabel('Dompet tujuan', { exact: true }).locator('option[value=w1]')).toBeDisabled()
      await form.getByLabel('Dompet tujuan', { exact: true }).selectOption('w2')
      await expect(form.getByLabel('Kategori (opsional)', { exact: true })).toHaveCount(0)
    } else {
      await form.getByLabel('Dompet', { exact: true }).selectOption('w1')
      await form.getByLabel('Kategori (opsional)', { exact: true }).selectOption('c2')
      await expect(form.getByLabel('Kategori (opsional)', { exact: true }).locator('option[value=c1]')).toHaveCount(0)
    }
    await form.getByLabel('Nominal (Rp)', { exact: true }).fill('50,25')
    await form.getByLabel('Deskripsi (opsional)', { exact: true }).fill('Bukti ' + label)
    await expect(form.locator('input[type=file]')).toHaveCount(1)
    await form.getByRole('button', { name: '+ Tambah gambar' }).click()
    await expect(form.locator('input[type=file]')).toHaveCount(2)
    await form.getByRole('button', { name: 'Hapus slot' }).last().click()
    await form.getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(form).not.toBeVisible()
    await page.getByRole('button', { name: 'Detail', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bukti transaksi', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Tutup', exact: true }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Nominal (Rp)', { exact: true }).fill('40,00')
    await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(writes.find((w) => w.resource === resource && w.method === 'PATCH').body.amount).toBe('40.00')
    await page.screenshot({ path: 'test-results/admin-' + resource + '.png', fullPage: true })
    await page.getByRole('button', { name: 'Hapus', exact: true }).click()
    await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click()
    await expect(page.getByText('Belum ada data. Mulai dengan tombol tambah.')).toBeVisible()
  })
}
test('wallet create sends initial balance and category edit/delete use their APIs', async ({ page }) => {
  const { writes } = await setup(page)
  await page.getByRole('tab', { name: 'Dompet', exact: true }).click()
  await page.getByRole('button', { name: '+ Tambah dompet', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Nama', { exact: true }).fill('Tabungan')
  await page.getByRole('dialog').getByLabel('Saldo awal (Rp)', { exact: true }).fill('0')
  expect(await page.getByRole('dialog').getByLabel('Saldo awal (Rp)', { exact: true }).evaluate((el) => el.validity.valid)).toBe(true)
  await page.getByRole('dialog').getByLabel('Saldo awal (Rp)', { exact: true }).fill('500,50')
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Tabungan', exact: true })).toBeVisible()
  expect(writes[0].body.balance).toBe('500.50')
  await page.getByRole('tab', { name: 'Kategori', exact: true }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
  await page.getByRole('dialog').getByLabel('Nama', { exact: true }).fill('Penghasilan')
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Penghasilan', exact: true })).toBeVisible()
  await page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Penghasilan', exact: true }) }).getByRole('button', { name: 'Hapus', exact: true }).click()
  await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Penghasilan', exact: true })).toHaveCount(0)
})

test('cancelling file selection preserves the form and existing attachment selection', async ({ page }) => {
  const { writes } = await setup(page)
  await page.getByRole('button', { name: '+ Tambah income', exact: true }).click()
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Tambah income', exact: true }) })
  await dialog.getByLabel('Nominal (Rp)', { exact: true }).fill('75,50')
  const input = dialog.locator('input[type=file]')
  // Native file chooser UI is outside browser automation; emit its cancel event.
  await input.dispatchEvent('cancel', { bubbles: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Nominal (Rp)', { exact: true })).toHaveValue('75,50')
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2; return canvas.toDataURL('image/png').split(',')[1] })
  await input.setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await expect(dialog.getByText('receipt.png', { exact: true })).toBeVisible()
  await input.dispatchEvent('cancel', { bubbles: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('receipt.png', { exact: true })).toBeVisible()
  expect(writes).toHaveLength(0)
  await dialog.getByLabel('Nominal (Rp)', { exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})
