import { Alert, Button, Card } from '../index'
import WalletCards from './WalletCards'
import { formatRupiah } from '../../utils/format'

export default function AdminSummary({ dashboard, actions, sessionError }) {
  const { data, loading, refreshing, retryIn } = dashboard;
  const { error, notice, refresh, blocked } = actions;
  return (
    <>
      <section id="ringkasan">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Ruang administrator
        </p>
        <div className="mt-2 mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Kelola pembukuan
            </h1>
            <p className="mt-3 text-sm text-muted">
              Catat transaksi, kelola dompet, dan simpan bukti dalam satu
              tempat.
            </p>
          </div>
          <Button
            variant="outline"
            loading={loading || refreshing}
            disabled={blocked}
            onClick={refresh}
          >
            Muat ulang
          </Button>
        </div>
        {refreshing && <p role="status" className="mb-4 text-sm text-muted">Memperbarui…</p>}
        {(sessionError || error) && (
          <Alert variant="error" className="mb-4">
            {(sessionError || error).message}
            {error && data && <p className="mt-1">Data terakhir mungkin belum terbaru.</p>}
            {Object.values(error?.errors || {})
              .flat()
              .map((message, i) => (
                <p key={i}>{message}</p>
              ))}
            {[401, 419].includes((sessionError || error).status) && (
              <a className="mt-2 block underline" href="/admin">
                Buka halaman login
              </a>
            )}
          </Alert>
        )}
        {notice && (
          <p role="status" className="mb-4 text-sm text-primary">
            {notice}
          </p>
        )}
        {blocked && (
          <Alert variant="warning" className="mb-4">
            Tunggu {retryIn} detik
            sebelum mengirim permintaan berikutnya.
          </Alert>
        )}
        {data && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Total saldo",
                data.summary.totals.balance,
                data.wallets.length + " dompet",
              ],
              [
                "Total income",
                data.summary.totals.incomes,
                data.summary.counts.incomes + " transaksi",
              ],
              [
                "Total expenses",
                data.summary.totals.expenses,
                data.summary.counts.expenses + " transaksi",
              ],
            ].map(([label, value, caption], i) => (
              <Card
                key={label}
                className={i === 0 ? "!bg-primary !text-white" : ""}
              >
                <p className="text-sm opacity-70">{label}</p>
                <p className="mt-3 break-words text-2xl font-semibold tabular-nums">
                  {formatRupiah(value)}
                </p>
                <p className="mt-4 text-xs opacity-65">
                  {caption} · seluruh periode
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
      {data && <WalletCards wallets={data.wallets} className="mb-8" />}
    </>
  );
}
