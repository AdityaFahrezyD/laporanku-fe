import test from 'node:test'
import assert from 'node:assert/strict'
import { transactionPath, fetchTransactionPage } from '../src/services/transactions.js'
import { fetchDashboard } from '../src/services/dashboard.js'
import { queryFixture } from './queryFixture.js'

test('query parameters preserve literal search and inclusive calendar dates', () => {
  const url = new URL(transactionPath('incomes', { page: 2, query: '100%_ & bonus', period: { mode: 'range', start: '2026-09-01', end: '2026-09-30' } }), 'http://local.test')
  assert.equal(url.searchParams.get('q'), '100%_ & bonus')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('start_date'), '2026-09-01')
  assert.equal(url.searchParams.get('end_date'), '2026-09-30')
  assert.equal(url.searchParams.get('paginated'), '1')
  assert.equal(url.searchParams.get('per_page'), '10')
})

test('a transaction view requests only its paginated type with summary and wallets', async () => {
  const requests = []
  const result = await fetchDashboard({ baseUrl: '', fetcher: async url => {
    requests.push(url)
    return new Response(JSON.stringify(queryFixture({}, url) || { data: [] }))
  } }, { resource: 'expenses', page: 2 })
  assert.deepEqual(requests, ['/api/wallets', '/api/dashboard-summary', '/api/expenses?paginated=1&page=2&per_page=10'])
  assert.equal(result.transactionPage.summary.total_amount, '0.00')
})

test('legacy or malformed pagination responses fail without a full-list fallback', async () => {
  let calls = 0
  await assert.rejects(fetchTransactionPage('incomes', {}, { baseUrl: '', fetcher: async () => {
    calls++
    return new Response(JSON.stringify({ data: [] }))
  } }), /Respons halaman/)
  assert.equal(calls, 1)
})
