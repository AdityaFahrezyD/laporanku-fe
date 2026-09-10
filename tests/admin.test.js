import test from 'node:test'
import assert from 'node:assert/strict'
import { dateInput, payload, mutate, uploadAttachment, fetchAdminData } from '../src/services/admin.js'

test('transaction payload uses WIB and preserves decimal strings', () => {
  assert.equal(dateInput('2026-09-10T20:15:00Z'), '2026-09-11T03:15')
  const result = payload('incomes', { amount: '9999999999999.99', description: '', transaction_date: '2026-09-11T03:15', wallet_id: 'wallet', category_id: '' })
  assert.deepEqual(result, { amount: '9999999999999.99', description: null, transaction_date: '11-09-2026 03:15', wallet_id: 'wallet', category_id: null })
  const transfer = payload('transfers', { amount: '10.00', transaction_date: '2026-09-11T03:15', from_wallet_id: 'a', to_wallet_id: 'b' })
  assert.equal(transfer.from_wallet_id, 'a')
  assert.equal(transfer.to_wallet_id, 'b')
  assert.equal('category_id' in transfer, false)
})
test('wallet updates never send balance and deactivation is boolean', () => {
  assert.deepEqual(payload('wallets', { name: ' Bank ', type: 'bank', balance: '100', is_active: false }, true), { name: 'Bank', type: 'bank', is_active: false })
})
test('attachment request uses FormData without JSON content type and carries CSRF', async () => {
  const calls = []
  const options = { baseUrl: '', cookie: 'XSRF-TOKEN=abc%2B123', fetcher: async (url, request) => {
    calls.push(url)
    if (url === '/sanctum/csrf-cookie') return new Response(null, { status: 204 })
    assert.equal(request.method, 'POST')
    assert.equal(request.credentials, 'include')
    assert.equal(request.headers['Content-Type'], undefined)
    assert.equal(request.headers['X-XSRF-TOKEN'], 'abc+123')
    assert.ok(request.body instanceof FormData)
    assert.equal(request.body.get('image').name, 'receipt.png')
    return new Response(JSON.stringify({ data: { attachment_id: 'attachment' } }))
  } }
  await uploadAttachment('incomes', 'id', new File(['bytes'], 'receipt.png', { type: 'image/png' }), options)
  assert.deepEqual(calls, ['/sanctum/csrf-cookie', '/api/incomes/id/attachments'])
})
test('missing CSRF stops mutations and 422 keeps backend field errors', async () => {
  let writes = 0
  await assert.rejects(mutate('/api/incomes', 'POST', {}, { cookie: '', fetcher: async () => new Response(null, { status: 204 }) }), (e) => e.status === 419)
  await assert.rejects(mutate('/api/incomes', 'POST', {}, { cookie: 'XSRF-TOKEN=abc', baseUrl: '', fetcher: async (url) => {
    if (url === '/sanctum/csrf-cookie') return new Response(null, { status: 204 })
    writes++
    return new Response(JSON.stringify({ errors: { amount: ['Saldo tidak cukup.'] } }), { status: 422 })
  } }), (e) => e.errors.amount[0] === 'Saldo tidak cukup.')
  assert.equal(writes, 1)
})
test('admin load includes categories and rejects partial results', async () => {
  const paths = []
  const data = await fetchAdminData({ baseUrl: '', fetcher: async (url) => { paths.push(url); return new Response('{"data":[]}') } })
  assert.equal(paths.length, 5)
  assert.deepEqual(data.categories, [])
  await assert.rejects(fetchAdminData({ baseUrl: '', fetcher: async (url) => url.endsWith('categories') ? new Response('{}', { status: 500 }) : new Response('{"data":[]}') }))
})
