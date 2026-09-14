import { useEffect, useRef, useState } from 'react'
import { loadDashboard } from '../services/dashboard.js'

export default function useDashboard(filters) {
  const [state, setState] = useState({ data: null, loading: true, error: null, updatedAt: null })
  const [requestId, setRequestId] = useState(0)
  const [now, setNow] = useState(Date.now)
  const cooldownUntil = useRef(0)

  const filterKey = JSON.stringify(filters)
  useEffect(() => {
    if (Date.now() < cooldownUntil.current) return
    let active = true
    loadDashboard(JSON.parse(filterKey)).then(
      (data) => { if (active) setState({ key: filterKey, data, loading: false, error: null, updatedAt: new Date().toISOString() }) },
      (error) => { if (active) { cooldownUntil.current = error.retryAt || 0; setNow(Date.now()); setState((previous) => ({ ...previous, key: filterKey, data: null, loading: false, error })) } },
    )
    return () => { active = false }
  }, [requestId, filterKey])

  const retryAt = state.error?.retryAt || 0
  useEffect(() => {
    if (!retryAt) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= retryAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAt])

  const retryIn = Math.max(0, Math.ceil((retryAt - now) / 1000))
  function refresh() {
    if (state.loading || Date.now() < retryAt) return
    setState((previous) => ({ ...previous, loading: true, error: null }))
    setRequestId((previous) => previous + 1)
  }

  return { ...state, data: state.key === filterKey && !state.loading ? state.data : null, loading: !state.error && (state.key !== filterKey || state.loading), retryIn, refresh }
}
