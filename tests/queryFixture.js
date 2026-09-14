const kinds = ['incomes', 'expenses', 'transfers']
const cents = value => { const [a, b = ''] = String(value).split('.'); return BigInt(a) * 100n + BigInt(b.padEnd(2, '0')) }
const money = value => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`
const sum = (rows, key = 'amount') => money(rows.reduce((a, r) => a + cents(r[key]), 0n))
const ordered = rows => [...rows].sort((a, b) => Date.parse(b.transaction_date) - Date.parse(a.transaction_date) || a.id.localeCompare(b.id) || a.type.localeCompare(b.type))
export function queryFixture(db, address) {
  const url = new URL(address, 'http://example.test')
  const resource = url.pathname.split('/').pop()
  if (resource === 'dashboard-summary') {
    const latest = ordered(kinds.flatMap(key => (db[key] || []).map(row => ({ ...row, id: row[key.slice(0, -1) + '_id'], type: key.slice(0, -1) })))).slice(0, 5)
    return { data: { latest, totals: { balance: sum(db.wallets || [], 'balance'), ...Object.fromEntries(kinds.map(key => [key, sum(db[key] || [])])) }, counts: Object.fromEntries(kinds.map(key => [key, (db[key] || []).length])) } }
  }
  if (!kinds.includes(resource) || !url.searchParams.has('paginated')) return null
  let rows = (db[resource] || []).map(row => ({ ...row, id: row[resource.slice(0, -1) + '_id'], type: resource.slice(0, -1) }))
  if (url.searchParams.has('category_id')) rows = rows.filter(row => row.category_id === url.searchParams.get('category_id'))
  const start = url.searchParams.get('start_date'), end = url.searchParams.get('end_date'), q = (url.searchParams.get('q') || '').toLowerCase()
  rows = ordered(rows.filter(row => (!start || Date.parse(row.transaction_date) >= Date.parse(start + 'T00:00:00+07:00')) && (!end || Date.parse(row.transaction_date) < Date.parse(end + 'T00:00:00+07:00') + 86400000) && [row.description, row.amount, row.category?.name, row.income_wallet?.name, row.expense_wallet?.name, row.transfer_from?.name, row.transfer_to?.name].some(value => String(value || '').toLowerCase().includes(q))))
  const page = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('per_page') || 10)
  return { data: rows.slice((page - 1) * size, page * size), meta: { current_page: page, last_page: Math.max(1, Math.ceil(rows.length / size)), per_page: size, total: rows.length }, summary: { total_amount: sum(rows) } }
}
