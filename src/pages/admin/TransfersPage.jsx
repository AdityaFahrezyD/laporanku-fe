import AdminResourcePage from '../../components/organisms/AdminResourcePage'

export default function TransfersPage(props) {

  return (
    <AdminResourcePage {...props} resource="transfers" transaction amountLabel="Nominal" />
  );
}
