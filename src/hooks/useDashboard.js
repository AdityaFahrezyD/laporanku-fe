import { useEffect, useState } from 'react'
import { loadDashboard } from '../services/dashboard.js'

export default function useDashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: null, updatedAt: null })
  const [requestId, setRequestId] = useState(0)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    let active = true
    loadDashboard().then(
      (data) => { if (active) setState({ data, loading: false, error: null, updatedAt: new Date().toISOString() }) },
      (error) => { if (active) { setNow(Date.now()); setState((previous) => ({ ...previous, loading: false, error })) } },
    )
    return () => { active = false }
  }, [requestId])

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

  return { ...state, retryIn, refresh }
}
