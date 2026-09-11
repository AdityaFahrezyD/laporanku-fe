import Card from "../molecules/Card";
import Icon from "../atoms/Icon";
import { formatRupiah } from "../../utils/format";

const walletTypes = {
  bank: "Rekening bank",
  ewallet: "E-wallet",
  cash: "Tunai",
};

export default function WalletCards({ wallets = [], className = "mt-9" }) {
  return (
    <section
      id="dompet"
      aria-labelledby="wallet-heading"
      className={className}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="wallet-heading" className="text-lg font-semibold">
          Dompet
        </h2>
        <span className="text-xs text-muted">
          {wallets.filter((wallet) => wallet.is_active).length} aktif ·{" "}
          {wallets.length} dompet
        </span>
      </div>
      {wallets.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            Belum ada dompet dalam pembukuan ini.
          </p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {wallets.map((wallet) => (
          <Card key={wallet.wallet_id}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-base">
                <Icon name={wallet.type === "bank" ? "bank" : "wallet"} />
              </span>
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold">
                  {wallet.name}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {walletTypes[wallet.type] || wallet.type}
                </p>
              </div>
              <span
                className={`ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] ${wallet.is_active
                  ? "bg-primary/8 text-primary"
                  : "bg-base text-muted"
                  }`}
              >
                {wallet.is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <p className="mt-6 text-xs text-muted">Saldo tersedia</p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
              {formatRupiah(wallet.balance)}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
