import { formatRupiah } from '../../utils/format'

export default function TransactionTotal({ total }) {
  return <div aria-label="Total hasil filter" role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-primary/10 bg-primary/5 p-4 text-sm">
    <span className="text-muted">Total hasil filter</span>
    <span className="min-w-0 break-words font-semibold tabular-nums">{formatRupiah(total)}</span>
  </div>
}
