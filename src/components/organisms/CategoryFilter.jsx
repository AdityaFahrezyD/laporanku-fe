import { categoriesFor } from '../../utils/categories'

export default function CategoryFilter({ resource, categories, value, onChange, disabled = false }) {
  if (!['incomes', 'expenses'].includes(resource)) return null
  return <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-muted sm:w-56">
    <span>Kategori</span>
    <select aria-label="Filter kategori" value={value} onChange={event => onChange(event.target.value)} disabled={disabled || !categories}
      className="w-full min-w-0 rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-sm text-primary disabled:opacity-60">
      <option value="">Semua kategori</option>
      {categoriesFor(resource, categories).map(category => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}
    </select>
  </label>
}
