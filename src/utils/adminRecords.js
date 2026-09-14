const walletLabels = {
  bank: "Rekening bank",
  cash: "Tunai",
  ewallet: "E-wallet",
};

export function describeRecord(row, resource) {
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
