const uuid = (number) => `01900000-0000-7000-8000-${String(number).padStart(12, '0')}`

export const wallets = [
  { wallet_id: uuid(1), name: 'Bank Utama', type: 'bank', balance: '9025000.00', is_active: true },
  { wallet_id: uuid(2), name: 'Dompet Digital', type: 'ewallet', balance: '565000.00', is_active: true },
  { wallet_id: uuid(3), name: 'Uang Tunai', type: 'cash', balance: '675000.00', is_active: true },
]

export const categories = [
  { category_id: uuid(11), name: 'Gaji', type: 'income' },
  { category_id: uuid(12), name: 'Freelance', type: 'income' },
  { category_id: uuid(13), name: 'Belanja', type: 'expense' },
  { category_id: uuid(14), name: 'Makan & minum', type: 'expense' },
  { category_id: uuid(15), name: 'Tagihan', type: 'expense' },
]

export const incomes = [
  { income_id: uuid(21), wallet_id: uuid(1), amount: '1750000.00', transaction_date: '2026-09-10T03:00:00.000000Z', description: 'Proyek desain website', category_id: uuid(12), category: categories[1], income_wallet: wallets[0] },
  { income_id: uuid(22), wallet_id: uuid(1), amount: '8500000.00', transaction_date: '2026-09-01T02:00:00.000000Z', description: 'Gaji September', category_id: uuid(11), category: categories[0], income_wallet: wallets[0] },
]

export const expenses = [
  { expense_id: uuid(31), wallet_id: uuid(3), amount: '325000.00', transaction_date: '2026-09-10T05:30:00.000000Z', description: 'Belanja kebutuhan rumah', category_id: uuid(13), category: categories[2], expense_wallet: wallets[2] },
  { expense_id: uuid(32), wallet_id: uuid(2), amount: '185000.00', transaction_date: '2026-09-09T12:00:00.000000Z', description: 'Makan malam bersama', category_id: uuid(14), category: categories[3], expense_wallet: wallets[1] },
  { expense_id: uuid(33), wallet_id: uuid(1), amount: '475000.00', transaction_date: '2026-09-08T04:00:00.000000Z', description: 'Tagihan internet', category_id: uuid(15), category: categories[4], expense_wallet: wallets[0] },
]

export const transfers = [
  { transfer_id: uuid(41), from_wallet_id: uuid(1), to_wallet_id: uuid(2), amount: '750000.00', transaction_date: '2026-09-09T01:15:00.000000Z', description: 'Isi saldo dompet digital', transfer_from: wallets[0], transfer_to: wallets[1] },
]
