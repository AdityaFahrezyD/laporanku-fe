import AdminResourcePage from '../../components/organisms/AdminResourcePage'
import CategoryFilter from '../../components/organisms/CategoryFilter'

export default function ExpensesPage(props) {

  return (
    <AdminResourcePage {...props} resource="expenses" transaction amountLabel="Nominal">
      <div className="mb-4"><CategoryFilter resource="expenses" categories={props.dashboard.data?.categories} value={props.filters.categoryId} disabled={props.actions.blocked} onChange={value => { props.filters.setCategoryId(value); props.filters.setPage(1); }} /></div>
    </AdminResourcePage>
  );
}
