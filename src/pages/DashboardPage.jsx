import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DashboardLayout,
  Icon,
  Modal,
  Placeholder,
} from "../components";
import TransactionTable from "../components/organisms/TransactionTable";
import PeriodFilter from "../components/organisms/PeriodFilter";
import CategoryFilter from "../components/organisms/CategoryFilter";
import { categoriesFor } from "../utils/categories";
import WalletCards from "../components/organisms/WalletCards";
import useDashboard from "../hooks/useDashboard";
import { FETCH_BASE_URL } from "../services/api";
import { normalizeTransactions } from "../services/dashboard";
import { formatDate, formatRupiah } from "../utils/format";
import useDebouncedValue from "../hooks/useDebouncedValue";

const types = {
  income: {
    label: "Pemasukan",
    icon: "down",
    color: "bg-primary/8 text-primary",
    prefix: "+",
  },
  expense: {
    label: "Pengeluaran",
    icon: "up",
    color: "bg-secondary/10 text-secondary",
    prefix: "−",
  },
  transfer: {
    label: "Transfer",
    icon: "arrows",
    color: "bg-slate-100 text-slate-600",
    prefix: "",
  },
};

const views = {
  ringkasan: "Ringkasan keuangan",
  incomes: "Pemasukan",
  expenses: "Pengeluaran",
  transfers: "Transfer",
};
function currentView() {
  const hash = window.location.hash.slice(1);
  return Object.hasOwn(views, hash) ? hash : "ringkasan";
}

export default function DashboardPage({
  user,
  onLogout,
  loggingOut,
  sessionError,
}) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(currentView);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState({ mode: "all" });
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const { data, transactionPage: loadedPage, loading, listLoading, refreshing, error, updatedAt, retryIn, refresh } = useDashboard({ resource: view, page, period, query: debouncedQuery, categoryId }, user);
  if (categoryId && data?.categories && !categoriesFor(view, data.categories).some(category => category.category_id === categoryId)) {
    setCategoryId("");
    setPage(1);
  }
  const searching = query !== debouncedQuery;
  const { wallets = [] } = data || {};
  const isSummary = view === "ringkasan";
  const transactionPage = searching ? null : loadedPage;
  const transactions = isSummary ? (data?.summary.latest || []).map(row => normalizeTransactions({ [row.type + 's']: [row] })[0]) : normalizeTransactions({ [view]: transactionPage?.data || [] });
  const pages = transactionPage?.meta.last_page || 1;
  const currentPage = page;
  if (transactionPage && page > pages) setPage(pages);
  const visible = transactions;
  function navigate(id) {
    setCategoryId("");
    setQuery("");
    setView(Object.hasOwn(views, id) ? id : "ringkasan");
    setPage(1);
    setSelected(null);
  }
  useEffect(() => {
    const onHash = () => navigate(currentView());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return (
    <DashboardLayout user={user} onLogout={onLogout} loggingOut={loggingOut} selectedId={view} onSelect={navigate}>
      {user && sessionError && (
        <Alert variant="error" className="mb-5">
          {sessionError.message}
        </Alert>
      )}
      <section id={view} aria-labelledby="dashboard-title">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
              Pembukuan keuangan
            </p>
            <h1
              id="dashboard-title"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {views[view]}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {isSummary ? "Lihat arus uang dan saldo dompet." : `Daftar transaksi ${views[view].toLowerCase()} dalam pembukuan ini.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {updatedAt && (
              <span className="text-xs text-muted">
                Terakhir dimuat: {formatDate(updatedAt, true)}
              </span>
            )}
            <Button
              variant="outline"
              loading={loading || refreshing}
              disabled={retryIn > 0}
              onClick={refresh}
            >
              {loading
                ? "Memuat data…"
                : retryIn > 0
                  ? `Tunggu ${retryIn} detik`
                  : "Muat ulang"}
            </Button>
          </div>
        </div>
        {refreshing && <p role="status" className="mb-4 text-sm text-muted">Memperbarui…</p>}
        {error && (
          <Alert
            variant="error"
            title="Data belum berhasil dimuat"
            className="mb-7"
          >
            {error.message}
            {error.status > 0 && <span> (HTTP {error.status})</span>}
            {data && (
              <p className="mt-1">
                Data yang ditampilkan adalah hasil pemuatan terakhir dan mungkin
                belum terbaru.
              </p>
            )}
          </Alert>
        )}
        {!data && loading && (
          <div
            role="status"
            className="rounded-2xl border border-primary/10 bg-white p-8 text-center text-sm text-muted"
          >
            Sedang memuat ringkasan, dompet, dan transaksi…
          </div>
        )}
        {data && isSummary && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="relative overflow-hidden !border-primary !bg-primary !text-white">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full border-[24px] border-white/5"
                />
                <div className="relative">
                  <span className="mb-6 flex size-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon name="wallet" />
                  </span>
                  <p className="text-sm text-white/70">Total saldo</p>
                  <p className="mt-2 break-words text-[clamp(1.35rem,2.2vw,2rem)] font-semibold tracking-tight tabular-nums">
                    {formatRupiah(data.summary.totals.balance)}
                  </p>
                  <p className="mt-5 border-t border-white/15 pt-4 text-xs text-white/65">
                    Tersimpan di {wallets.length} dompet
                  </p>
                </div>
              </Card>
              {[
                { title: "Total pemasukan", amount: data.summary.totals.incomes, count: data.summary.counts.incomes, type: "income" },
                { title: "Total pengeluaran", amount: data.summary.totals.expenses, count: data.summary.counts.expenses, type: "expense" },
              ].map(({ title, amount, count, type }) => (
                <Card key={type}>
                  <span
                    className={`mb-6 flex size-10 items-center justify-center rounded-xl ${types[type].color}`}
                  >
                    <Icon name={types[type].icon} />
                  </span>
                  <p className="text-sm text-muted">{title}</p>
                  <p className="mt-2 break-words text-[clamp(1.35rem,2.2vw,2rem)] font-semibold tracking-tight tabular-nums">
                    {formatRupiah(amount)}
                  </p>
                  <p className="mt-5 border-t border-primary/10 pt-4 text-xs text-muted">
                    Seluruh periode <span className="mx-1">·</span>{" "}
                    {count} transaksi
                  </p>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {(data || !isSummary) && (
        <>
          {isSummary && <WalletCards wallets={wallets} />}
          <section aria-labelledby="transactions-heading" className={isSummary ? "mt-9" : ""}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 id="transactions-heading" className="text-lg font-semibold">
                  {isSummary ? "Transaksi terbaru" : "Daftar transaksi"}
                </h2>
                {!isSummary && <p className="mt-1 text-xs text-muted">{transactionPage?.meta.total ?? 0} transaksi</p>}
              </div>
              {isSummary ? <span className="text-xs text-muted">
                {transactions.length} transaksi terakhir
              </span> : <PeriodFilter value={period} disabled={retryIn > 0} onChange={(next) => { setPeriod(next); setPage(1); }} />}
            </div>
            {!isSummary && <input aria-label="Cari transaksi" placeholder="Cari transaksi…" maxLength={200} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="mb-4 w-full rounded-xl border border-primary/15 bg-white px-4 py-3 text-sm" />}
            {['incomes', 'expenses'].includes(view) && <div className="mb-4"><CategoryFilter resource={view} categories={data?.categories} value={categoryId} disabled={retryIn > 0} onChange={value => { setCategoryId(value); setPage(1); }} /></div>}
            {(listLoading || searching) && !isSummary ? <p role="status">Sedang memuat transaksi…</p> : ((isSummary && data) || transactionPage) && <TransactionTable
              transactions={visible}
              types={types}
              onDetail={setSelected}
              title={isSummary ? "Transaksi terbaru" : views[view]}
              emptyMessage={isSummary ? "Belum ada transaksi dalam pembukuan ini." : "Tidak ada transaksi pada filter ini"}
              total={isSummary ? undefined : transactionPage.summary.total_amount}
            />}
            {!isSummary && transactionPage && (
              <nav aria-label="Paginasi transaksi" className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">Halaman {currentPage} dari {pages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={listLoading || searching || currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</Button>
                  <Button variant="outline" size="sm" disabled={listLoading || searching || currentPage === pages} onClick={() => setPage(currentPage + 1)}>Berikutnya</Button>
                </div>
              </nav>
            )}
          </section>
        </>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Detail transaksi"
        footer={<Button onClick={() => setSelected(null)}>Tutup</Button>}
      >
        {selected && (
          <>
            <div className="mb-6 rounded-xl bg-base/60 p-5">
              <p className="text-sm text-muted">{types[selected.type].label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatRupiah(selected.amount)}
              </p>
            </div>
            <dl className="space-y-4 text-sm">
              {[
                ["Deskripsi", selected.description || "Tanpa deskripsi"],
                ["Tanggal", formatDate(selected.transaction_date, true)],
                ...(selected.type === "transfer"
                  ? [
                    [
                      "Dompet asal",
                      selected.transfer_from?.name || "Dompet tidak tersedia",
                    ],
                    [
                      "Dompet tujuan",
                      selected.transfer_to?.name || "Dompet tidak tersedia",
                    ],
                  ]
                  : [
                    ["Dompet", selected.walletName],
                    ["Kategori", selected.category?.name || "Tanpa kategori"],
                  ]),
                ["ID transaksi", selected.id],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <section className="mt-6 border-t border-primary/10 pt-4" aria-labelledby="guest-attachments-heading">
              <h3 id="guest-attachments-heading" className="mb-3 font-semibold">Bukti transaksi</h3>
              {!selected.attachments?.length && (
                <p className="text-sm text-muted">Belum ada attachment.</p>
              )}
              <div className="grid gap-3">
                {selected.attachments?.map((attachment, index) => (
                  attachment.url ? (
                    <a
                      key={attachment.attachment_id}
                      href={FETCH_BASE_URL + attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Buka gambar ${index + 1} ukuran penuh`}
                    >
                      <Placeholder
                        src={FETCH_BASE_URL + attachment.url}
                        alt={`Bukti transaksi ${index + 1}`}
                        imageClassName="!object-contain"
                        description="Klik untuk membuka gambar ukuran penuh."
                      />
                    </a>
                  ) : (
                    <p key={attachment.attachment_id} className="text-xs text-muted">
                      Gambar lama belum tersedia.
                    </p>
                  )
                ))}
              </div>
            </section>
            <p className="mt-6 border-t border-primary/10 pt-4 text-xs text-muted">
              Detail ini hanya untuk dibaca.
            </p>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
