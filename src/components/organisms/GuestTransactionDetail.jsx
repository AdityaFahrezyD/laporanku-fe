import { Button, Modal, Placeholder } from '../index'
import { FETCH_BASE_URL } from '../../services/api'
import { formatDate, formatRupiah } from '../../utils/format'
import { transactionTypes as types } from '../../utils/transactionTypes'

export default function GuestTransactionDetail({ selected, onClose }) {

  return (
    <Modal
      open={selected !== null}
      onClose={onClose}
      title="Detail transaksi"
      footer={<Button onClick={onClose}>Tutup</Button>}
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
  );
}
