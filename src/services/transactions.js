import { ApiError, getJson } from './api.js'
import { periodBounds } from '../utils/period.js'

const keys = { incomes: 'income_id', expenses: 'expense_id', transfers: 'transfer_id' }
function validRecord(resource, row) {
  return row && typeof row[keys[resource]] === 'string' && typeof row.amount === 'string' && /^\d+(\.\d{1,2})?$/.test(row.amount) && typeof row.transaction_date === 'string' && Number.isFinite(Date.parse(row.transaction_date))
}

export function transactionPath(resource, { period = { mode: 'all' }, query = '', page = 1, categoryId = '' } = {}) {
  const params = new URLSearchParams({ paginated: '1', page: String(page), per_page: '10' })
  const bounds = periodBounds(period)
  if (bounds) { params.set('start_date', bounds.start); params.set('end_date', bounds.end) }
  if (query) params.set('q', query)
  if (categoryId && ['incomes', 'expenses'].includes(resource)) params.set('category_id', categoryId)
  return `/api/${resource}?${params}`
}

export async function fetchTransactionPage(resource, filters, options) {
  const result = await getJson(transactionPath(resource, filters), options)
  if (!Array.isArray(result?.data) || !result.data.every(row => validRecord(resource, row)) || !Number.isInteger(result.meta?.total) || result.meta.total < 0 || !Number.isInteger(result.meta?.last_page) || result.meta.last_page < 1 || !Number.isInteger(result.meta?.current_page) || result.meta.current_page < 1 || !Number.isInteger(result.meta?.per_page) || result.meta.per_page < 1 || !/^\d+\.\d{2}$/.test(result.summary?.total_amount)) {
    throw new ApiError('Respons halaman transaksi tidak valid.')
  }
  return result
}

export async function fetchSummary(options) {
  const result = (await getJson('/api/dashboard-summary', options))?.data
  if (!result || !Array.isArray(result.latest) || result.latest.length > 5 || !result.latest.every(row => ['income', 'expense', 'transfer'].includes(row?.type) && validRecord(row.type + 's', row)) || !['balance', 'incomes', 'expenses'].every(key => /^\d+\.\d{2}$/.test(result.totals?.[key])) || !['incomes', 'expenses'].every(key => Number.isInteger(result.counts?.[key]) && result.counts[key] >= 0)) throw new ApiError('Respons ringkasan tidak valid.')
  return result
}
