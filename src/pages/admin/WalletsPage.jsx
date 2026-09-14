import AdminResourcePage from '../../components/organisms/AdminResourcePage'

export default function WalletsPage(props) {

  return (
    <AdminResourcePage {...props} resource="wallets" amountLabel="Saldo" amountField="balance" canDelete={false}>
      <p className="mb-4 text-sm text-muted">Dompet bersifat permanen. Gunakan Edit untuk menonaktifkan dompet; saldo dikelola melalui transaksi.</p>
    </AdminResourcePage>
  );
}
