import { useState } from 'react'
import { Alert, Button, Card, DashboardLayout, Icon, Modal } from '../components'
import useDashboard from '../hooks/useDashboard'
import { latestTransactions } from '../services/dashboard'
import { formatDate, formatRupiah, sumAmounts } from '../utils/format'

const types = {
  income: { label: 'Pemasukan', icon: 'down', color: 'bg-primary/8 text-primary', prefix: '+' },
  expense: { label: 'Pengeluaran', icon: 'up', color: 'bg-secondary/10 text-secondary', prefix: '−' },
  transfer: { label: 'Transfer', icon: 'arrows', color: 'bg-slate-100 text-slate-600', prefix: '' },
}
const walletTypes = { bank: 'Rekening bank', ewallet: 'E-wallet', cash: 'Tunai' }
export default function DashboardPage() {
  const { data, loading, error, updatedAt, retryIn, refresh } = useDashboard()
  const [selected, setSelected] = useState(null)
  const { wallets = [], incomes = [], expenses = [] } = data || {}
  const transactions = data ? latestTransactions(data) : []
  const transactionTitle = (transaction) => transaction.description || types[transaction.type].label
  return <DashboardLayout>
    <section id="ringkasan" aria-labelledby="dashboard-title">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Ruang keuanganmu</p><h1 id="dashboard-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Ringkasan keuangan</h1><p className="mt-3 text-sm text-muted">Lihat arus uang dan saldo dompet dalam satu tempat.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          {updatedAt && <span className="text-xs text-muted">Terakhir dimuat: {formatDate(updatedAt, true)}</span>}
          <Button variant="outline" loading={loading} disabled={retryIn > 0} onClick={refresh}>{loading ? 'Memuat data…' : retryIn > 0 ? `Tunggu ${retryIn} detik` : 'Muat ulang'}</Button>
        </div>
      </div>
      {error && <Alert variant="error" title="Data belum berhasil dimuat" className="mb-7">{error.message}{error.status > 0 && <span> (HTTP {error.status})</span>}{data && <p className="mt-1">Data yang ditampilkan adalah hasil pemuatan terakhir dan mungkin belum terbaru.</p>}</Alert>}
      {!data && loading && <div role="status" className="rounded-2xl border border-primary/10 bg-white p-8 text-center text-sm text-muted">Sedang memuat ringkasan, dompet, dan transaksi…</div>}
      {data && <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden !border-primary !bg-primary !text-white">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full border-[24px] border-white/5" />
          <div className="relative"><span className="mb-6 flex size-10 items-center justify-center rounded-xl bg-white/10"><Icon name="wallet" /></span><p className="text-sm text-white/70">Total saldo</p><p className="mt-2 break-words text-[clamp(1.35rem,2.2vw,2rem)] font-semibold tracking-tight tabular-nums">{formatRupiah(sumAmounts(wallets, 'balance'))}</p><p className="mt-5 border-t border-white/15 pt-4 text-xs text-white/65">Tersimpan di {wallets.length} dompet</p></div>
        </Card>
        {[{ title: 'Total pemasukan', data: incomes, type: 'income' }, { title: 'Total pengeluaran', data: expenses, type: 'expense' }].map(({ title, data, type }) => <Card key={type}>
          <span className={`mb-6 flex size-10 items-center justify-center rounded-xl ${types[type].color}`}><Icon name={types[type].icon} /></span><p className="text-sm text-muted">{title}</p><p className="mt-2 break-words text-[clamp(1.35rem,2.2vw,2rem)] font-semibold tracking-tight tabular-nums">{formatRupiah(sumAmounts(data))}</p><p className="mt-5 border-t border-primary/10 pt-4 text-xs text-muted">Seluruh periode <span className="mx-1">·</span> {data.length} transaksi</p>
        </Card>)}
      </div>
      </>}
    </section>

    {data && <>
    <section id="dompet" aria-labelledby="wallet-heading" className="mt-9">
      <div className="mb-4 flex items-center justify-between"><h2 id="wallet-heading" className="text-lg font-semibold">Dompet bersama</h2><span className="text-xs text-muted">{wallets.filter((wallet) => wallet.is_active).length} aktif · {wallets.length} dompet</span></div>
      {wallets.length === 0 && <Card><p className="text-sm text-muted">Belum ada dompet dalam pembukuan ini.</p></Card>}
      <div className="grid gap-4 md:grid-cols-3">{wallets.map((wallet) => <Card key={wallet.wallet_id}>
        <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-base"><Icon name={wallet.type === 'bank' ? 'bank' : 'wallet'} /></span><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{wallet.name}</h3><p className="mt-1 text-xs text-muted">{walletTypes[wallet.type] || wallet.type}</p></div><span className={`ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] ${wallet.is_active ? 'bg-primary/8 text-primary' : 'bg-base text-muted'}`}>{wallet.is_active ? 'Aktif' : 'Nonaktif'}</span></div>
        <p className="mt-6 text-xs text-muted">Saldo tersedia</p><p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{formatRupiah(wallet.balance)}</p>
      </Card>)}</div>
    </section>

    <section id="transaksi" aria-labelledby="transactions-heading" className="mt-9">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="transactions-heading" className="text-lg font-semibold">Transaksi terbaru</h2><span className="text-xs text-muted">{transactions.length} transaksi terakhir</span></div>
      <Card className="!p-0 overflow-hidden">
        {transactions.length === 0 && <p className="p-6 text-sm text-muted">Belum ada transaksi dalam pembukuan ini.</p>}
        <div className="hidden grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr_72px] gap-4 border-b border-primary/10 bg-primary/[0.025] px-6 py-3.5 text-[11px] font-medium uppercase tracking-wider text-muted xl:grid"><span>Transaksi</span><span>Dompet</span><span>Tanggal</span><span className="text-right">Nominal</span><span className="text-right">Detail</span></div>
        <ul className="divide-y divide-primary/8">{transactions.map((transaction) => <li key={transaction.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr_72px] xl:gap-4">
          <div className="flex min-w-0 items-center gap-3"><span className={`hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex ${types[transaction.type].color}`}><Icon name={types[transaction.type].icon} /></span><div className="min-w-0"><p className="break-words text-sm font-medium">{transactionTitle(transaction)}</p><p className="mt-1 break-words text-xs text-muted">{transaction.category?.name || (transaction.type === 'transfer' ? 'Antardompet' : 'Tanpa kategori')} <span className="xl:hidden">· {formatDate(transaction.transaction_date)}</span></p></div></div>
          <p className="hidden break-words text-xs leading-relaxed text-muted xl:block">{transaction.walletName}</p><p className="hidden text-xs text-muted xl:block">{formatDate(transaction.transaction_date)}</p>
          <p className={`text-right text-sm font-semibold tabular-nums ${transaction.type === 'expense' ? 'text-secondary' : 'text-primary'}`}><span className="sr-only">{types[transaction.type].label}: </span>{types[transaction.type].prefix}{formatRupiah(transaction.amount)}</p>
          <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 xl:col-span-1 xl:justify-end"><span className="min-w-0 break-words text-xs text-muted xl:hidden">{transaction.walletName}</span><Button variant="ghost" size="sm" aria-label={`Detail ${transactionTitle(transaction)}`} onClick={() => setSelected(transaction)}>Detail<Icon name="chevron" className="size-3" /></Button></div>
        </li>)}</ul>
        <div className="border-t border-primary/8 px-6 py-3 text-xs text-muted">Waktu ditampilkan dalam WIB · Transfer memindahkan saldo antardompet.</div>
      </Card>
    </section>
    </>}

    <Modal open={selected !== null} onClose={() => setSelected(null)} title="Detail transaksi" footer={<Button onClick={() => setSelected(null)}>Tutup</Button>}>
      {selected && <><div className="mb-6 rounded-xl bg-base/60 p-5"><p className="text-sm text-muted">{types[selected.type].label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{formatRupiah(selected.amount)}</p></div><dl className="space-y-4 text-sm">{[
        ['Deskripsi', selected.description || 'Tanpa deskripsi'], ['Tanggal', formatDate(selected.transaction_date, true)],
        ...(selected.type === 'transfer' ? [['Dompet asal', selected.transfer_from?.name || 'Dompet tidak tersedia'], ['Dompet tujuan', selected.transfer_to?.name || 'Dompet tidak tersedia']] : [['Dompet', selected.walletName], ['Kategori', selected.category?.name || 'Tanpa kategori']]),
        ['ID transaksi', selected.id],
      ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><p className="mt-6 border-t border-primary/10 pt-4 text-xs text-muted">Pembukuan bersama · Detail ini hanya untuk dibaca.</p></>}
    </Modal>
  </DashboardLayout>
}
