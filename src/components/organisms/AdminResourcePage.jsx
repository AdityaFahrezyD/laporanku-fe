import { Button } from '../index'
import PeriodFilter from './PeriodFilter'
import AdminRecordsTable from './AdminRecordsTable'
import { resources } from '../../services/admin'

export default function AdminResourcePage({ resource, transaction = false, amountLabel, amountField = 'amount', canDelete = true, dashboard, filters, list, actions, children }) {
  const meta = resources.find(item => item.id === resource);
  const { data, loading } = dashboard;
  const { query, setQuery, period, setPeriod, setPage } = filters;
  const { rows, transactionPage, listLoading } = list;
  const { error, busy, blocked, setNotice, setDialog } = actions;
  return (
    <section id={'panel-' + resource} role="tabpanel" aria-labelledby={'tab-' + resource}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className={transaction ? "flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:flex-1" : ""}>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{meta.label}</h2>
            <p className="mt-1 text-xs text-muted">
              {transaction ? (transactionPage?.meta.total ?? 0) : rows.length} {transaction ? "transaksi" : "data"}
              {error && data ? " · data terakhir, mungkin belum terbaru" : ""}
            </p>
          </div>
          {transaction && <PeriodFilter value={period} disabled={blocked} onChange={(next) => { setPeriod(next); setPage(1); }} />}
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap gap-3">
          <input
            aria-label={"Cari " + meta.label}
            placeholder={"Cari " + meta.singular + "…"}
            maxLength={200}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="min-w-0 max-w-full rounded-xl border border-primary/15 bg-white px-4 py-2 text-sm"
          />
          <Button
            disabled={!data || loading || blocked || busy}
            onClick={() => {
              setNotice("");
              setDialog({ mode: "create", resource: meta.id, record: null });
            }}
          >
            + Tambah {meta.singular}
          </Button>
        </div>
      </div>

      {children}
      {listLoading && (
        <p role="status" className="mb-4 text-sm text-muted">
          Memuat pembukuan…
        </p>
      )}

      <AdminRecordsTable meta={meta} transaction={transaction} amountLabel={amountLabel} amountField={amountField} canDelete={canDelete} list={list} query={query} setPage={setPage} actions={actions} />
    </section>
  );
}
