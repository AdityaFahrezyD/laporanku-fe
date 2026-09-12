import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DashboardLayout,
  Modal,
  Placeholder,
} from "../components";
import WalletCards from "../components/organisms/WalletCards";
import RecordEditor from "../components/organisms/RecordEditor";
import { FETCH_BASE_URL, getJson } from "../services/api";
import {
  fetchAdminData,
  isTransaction,
  mutate,
  resources,
} from "../services/admin";
import { formatDate, formatRupiah, sumAmounts } from "../utils/format";

const walletLabels = {
  bank: "Rekening bank",
  cash: "Tunai",
  ewallet: "E-wallet",
};
function initialTab() {
  return resources.some((r) => r.id === window.location.hash.slice(1))
    ? window.location.hash.slice(1)
    : "incomes";
}
export default function AdminDashboardPage({
  user,
  onLogout,
  loggingOut,
  sessionError,
}) {
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const opening = useRef(false);
  const meta = resources.find((r) => r.id === tab);
  const blocked = now < retryAt;
  useEffect(() => {
    const onHash = () => {
      setTab(initialTab());
      setQuery("");
      setPage(1);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    let active = true;
    fetchAdminData()
      .then(
        (result) => {
          if (active) setData(result);
        },
        (failure) => {
          if (active) {
            setError(failure);
            setRetryAt((old) => Math.max(old, failure.retryAt || 0));
            setNow(Date.now);
          }
        }
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  function cooldown(failure) {
    setRetryAt((old) => Math.max(old, failure.retryAt || 0));
    setNow(Date.now);
  }
  function refresh() {
    setLoading(true);
    setError(null);
    setRevision((old) => old + 1);
  }
  function changed() {
    setNotice("Perubahan tersimpan.");
    refresh();
  }
  function navigate(id) {
    if (!resources.some((r) => r.id === id)) {
      document.getElementById("ringkasan")?.scrollIntoView();
      return;
    }
    setTab(id);
    setQuery("");
    setPage(1);
    window.history.replaceState(null, "", "#" + id);
  }
  async function openRecord(mode, record) {
    if (opening.current || blocked) return;
    opening.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await getJson("/api/" + tab + "/" + record[meta.key]);
      setDialog({ mode, resource: tab, record: response.data });
    } catch (failure) {
      setError(failure);
      cooldown(failure);
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (busy || blocked) return;
    setBusy(true);
    setError(null);
    try {
      await mutate(
        "/api/" +
        dialog.resource +
        "/" +
        dialog.record[resources.find((r) => r.id === dialog.resource).key],
        "DELETE"
      );
      setDialog(null);
      changed();
    } catch (failure) {
      setError(failure);
      cooldown(failure);
      setDialog(null);
      setLoading(true);
      setRevision((old) => old + 1);
    } finally {
      setBusy(false);
    }
  }
  const rows = (data?.[tab] || []).filter((row) =>
    [
      row.name,
      row.description,
      row.amount,
      row.type,
      row.category?.name,
      row.income_wallet?.name,
      row.expense_wallet?.name,
      row.transfer_from?.name,
      row.transfer_to?.name,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(query.toLowerCase())
    )
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * 10, currentPage * 10);
  function describe(row, resource = tab) {
    if (resource === "wallets")
      return (
        walletLabels[row.type] + " · " + (row.is_active ? "Aktif" : "Nonaktif")
      );
    if (resource === "categories")
      return row.type === "income" ? "Income" : "Expenses";
    if (resource === "transfers")
      return (
        (row.transfer_from?.name || "—") +
        " → " +
        (row.transfer_to?.name || "—")
      );
    return (
      (row.income_wallet?.name || row.expense_wallet?.name || "—") +
      " · " +
      (row.category?.name || "Tanpa kategori")
    );
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      loggingOut={loggingOut}
      navigation={resources}
      selectedId={tab}
      onSelect={navigate}
    >
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
            loading={loading}
            disabled={blocked}
            onClick={refresh}
          >
            Muat ulang
          </Button>
        </div>
        {(sessionError || error) && (
          <Alert variant="error" className="mb-4">
            {(sessionError || error).message}
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
            Tunggu {Math.max(0, Math.ceil((retryAt - now) / 1000))} detik
            sebelum mengirim permintaan berikutnya.
          </Alert>
        )}
        {data && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Total saldo",
                sumAmounts(data.wallets, "balance"),
                data.wallets.length + " dompet",
              ],
              [
                "Total income",
                sumAmounts(data.incomes),
                data.incomes.length + " transaksi",
              ],
              [
                "Total expenses",
                sumAmounts(data.expenses),
                data.expenses.length + " transaksi",
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
      <div
        role="tablist"
        aria-label="Pengelolaan data"
        className="mb-5 flex min-w-0 flex-wrap gap-2 border-b border-primary/10 pb-3"
      >
        {resources.map((r, index) => (
          <button
            key={r.id}
            id={"tab-" + r.id}
            type="button"
            role="tab"
            aria-selected={tab === r.id}
            aria-controls={"panel-" + r.id}
            tabIndex={tab === r.id ? 0 : -1}
            onClick={() => navigate(r.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? resources.length - 1
                    : (index +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      resources.length) %
                    resources.length;
              navigate(resources[next].id);
              document.getElementById("tab-" + resources[next].id)?.focus();
            }}
            className={
              "whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium " +
              (tab === r.id
                ? "bg-primary text-white"
                : "bg-white text-muted hover:bg-primary/5")
            }
          >
            {r.label}
          </button>
        ))}
      </div>
      <section
        id={"panel-" + tab}
        role="tabpanel"
        aria-labelledby={"tab-" + tab}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{meta.label}</h2>
            <p className="mt-1 text-xs text-muted">
              {rows.length} data
              {error && data ? " · data terakhir, mungkin belum terbaru" : ""}
            </p>
          </div>
          <div className="flex min-w-0 max-w-full flex-wrap gap-3">
            <input
              aria-label={"Cari " + meta.label}
              placeholder={"Cari " + meta.singular + "…"}
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
                setDialog({ mode: "create", resource: tab, record: null });
              }}
            >
              + Tambah {meta.singular}
            </Button>
          </div>
        </div>
        {tab === "wallets" && (
          <p className="mb-4 text-sm text-muted">
            Dompet bersifat permanen. Gunakan Edit untuk menonaktifkan dompet;
            saldo dikelola melalui transaksi.
          </p>
        )}
        {loading && (
          <p role="status" className="mb-4 text-sm text-muted">
            Memuat pembukuan…
          </p>
        )}
        <Card className="!p-0 overflow-hidden">
          <div className="table-scroll">
            <table className="text-left text-sm">
              <thead className="bg-primary/5 text-xs text-muted">
                <tr>
                  <th className="p-4">
                    {isTransaction(tab) ? "Transaksi" : "Nama"}
                  </th>
                  <th className="p-4">Keterangan</th>
                  {tab !== "categories" && (
                    <th className="table-amount p-4 text-right">
                      {tab === "wallets" ? "Saldo" : "Nominal"}
                    </th>
                  )}
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {visible.map((row) => (
                  <tr key={row[meta.key]}>
                    <td className="p-4">
                      <p className={isTransaction(tab) ? "table-description font-medium" : "font-medium"}>
                        {row.name || row.description || meta.label}
                      </p>
                      {isTransaction(tab) && (
                        <p className="mt-1 text-xs text-muted">
                          {formatDate(row.transaction_date, true)} ·{" "}
                          {row.attachments?.length || 0} gambar
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted">{describe(row)}</td>
                    {tab !== "categories" && (
                      <td className="table-amount p-4 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatRupiah(
                          tab === "wallets" ? row.balance : row.amount
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
                        {tab !== "wallets" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-700"
                            disabled={busy || blocked}
                            onClick={() =>
                              setDialog({
                                mode: "delete",
                                resource: tab,
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
          {!visible.length && !loading && (
            <p className="p-8 text-center text-sm text-muted">
              {query
                ? "Tidak ada data yang cocok."
                : "Belum ada data. Mulai dengan tombol tambah."}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 p-4 text-xs text-muted">
            <span>
              Halaman {currentPage} dari {pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </Card>
      </section>
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
    </DashboardLayout>
  );
}
