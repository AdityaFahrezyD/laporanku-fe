import { fetchTransactionPage, fetchSummary } from './transactions.js'
import { ApiError, getJson } from './api.js'

const primaryKeys = { wallets: 'wallet_id', incomes: 'income_id', expenses: 'expense_id', transfers: 'transfer_id' }
const decimal = /^\d+(\.\d{1,2})?$/

function readList(resource, response) {
  const records = response?.data
  const valid = Array.isArray(records) && records.every((record) => {
    if (!record || typeof record[primaryKeys[resource]] !== 'string') return false
    const amount = record[resource === 'wallets' ? 'balance' : 'amount']
    if (typeof amount !== 'string' || !decimal.test(amount)) return false
    if (resource === 'wallets') return typeof record.name === 'string' && typeof record.is_active === 'boolean'
    return typeof record.transaction_date === 'string' && Number.isFinite(Date.parse(record.transaction_date))
  })
  if (!valid) throw new ApiError('Format data dari server tidak sesuai. Silakan coba lagi nanti.')
  return records
}

export async function fetchDashboard(options, filters = { resource: 'ringkasan' }) {
  const results = await Promise.allSettled([
    getJson('/api/wallets', options).then(result => readList('wallets', result)),
    fetchSummary(options),
    filters.resource !== 'ringkasan' ? fetchTransactionPage(filters.resource, filters, options) : Promise.resolve(null),
  ])
  const failures = results.filter(result => result.status === 'rejected').map(result => result.reason)
  if (failures.length) throw failures.sort((a, b) => (b.retryAt || 0) - (a.retryAt || 0))[0]
  return { wallets: results[0].value, summary: results[1].value, transactionPage: results[2].value }
}

const pending = new Map()
export function loadDashboard(filters) {
  const key = JSON.stringify(filters)
  if (!pending.has(key)) pending.set(key, fetchDashboard(undefined, filters).finally(() => pending.delete(key)))
  return pending.get(key)
}

export function normalizeTransactions({ incomes = [], expenses = [], transfers = [] }) {
  return [
    ...incomes.map((item) => ({ ...item, id: item.income_id, type: 'income', walletName: item.income_wallet?.name || 'Dompet tidak tersedia' })),
    ...expenses.map((item) => ({ ...item, id: item.expense_id, type: 'expense', walletName: item.expense_wallet?.name || 'Dompet tidak tersedia' })),
    ...transfers.map((item) => ({ ...item, id: item.transfer_id, type: 'transfer', walletName: `${item.transfer_from?.name || 'Dompet tidak tersedia'} → ${item.transfer_to?.name || 'Dompet tidak tersedia'}` })),
  ].sort((a, b) => Date.parse(b.transaction_date) - Date.parse(a.transaction_date) || a.id.localeCompare(b.id))
}

export function latestTransactions(data) {
  return normalizeTransactions(data).slice(0, 5)
}
