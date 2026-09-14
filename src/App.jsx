import { useEffect, useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import LoginPage from './pages/LoginPage'
import { loadSession, logout } from './services/auth'
import PwaControls from './components/organisms/PwaControls'
import InstallProvider from './components/templates/InstallProvider'

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

  return <InstallProvider>
    {window.location.pathname.replace(/\/$/, '') === '/admin'
      ? <LoginPage user={user} checking={checking} sessionError={sessionError} onAuthenticated={(account) => { setUser(account); setSessionError(null) }} onLogout={handleLogout} />
      : checking
        ? <main role="status" className="grid min-h-dvh place-items-center text-sm text-muted">Sedang memuat pembukuan…</main>
        : user?.role === 'admin'
          ? <AdminDashboardPage key={user.id + ':' + user.role} user={user} onLogout={handleLogout} loggingOut={loggingOut} sessionError={sessionError} />
          : <DashboardPage key={user ? user.id + ':' + user.role : 'guest'} user={user} onLogout={handleLogout} loggingOut={loggingOut} sessionError={sessionError} />}
    <PwaControls />
  </InstallProvider>
}
