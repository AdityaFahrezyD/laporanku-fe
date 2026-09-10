import test from 'node:test'
import assert from 'node:assert/strict'
import { getJson } from '../src/services/api.js'
import { fetchDashboard, latestTransactions } from '../src/services/dashboard.js'
import { wallets, incomes, expenses, transfers } from '../src/data/dashboardMock.js'
import { formatDate, formatRupiah, sumAmounts } from '../src/utils/format.js'

const fixture = { wallets, incomes, expenses, transfers }
const json = (data) => new Response(JSON.stringify({ message: 'OK', data }), { status: 200 })

test('reads four public resources with cookies and the Laravel envelope', async () => {
  const requests = []
  const data = await fetchDashboard({ baseUrl: 'http://backend.test/', fetcher: async (url, options) => {
    requests.push(url)
    assert.equal(options.credentials, 'include')
    assert.equal(options.headers.Accept, 'application/json')
    assert.equal(options.method, 'GET')
    return json(fixture[url.split('/').at(-1)])
  } })
  assert.equal(requests.length, 4)
  assert.ok(requests.every((url) => url.startsWith('http://backend.test/api/')))
  assert.equal(sumAmounts(data.wallets, 'balance'), 1026500000n)
  assert.equal(sumAmounts(data.incomes), 1025000000n)
  assert.equal(sumAmounts(data.expenses), 98500000n)
  assert.equal(latestTransactions(data).length, 5)
  assert.equal(latestTransactions(data)[0].id, expenses[0].expense_id)
})

test('empty lists are a successful empty dashboard', async () => {
  const data = await fetchDashboard({ fetcher: async () => json([]) })
  assert.deepEqual(latestTransactions(data), [])
  assert.equal(sumAmounts(data.wallets, 'balance'), 0n)
})

test('failed list rejects the whole result and hides backend debug content', async () => {
  await assert.rejects(fetchDashboard({ fetcher: async (url) => url.endsWith('expenses')
    ? new Response(JSON.stringify({ message: 'SQL password=private', trace: [] }), { status: 500 })
    : json(fixture[url.split('/').at(-1)]) }), (error) => error.status === 500 && !error.message.includes('SQL'))
})

test('429 takes precedence and retains the longest Retry-After without retries', async () => {
  let calls = 0
  const start = Date.now()
  await assert.rejects(fetchDashboard({ fetcher: async (url) => {
    calls++
    return new Response('{}', { status: 429, headers: { 'Retry-After': url.endsWith('wallets') ? '90' : '30' } })
  } }), (error) => error.status === 429 && error.retryAt >= start + 90000)
  assert.equal(calls, 4)
})

test('network errors, HTML and malformed monetary data reject gracefully', async () => {
  await assert.rejects(getJson('/api/wallets', { fetcher: async () => { throw new TypeError('Failed to fetch') } }), /Tidak dapat terhubung/)
  await assert.rejects(getJson('/api/wallets', { fetcher: async () => new Response('<html>Login</html>') }), /Respons server tidak valid/)
  await assert.rejects(fetchDashboard({ fetcher: async (url) => json(url.endsWith('wallets') ? [{ ...wallets[0], balance: 'not-money' }] : []) }), /Format data/)
})

test('nullable relations survive normalization and inactive wallets retain balances', () => {
  const data = { wallets: [{ ...wallets[0], is_active: false }], incomes: [{ ...incomes[0], category: null, description: null, income_wallet: null }], expenses: [], transfers: [{ ...transfers[0], transfer_from: null }] }
  assert.equal(latestTransactions(data)[0].walletName, 'Dompet tidak tersedia')
  assert.equal(sumAmounts(data.wallets, 'balance'), 902500000n)
})

test('decimal amounts preserve cents and UTC dates display in WIB', () => {
  assert.equal(formatRupiah(sumAmounts([{ amount: '9999999999999.99' }, { amount: '0.01' }])), 'Rp 10.000.000.000.000')
  assert.equal(formatRupiah('750000.25'), 'Rp 750.000,25')
  assert.match(formatDate('2026-09-10T20:30:00.000000Z', true), /11 Sep 2026.*03\.30 WIB/)
})
