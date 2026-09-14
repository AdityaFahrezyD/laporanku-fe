import GuestTransactionPage from '../../components/organisms/GuestTransactionPage'

export default function IncomesPage(props) {
  return <GuestTransactionPage {...props} resource="incomes" title="Pemasukan" withCategories />
}
