import GuestTransactionPage from '../../components/organisms/GuestTransactionPage'

export default function ExpensesPage(props) {
  return <GuestTransactionPage {...props} resource="expenses" title="Pengeluaran" withCategories />
}
