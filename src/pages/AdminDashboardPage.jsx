import { useEffect, useState } from 'react'
import { DashboardLayout } from '../components'
import AdminSummary from '../components/organisms/AdminSummary'
import AdminTabs from '../components/organisms/AdminTabs'
import AdminRecordDialogs from '../components/organisms/AdminRecordDialogs'
import { resources } from '../services/admin'
import useDashboardPage from '../hooks/useDashboardPage'
import useAdminRecords from '../hooks/useAdminRecords'
import IncomesPage from './admin/IncomesPage'
import ExpensesPage from './admin/ExpensesPage'
import TransfersPage from './admin/TransfersPage'
import WalletsPage from './admin/WalletsPage'
import CategoriesPage from './admin/CategoriesPage'

const pages = { incomes: IncomesPage, expenses: ExpensesPage, transfers: TransfersPage, wallets: WalletsPage, categories: CategoriesPage }

function initialTab() {
  const hash = window.location.hash.slice(1)
  return Object.hasOwn(pages, hash) ? hash : 'incomes'
}

export default function AdminDashboardPage({ user, onLogout, loggingOut, sessionError }) {
  const [tab, setTab] = useState(initialTab)
  const { dashboard, filters, list, resetFilters } = useDashboardPage(tab, user)
  const actions = useAdminRecords(tab, dashboard)

  useEffect(() => {
    const onHash = () => {
      setTab(initialTab())
      resetFilters()
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [resetFilters])

  function navigate(id) {
    if (!Object.hasOwn(pages, id)) {
      document.getElementById('ringkasan')?.scrollIntoView()
      return
    }
    setTab(id)
    resetFilters()
    window.history.replaceState(null, '', '#' + id)
  }

  const Page = pages[tab]
  return <DashboardLayout user={user} onLogout={onLogout} loggingOut={loggingOut} navigation={resources} selectedId={tab} onSelect={navigate}>
    <AdminSummary dashboard={dashboard} actions={actions} sessionError={sessionError} />
    <AdminTabs tab={tab} navigate={navigate} />
    <Page dashboard={dashboard} filters={filters} list={list} actions={actions} />
    <AdminRecordDialogs data={dashboard.data} actions={actions} />
  </DashboardLayout>
}
