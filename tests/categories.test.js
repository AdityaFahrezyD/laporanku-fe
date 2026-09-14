import test from 'node:test'
import assert from 'node:assert/strict'
import { categoriesFor } from '../src/utils/categories.js'
import { transactionPath } from '../src/services/transactions.js'

test('category choices only contain the current type and sort A-Z without mutating records', () => {
  const records = [
    { category_id: 'z', name: 'Zakat', type: 'income' },
    { category_id: 'b', name: 'belanja', type: 'expense' },
    { category_id: 'a', name: 'Angsuran', type: 'income' },
  ]
  assert.deepEqual(categoriesFor('incomes', records).map(row => row.name), ['Angsuran', 'Zakat'])
  assert.deepEqual(categoriesFor('expenses', records).map(row => row.name), ['belanja'])
  assert.deepEqual(categoriesFor('transfers', records), [])
  assert.equal(records[0].name, 'Zakat')
})

test('category participates in the request/cache key together with date, search and pagination', () => {
  const filters = { categoryId: 'cat-a', period: { mode: 'range', start: '2026-09-01', end: '2026-09-30' }, query: 'bonus', page: 2 }
  const path = transactionPath('incomes', filters)
  const params = new URL(path, 'http://test.local').searchParams
  assert.equal(params.get('category_id'), 'cat-a')
  assert.equal(params.get('start_date'), '2026-09-01')
  assert.equal(params.get('q'), 'bonus')
  assert.equal(params.get('page'), '2')
  assert.notEqual(path, transactionPath('incomes', { ...filters, categoryId: 'cat-b' }))
  assert.equal(transactionPath('expenses', {}).includes('category_id'), false)
  assert.equal(transactionPath('transfers', filters).includes('category_id'), false)
})
