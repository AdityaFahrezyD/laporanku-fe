import { useEffect, useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import { loadSession, logout } from './services/auth'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [sessionError, setSessionError] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true
    loadSession().then(
      (account) => { if (active) setUser(account) },
      (error) => { if (active) setSessionError(error) },
    ).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setSessionError(null)
    try {
      await logout()
      window.location.replace('/')
    } catch (error) { setSessionError(error) } finally { setLoggingOut(false) }
  }

  if (window.location.pathname.replace(/\/$/, '') === '/login') {
    return <LoginPage user={user} checking={checking} sessionError={sessionError} onAuthenticated={(account) => { setUser(account); setSessionError(null) }} onLogout={handleLogout} />
  }
  return <DashboardPage user={user} onLogout={handleLogout} loggingOut={loggingOut} sessionError={sessionError} />
}
