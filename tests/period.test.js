import test from 'node:test'
import assert from 'node:assert/strict'
import { dateInWib, filterByPeriod, periodBounds, periodError, periodLabel } from '../src/utils/period.js'
import { sumAmounts } from '../src/utils/format.js'

test('WIB day boundaries include the entire selected day', () => {
  const records = ['2026-09-13T16:59:59.999Z', '2026-09-13T17:00:00Z', '2026-09-14T16:59:59.999Z', '2026-09-14T17:00:00Z']
    .map((transaction_date, id) => ({ id, transaction_date }))
  assert.deepEqual(filterByPeriod(records, { mode: 'range', start: '2026-09-14', end: '2026-09-14' }).map(row => row.id), [1, 2])
  assert.equal(dateInWib('2026-09-13T17:00:00Z'), '2026-09-14')
  assert.equal(dateInWib('invalid'), '')
})

test('weeks start Monday and include Sunday across month and year boundaries', () => {
  for (const now of ['2026-09-13T17:00:00Z', '2026-09-20T16:59:59Z']) {
    assert.deepEqual(periodBounds({ mode: 'this-week' }, now), { start: '2026-09-14', end: '2026-09-20' })
  }
  assert.deepEqual(periodBounds({ mode: 'this-week' }, '2026-09-13T16:59:59Z'), { start: '2026-09-07', end: '2026-09-13' })
  assert.deepEqual(periodBounds({ mode: 'this-week' }, '2026-01-01T00:00:00Z'), { start: '2025-12-29', end: '2026-01-04' })
  assert.deepEqual(periodBounds({ mode: 'this-week' }, '2026-09-01T00:00:00Z'), { start: '2026-08-31', end: '2026-09-06' })
})

test('calendar months handle WIB rollover, leap years and December', () => {
  assert.deepEqual(periodBounds({ mode: 'this-month' }, '2026-08-31T17:00:00Z'), { start: '2026-09-01', end: '2026-09-30' })
  for (const [month, end] of [['2024-02', '29'], ['2026-02', '28'], ['2026-12', '31'], ['9999-12', '31']]) {
    assert.deepEqual(periodBounds({ mode: 'month', month }), { start: `${month}-01`, end: `${month}-${end}` })
  }
})

test('invalid or incomplete dates cannot become an applied filter', () => {
  for (const period of [
    { mode: 'month', month: '2026-13' }, { mode: 'month', month: '0000-02' }, { mode: 'month', month: '' },
    { mode: 'range', start: '2026-02-29', end: '2026-03-01' },
    { mode: 'range', start: '2026-09-15', end: '2026-09-14' },
    { mode: 'range', start: '', end: '2026-09-14' }, { mode: 'unknown' },
  ]) {
    assert.ok(periodError(period))
    assert.throws(() => periodBounds(period), RangeError)
  }
  assert.equal(periodError({ mode: 'range', start: '2024-02-29', end: '2024-02-29' }), '')
})

test('all-time preserves the list and filtered totals include every page with cents precision', () => {
  const records = Array.from({ length: 11 }, (_, id) => ({ id, amount: '10.01', transaction_date: '2026-09-14T00:00:00Z' }))
  const other = { id: 12, amount: '999.99', transaction_date: '2026-08-01T00:00:00Z' }
  const all = [...records, other]
  assert.equal(filterByPeriod(all, { mode: 'all' }), all)
  const filtered = filterByPeriod(all, { mode: 'month', month: '2026-09' })
  assert.equal(filtered.length, 11)
  assert.equal(sumAmounts(filtered), 11011n)
  assert.equal(sumAmounts(filtered.slice(10)), 1001n)
  assert.equal(sumAmounts(filterByPeriod(all, { mode: 'month', month: '2020-01' })), 0n)
  assert.equal(all.length, 12)
})

test('period labels identify the applied dates', () => {
  assert.equal(periodLabel({ mode: 'this-month' }), 'Bulan ini')
  assert.equal(periodLabel({ mode: 'this-week' }), 'Minggu ini')
  assert.equal(periodLabel({ mode: 'all' }), 'Semua waktu')
  assert.equal(periodLabel({ mode: 'month', month: '2026-08' }), 'Agu 2026')
  assert.equal(periodLabel({ mode: 'range', start: '2026-09-14', end: '2026-09-14' }), '14 Sep 2026')
  assert.equal(periodLabel({ mode: 'range', start: '2025-12-31', end: '2026-01-01' }), '31 Des 2025 – 1 Jan 2026')
})
