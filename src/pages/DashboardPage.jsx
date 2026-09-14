import { useCallback, useEffect, useState } from 'react'
import { Alert, DashboardLayout } from '../components'
import GuestTransactionDetail from '../components/organisms/GuestTransactionDetail'
import useDashboardPage from '../hooks/useDashboardPage'
import SummaryPage from './guest/SummaryPage'
import IncomesPage from './guest/IncomesPage'
import ExpensesPage from './guest/ExpensesPage'
import TransfersPage from './guest/TransfersPage'

const pages = { ringkasan: SummaryPage, incomes: IncomesPage, expenses: ExpensesPage, transfers: TransfersPage }

function currentView() {
  const hash = window.location.hash.slice(1)
  return Object.hasOwn(pages, hash) ? hash : 'ringkasan'
}

export default function DashboardPage({ user, onLogout, loggingOut, sessionError }) {
  const [view, setView] = useState(currentView)
  const [selected, setSelected] = useState(null)
  const { dashboard, filters, list, resetFilters } = useDashboardPage(view, user)

  const navigate = useCallback(id => {
    resetFilters()
    setView(Object.hasOwn(pages, id) ? id : 'ringkasan')
    setSelected(null)
  }, [resetFilters])

  useEffect(() => {
    const onHash = () => navigate(currentView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [navigate])

  const Page = pages[view]
  return <DashboardLayout user={user} onLogout={onLogout} loggingOut={loggingOut} selectedId={view} onSelect={navigate}>
    {user && sessionError && <Alert variant="error" className="mb-5">{sessionError.message}</Alert>}
    <Page dashboard={dashboard} filters={filters} list={list} onDetail={setSelected} />
    <GuestTransactionDetail selected={selected} onClose={() => setSelected(null)} />
  </DashboardLayout>
}
