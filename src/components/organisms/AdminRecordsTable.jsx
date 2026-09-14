import { Button, Card } from '../index'
import TransactionTotal from '../molecules/TransactionTotal'
import { formatDate, formatRupiah } from '../../utils/format'
import { describeRecord } from '../../utils/adminRecords'

export default function AdminRecordsTable({ meta, transaction, amountLabel, amountField, canDelete, list, query, setPage, actions }) {
  const { visible, listLoading, transactionPage, currentPage, pages } = list;
  const { error, busy, blocked, openRecord, setDialog } = actions;
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="table-scroll">
        <table className="text-left text-sm">
          <thead className="bg-primary/5 text-xs text-muted">
            <tr>
              <th className="p-4">
                {transaction ? "Transaksi" : "Nama"}
              </th>
              <th className="p-4">Keterangan</th>
              {amountLabel && (
                <th className="table-amount p-4 text-right">
                  {amountLabel}
                </th>
              )}
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {visible.map((row) => (
              <tr key={row[meta.key]}>
                <td className="p-4">
                  <p className={transaction ? "table-description font-medium" : "font-medium"}>
                    {row.name || row.description || meta.label}
                  </p>
                  {transaction && (
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(row.transaction_date, true)} ·{" "}
                      {row.attachments?.length || 0} gambar
                    </p>
                  )}
                </td>
                <td className="p-4 text-xs text-muted">{describeRecord(row, meta.id)}</td>
                {amountLabel && (
                  <td className="table-amount p-4 text-right font-medium tabular-nums whitespace-nowrap">
                    {formatRupiah(
                      row[amountField]
                    )}
                  </td>
                )}
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || blocked}
                      onClick={() => openRecord("view", row)}
                    >
                      Detail
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || blocked}
                      onClick={() => openRecord("edit", row)}
                    >
                      Edit
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        disabled={busy || blocked}
                        onClick={() =>
                          setDialog({
                            mode: "delete",
                            resource: meta.id,
                            record: row,
                          })
                        }
                      >
                        Hapus
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && !listLoading && !error && (
        <p className="p-8 text-center text-sm text-muted">
          {transaction ? "Tidak ada transaksi pada filter ini" : query
            ? "Tidak ada data yang cocok."
            : "Belum ada data. Mulai dengan tombol tambah."}
        </p>
      )}
      {transactionPage && !listLoading && <TransactionTotal total={transactionPage.summary.total_amount} />}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 p-4 text-xs text-muted">
        <span>
          Halaman {currentPage} dari {pages}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={listLoading || currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={listLoading || currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </Card>
  );
}
