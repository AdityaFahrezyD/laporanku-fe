import { Card, Icon } from '../../components'
import GuestPageHeader from '../../components/organisms/GuestPageHeader'
import WalletCards from '../../components/organisms/WalletCards'
import TransactionTable from '../../components/organisms/TransactionTable'
import { normalizeTransactions } from '../../services/dashboard'
import { formatRupiah } from '../../utils/format'
import { transactionTypes as types } from '../../utils/transactionTypes'

export default function SummaryPage({ dashboard, onDetail }) {
  const { data } = dashboard;
  const wallets = data?.wallets || [];
  const transactions = (data?.summary.latest || []).map(row => normalizeTransactions({ [row.type + 's']: [row] })[0]);
  return (
    <>
      <GuestPageHeader resource="ringkasan" title="Ringkasan keuangan" description="Lihat arus uang dan saldo dompet." dashboard={dashboard}>
        {data && (
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
        )}
      </GuestPageHeader>
      {data && <>
        <WalletCards wallets={wallets} />
        <section aria-labelledby="transactions-heading" className="mt-9">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1"><h2 id="transactions-heading" className="text-lg font-semibold">Transaksi terbaru</h2></div>
            <span className="text-xs text-muted">{transactions.length} transaksi terakhir</span>
          </div>
          <TransactionTable transactions={transactions} types={types} onDetail={onDetail} title="Transaksi terbaru" emptyMessage="Belum ada transaksi dalam pembukuan ini." />
        </section>
      </>}
    </>
  );
}
