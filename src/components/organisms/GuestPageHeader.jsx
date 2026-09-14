import { Alert, Button } from '../index'
import { formatDate } from '../../utils/format'

export default function GuestPageHeader({ resource, title, description, dashboard, children }) {
  const { data, loading, refreshing, error, updatedAt, retryIn, refresh } = dashboard;
  return (
    <section id={resource} aria-labelledby="dashboard-title">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
            Pembukuan keuangan
          </p>
          <h1
            id="dashboard-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {description}
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
      {children}
    </section>
  );
}
