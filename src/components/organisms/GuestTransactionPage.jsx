import Button from '../atoms/Button'
import GuestPageHeader from './GuestPageHeader'
import PeriodFilter from './PeriodFilter'
import CategoryFilter from './CategoryFilter'
import TransactionTable from './TransactionTable'
import { normalizeTransactions } from '../../services/dashboard'
import { transactionTypes } from '../../utils/transactionTypes'

export default function GuestTransactionPage({ resource, title, withCategories = false, dashboard, filters, list, onDetail }) {
  const { query, setQuery, categoryId, setCategoryId, period, setPeriod, setPage } = filters
  const { transactionPage, visible, currentPage, pages, listLoading } = list
  const transactions = normalizeTransactions({ [resource]: visible })

  return <>
    <GuestPageHeader resource={resource} title={title} description={`Daftar transaksi ${title.toLowerCase()} dalam pembukuan ini.`} dashboard={dashboard} />
    <section aria-labelledby="transactions-heading">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="transactions-heading" className="text-lg font-semibold">Daftar transaksi</h2>
          <p className="mt-1 text-xs text-muted">{transactionPage?.meta.total ?? 0} transaksi</p>
        </div>
        <PeriodFilter value={period} disabled={dashboard.retryIn > 0} onChange={next => { setPeriod(next); setPage(1) }} />
      </div>
      <input aria-label="Cari transaksi" placeholder="Cari transaksi…" maxLength={200} value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} className="mb-4 w-full rounded-xl border border-primary/15 bg-white px-4 py-3 text-sm" />
      {withCategories && <div className="mb-4"><CategoryFilter resource={resource} categories={dashboard.data?.categories} value={categoryId} disabled={dashboard.retryIn > 0} onChange={value => { setCategoryId(value); setPage(1) }} /></div>}
      {listLoading ? <p role="status">Sedang memuat transaksi…</p> : transactionPage && <TransactionTable
        transactions={transactions}
        types={transactionTypes}
        onDetail={onDetail}
        title={title}
        emptyMessage="Tidak ada transaksi pada filter ini"
        total={transactionPage.summary.total_amount}
      />}
      {transactionPage && <nav aria-label="Paginasi transaksi" className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Halaman {currentPage} dari {pages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={listLoading || currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</Button>
          <Button variant="outline" size="sm" disabled={listLoading || currentPage === pages} onClick={() => setPage(currentPage + 1)}>Berikutnya</Button>
        </div>
      </nav>}
    </section>
  </>
}
