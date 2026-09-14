const alphabetical = new Intl.Collator('id', { sensitivity: 'base' })

export function categoriesFor(resource, records = []) {
  const type = { incomes: 'income', expenses: 'expense' }[resource]
  if (!type) return []
  return records.filter(record => record.type === type).sort((a, b) => alphabetical.compare(a.name, b.name) || a.category_id.localeCompare(b.category_id))
}
