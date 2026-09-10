import { ApiError, getJson } from './api.js'

const resources = ['wallets', 'incomes', 'expenses', 'transfers']
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

export async function fetchDashboard(options) {
  // Publish one complete result so a failed list never produces misleading totals.
  const results = await Promise.allSettled(resources.map(async (resource) => readList(resource, await getJson(`/api/${resource}`, options))))
  const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason)
  if (failures.length) {
    const limited = failures.filter((error) => error.status === 429).sort((a, b) => b.retryAt - a.retryAt)
    throw limited[0] || failures[0]
  }
  return Object.fromEntries(resources.map((resource, index) => [resource, results[index].value]))
}

let pendingRequest
export function loadDashboard() {
  // Share only the in-flight request, including React StrictMode's initial effects.
  if (!pendingRequest) pendingRequest = fetchDashboard().finally(() => { pendingRequest = undefined })
  return pendingRequest
}

export function latestTransactions({ incomes, expenses, transfers }) {
  return [
    ...incomes.map((item) => ({ ...item, id: item.income_id, type: 'income', walletName: item.income_wallet?.name || 'Dompet tidak tersedia' })),
    ...expenses.map((item) => ({ ...item, id: item.expense_id, type: 'expense', walletName: item.expense_wallet?.name || 'Dompet tidak tersedia' })),
    ...transfers.map((item) => ({ ...item, id: item.transfer_id, type: 'transfer', walletName: `${item.transfer_from?.name || 'Dompet tidak tersedia'} → ${item.transfer_to?.name || 'Dompet tidak tersedia'}` })),
  ].sort((a, b) => Date.parse(b.transaction_date) - Date.parse(a.transaction_date) || a.id.localeCompare(b.id)).slice(0, 5)
}
