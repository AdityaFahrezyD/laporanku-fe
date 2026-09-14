import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createQueryStore } from '../services/queryStore.js'
import { fetchMasterList } from '../services/dashboard.js'
import { fetchSummary, fetchTransactionPage, transactionPath } from '../services/transactions.js'

const baseKeys = ['wallets', 'summary']
const adminKeys = [...baseKeys, 'categories']
const baseLoader = key => key === 'summary' ? fetchSummary() : fetchMasterList(key)

export default function useDashboardQueries(filters, user) {
  const scope = JSON.stringify([user?.id ?? 'guest', user?.role ?? 'guest'])
  const store = useMemo(() => createQueryStore({ scope }), [scope])
  useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [now, setNow] = useState(Date.now)
  const admin = user?.role === 'admin'
  const needsCategories = admin || ['incomes', 'expenses'].includes(filters.resource)
  const basics = needsCategories ? adminKeys : baseKeys
  const transaction = ['incomes', 'expenses', 'transfers'].includes(filters.resource)
  const pageKey = transaction ? transactionPath(filters.resource, filters) : null
  // Encode only the resolved wire parameters: equivalent periods reuse the same page.
  const visitKey = filters.resource + ':' + (pageKey || '')
  const loadPage = key => {
    const url = new URL(key, 'http://local.invalid')
    const params = url.searchParams
    const period = params.has('start_date') ? { mode: 'range', start: params.get('start_date'), end: params.get('end_date') } : { mode: 'all' }
    return fetchTransactionPage(url.pathname.split('/').pop(), { period, query: params.get('q') || '', page: Number(params.get('page')), categoryId: params.get('category_id') || '' })
  }
  useEffect(() => {
    for (const key of (needsCategories ? adminKeys : baseKeys)) store.ensure(key, () => baseLoader(key))
    if (pageKey) store.ensure(pageKey, () => loadPage(pageKey), { page: true })
  }, [store, needsCategories, pageKey, visitKey])

  const cooldown = store.cooldown()
  useEffect(() => {
    if (!cooldown.retryAt) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= cooldown.retryAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown.retryAt])

  const baseEntries = basics.map(key => store.peek(key))
  const pageEntry = pageKey ? store.peek(pageKey) : null
  const entries = [...baseEntries, ...(pageKey ? [pageEntry] : [])]
  const errors = [cooldown.error, ...entries.map(entry => entry?.error)].filter(Boolean)
  const error = errors.sort((a, b) => (b.retryAt || 0) - (a.retryAt || 0))[0] || null
  const retryIn = Math.max(0, Math.ceil((cooldown.retryAt - Math.max(now, cooldown.observedAt)) / 1000))
  const missing = entry => entry?.data === undefined
  // An unseen page visited during cooldown stays idle afterwards until the
  // user retries; do not turn it into an endless, non-running loading state.
  const loadingEntry = entry => missing(entry) && (entry ? entry.fetching : !cooldown.error)
  const baseReady = (admin ? basics : baseKeys).every(key => !missing(store.peek(key)))
  const transactionPage = pageEntry?.data ?? null
  const data = baseReady ? { ...Object.fromEntries(basics.map(key => [key, store.peek(key)?.data])), transactionPage } : null
  const initialLoading = baseEntries.some(loadingEntry)
  const listLoading = Boolean(pageKey && loadingEntry(pageEntry))
  const refreshing = entries.some(entry => entry?.fetching && !missing(entry))
  const updatedAt = Math.max(0, ...entries.map(entry => entry?.updatedAt || 0))

  function refresh() {
    // Refresh also makes inactive pages stale, so a clamped last page cannot
    // reuse metadata from before a deletion made elsewhere.
    store.invalidate()
    for (const key of basics) store.ensure(key, () => baseLoader(key), { force: true })
    if (pageKey) store.ensure(pageKey, () => loadPage(pageKey), { force: true, page: true })
  }
  return {
    data, transactionPage, error, initialLoading, listLoading, refreshing,
    loading: initialLoading || listLoading,
    updatingPage: Boolean(pageEntry?.fetching && transactionPage),
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
    retryIn, refresh, changed: refresh, cooldown: store.block,
  }
}
