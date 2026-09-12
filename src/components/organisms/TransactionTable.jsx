import Button from "../atoms/Button";
import Icon from "../atoms/Icon";
import Card from "../molecules/Card";
import { formatDate, formatRupiah } from "../../utils/format";

export default function TransactionTable({ transactions, types, onDetail, title, emptyMessage }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="table-scroll">
        <table aria-label={title} className="text-left text-sm">
          <thead className="bg-primary/5 text-xs text-muted">
            <tr>
              <th className="p-4">Transaksi</th>
              <th className="p-4">Dompet</th>
              <th className="p-4">Tanggal</th>
              <th className="p-4 text-right">Nominal</th>
              <th className="p-4 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {transactions.map((transaction) => {
              const type = types[transaction.type];
              const name = transaction.description || type.label;
              return (
                <tr key={`${transaction.type}:${transaction.id}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex ${type.color}`}>
                        <Icon name={type.icon} />
                      </span>
                      <div className="table-description">
                        <p className="font-medium">{name}</p>
                        <p className="mt-1 whitespace-nowrap text-xs text-muted">
                          {transaction.category?.name || (transaction.type === "transfer" ? "Antardompet" : "Tanpa kategori")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-muted">{transaction.walletName}</td>
                  <td className="whitespace-nowrap p-4 text-xs text-muted">{formatDate(transaction.transaction_date)}</td>
                  <td className={`whitespace-nowrap p-4 text-right font-semibold tabular-nums ${transaction.type === "expense" ? "text-secondary" : "text-primary"}`}>
                    <span className="sr-only">{type.label}: </span>
                    {type.prefix}{formatRupiah(transaction.amount)}
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" aria-label={`Detail ${name}`} onClick={() => onDetail(transaction)}>
                      Detail<Icon name="chevron" className="size-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {transactions.length === 0 && <p className="p-6 text-sm text-muted">{emptyMessage}</p>}
    </Card>
  );
}
