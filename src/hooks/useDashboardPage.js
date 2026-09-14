import { useCallback, useState } from 'react'
import useDashboardQueries from './useDashboardQueries'
import useDebouncedValue from './useDebouncedValue'
import { categoriesFor } from '../utils/categories'
import { isTransaction } from '../services/admin'

export default function useDashboardPage(resource, user) {
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState({ mode: 'all' })
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const dashboard = useDashboardQueries({ resource, page, period, query: debouncedQuery, categoryId }, user)
  const { data, error } = dashboard

  if (categoryId && data?.categories && !categoriesFor(resource, data.categories).some(category => category.category_id === categoryId)) {
    setCategoryId('')
    setPage(1)
  }

  const searching = query !== debouncedQuery
  const transaction = isTransaction(resource)
  const transactionPage = searching ? null : dashboard.transactionPage
  const rows = transaction ? (transactionPage?.data || []) : (data?.[resource] || []).filter(row =>
    [row.name, row.type].some(value => String(value || '').toLowerCase().includes(query.toLowerCase())),
  )
  const pages = transaction ? (transactionPage?.meta.last_page || 1) : Math.max(1, Math.ceil(rows.length / 10))
  const currentPage = transaction ? page : Math.min(page, pages)
  if ((transaction ? transactionPage : data) && page > pages) setPage(pages)
  const visible = transaction ? rows : rows.slice((currentPage - 1) * 10, currentPage * 10)
  const listLoading = transaction ? dashboard.listLoading || searching : !data && !error

  const resetFilters = useCallback(() => {
    setQuery('')
    setCategoryId('')
    setPage(1)
  }, [])

  return {
    dashboard,
    filters: { query, setQuery, categoryId, setCategoryId, period, setPeriod, setPage },
    list: { rows, visible, transactionPage, currentPage, pages, listLoading },
    resetFilters,
  }
}
