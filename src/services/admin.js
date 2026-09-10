import { ApiError, getJson, requestJson } from './api.js'
import { readCsrfToken } from './auth.js'

export const resources = [
  { id: 'incomes', label: 'Income', singular: 'income', key: 'income_id', icon: 'down' },
  { id: 'expenses', label: 'Expenses', singular: 'expense', key: 'expense_id', icon: 'up' },
  { id: 'transfers', label: 'Transfer', singular: 'transfer', key: 'transfer_id', icon: 'arrows' },
  { id: 'wallets', label: 'Dompet', singular: 'dompet', key: 'wallet_id', icon: 'wallet' },
  { id: 'categories', label: 'Kategori', singular: 'kategori', key: 'category_id', icon: 'grid' },
]
export function isTransaction(resource) { return ['incomes', 'expenses', 'transfers'].includes(resource) }
export async function fetchAdminData(options) {
  const results = await Promise.allSettled(resources.map(async ({ id, key }) => {
    const result = await getJson('/api/' + id, options)
    if (!Array.isArray(result?.data) || result.data.some((row) => typeof row?.[key] !== 'string')) throw new ApiError('Respons daftar tidak valid.')
    return result.data
  }))
  const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
  if (errors.length) throw errors.sort((a, b) => (b.retryAt || 0) - (a.retryAt || 0))[0]
  return Object.fromEntries(resources.map((r, i) => [r.id, results[i].value]))
}
export async function mutate(path, method, body, options = {}) {
  await requestJson('/sanctum/csrf-cookie', options)
  const csrfToken = readCsrfToken(options.cookie ?? document.cookie)
  if (!csrfToken) throw new ApiError('Cookie sesi tidak tersedia. Silakan masuk kembali.', 419)
  return requestJson(path, { ...options, method, body, csrfToken, timeout: 60000 })
}
export async function saveRecord(resource, id, data, options) {
  const response = await mutate('/api/' + resource + (id ? '/' + id : ''), id ? 'PATCH' : 'POST', data, options)
  const key = resources.find((r) => r.id === resource)?.key
  if (!response?.data?.[key]) throw new ApiError('Respons penyimpanan tidak terbaca. Periksa daftar sebelum mencoba kembali.')
  return response.data
}
export async function uploadAttachment(resource, id, file, options) {
  const form = new FormData()
  form.append('image', file)
  const response = await mutate('/api/' + resource + '/' + id + '/attachments', 'POST', form, options)
  if (!response?.data?.attachment_id) throw new ApiError('Respons upload tidak terbaca. Periksa attachment sebelum mencoba kembali.')
  return response.data
}
export function dateInput(value = new Date().toISOString()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).map((p) => [p.type, p.value]))
  return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute
}
export function payload(resource, values, editing = false) {
  if (resource === 'wallets') return { name: values.name.trim(), type: values.type, is_active: values.is_active, ...(!editing ? { balance: values.balance } : {}) }
  if (resource === 'categories') return { name: values.name.trim(), type: values.type }
  const [date, time] = values.transaction_date.split('T')
  const [year, month, day] = date.split('-')
  return {
    amount: values.amount, description: values.description || null, transaction_date: day + '-' + month + '-' + year + ' ' + time,
    ...(resource === 'transfers' ? { from_wallet_id: values.from_wallet_id, to_wallet_id: values.to_wallet_id } : { wallet_id: values.wallet_id, category_id: values.category_id || null }),
  }
}
