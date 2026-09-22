import { Button, Modal, Placeholder } from '../index'
import RecordEditor from './RecordEditor'
import { FETCH_BASE_URL } from '../../services/api'
import { isTransaction } from '../../services/admin'
import { formatDate, formatRupiah } from '../../utils/format'
import { describeRecord as describe } from '../../utils/adminRecords'

export default function AdminRecordDialogs({ data, actions }) {
  const { dialog, setDialog, changed, cooldown, blocked, busy, remove } = actions;
  return (
    <>
      {dialog && ["create", "edit"].includes(dialog.mode) && (
        <RecordEditor
          resource={dialog.resource}
          record={dialog.record}
          data={data}
          onClose={() => setDialog(null)}
          onChanged={changed}
          onCooldown={cooldown}
          blocked={blocked}
        />
      )}
      {dialog?.mode === "delete" && (
        <Modal
          open
          title="Hapus data?"
          onClose={() => {
            if (!busy) setDialog(null);
          }}
          footer={
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Batal
              </Button>
              <Button loading={busy} disabled={blocked} onClick={remove}>
                Ya, hapus
              </Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed">
            Hapus{" "}
            {dialog.record.name || dialog.record.description || "transaksi ini"}
            ?{" "}
            {isTransaction(dialog.resource)
              ? "Saldo terkait akan dihitung ulang dan seluruh attachment transaksi ikut dihapus."
              : "Penghapusan mengikuti aturan kategori di backend."}
          </p>
        </Modal>
      )}
      {dialog?.mode === "view" && (
        <Modal
          open
          title="Detail data"
          onClose={() => setDialog(null)}
          footer={<Button onClick={() => setDialog(null)}>Tutup</Button>}
        >
          <dl className="space-y-4 text-sm">
            {[
              [
                "Nama / deskripsi",
                dialog.record.name || dialog.record.description || "—",
              ],
              ["Keterangan", describe(dialog.record, dialog.resource)],
              ...(dialog.resource === "categories"
                ? []
                : [
                  [
                    "Nominal / saldo",
                    formatRupiah(
                      dialog.record.amount || dialog.record.balance
                    ),
                  ],
                ]),
              ...(isTransaction(dialog.resource)
                ? [
                  [
                    "Biaya admin",
                    formatRupiah(dialog.record.admin_fee ?? "0.00"),
                  ],
                  [
                    "Tanggal (WIB)",
                    formatDate(dialog.record.transaction_date, true),
                  ],
                ]
                : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {isTransaction(dialog.resource) && (
            <section className="mt-6 border-t border-primary/10 pt-4">
              <h3 className="mb-3 font-semibold">Bukti transaksi</h3>
              {!dialog.record.attachments?.length && (
                <p className="text-sm text-muted">Belum ada attachment.</p>
              )}
              <div className="grid gap-3">
                {dialog.record.attachments?.map((a) =>
                  a.url ? (
                    <a
                      key={a.attachment_id}
                      href={FETCH_BASE_URL + a.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Buka gambar ukuran penuh"
                    >
                      <Placeholder
                        src={FETCH_BASE_URL + a.url}
                        alt="Bukti transaksi"
                        imageClassName="!object-contain"
                      />
                    </a>
                  ) : (
                    <p key={a.attachment_id} className="text-xs text-muted">
                      Gambar lama belum tersedia.
                    </p>
                  )
                )}
              </div>
            </section>
          )}
        </Modal>
      )}
    </>
  );
}
