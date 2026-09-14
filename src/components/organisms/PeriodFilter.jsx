import { useId, useState } from 'react'
import Button from '../atoms/Button'
import Modal from './Modal'
import { dateInWib, periodError, periodLabel } from '../../utils/period'

const choices = [
  ['all', 'Semua waktu'], ['this-month', 'Bulan ini'], ['this-week', 'Minggu ini'],
  ['month', 'Pilih bulan'], ['range', 'Rentang tanggal'],
]
const months = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1))),
}))
const inputClass = 'mt-1 block w-full min-w-0 rounded-xl border border-primary/20 bg-white px-3 py-2.5 text-sm'

export default function PeriodFilter({ value, onChange, disabled = false }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const formId = useId()
  const close = () => { setDraft(null); setError('') }
  function open() {
    const today = dateInWib()
    setDraft({ month: today.slice(0, 7), start: today, end: today, ...value })
    setError('')
  }
  function update(field, next) {
    setDraft((old) => ({ ...old, [field]: next }))
    setError('')
  }
  function apply(event) {
    event.preventDefault()
    const next = draft.mode === 'month' ? { mode: draft.mode, month: draft.month }
      : draft.mode === 'range' ? { mode: draft.mode, start: draft.start, end: draft.end } : { mode: draft.mode }
    const message = periodError(next)
    if (message) { setError(message); return }
    onChange(next)
    close()
  }
  return <>
    <Button variant="outline" size="sm" disabled={disabled} onClick={open}
      aria-label={`Filter periode: ${periodLabel(value)}`} aria-haspopup="dialog"
      className="!shrink min-w-0 max-w-[55%] bg-white text-left">
      <span className="min-w-0 break-words">{periodLabel(value)}</span><span aria-hidden="true">▾</span>
    </Button>
    <Modal open={draft !== null} onClose={close} title="Filter periode" variant="sheet"
      footer={<><Button variant="outline" onClick={close}>Batal</Button><Button type="submit" form={formId}>Terapkan</Button></>}>
      {draft && <form id={formId} onSubmit={apply}>
        <fieldset className="space-y-2">
          <legend className="sr-only">Periode transaksi</legend>
          {choices.map(([mode, label]) => <label key={mode} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${draft.mode === mode ? 'border-primary bg-primary/5' : 'border-primary/10'}`}>
            <input type="radio" name={formId} value={mode} checked={draft.mode === mode} onChange={() => update('mode', mode)} className="accent-primary" />
            {label}
          </label>)}
        </fieldset>
        {draft.mode === 'month' && <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="min-w-0 text-sm">Bulan<select className={inputClass} value={draft.month.split('-')[1]} onChange={(event) => update('month', `${draft.month.split('-')[0]}-${event.target.value}`)}>
            {months.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="min-w-0 text-sm">Tahun<input type="number" required min="1" max="9999" className={inputClass} value={draft.month.split('-')[0].replace(/^0+/, '')}
            onChange={(event) => update('month', `${event.target.value.padStart(4, '0')}-${draft.month.split('-')[1]}`)} /></label>
        </div>}
        {draft.mode === 'range' && <div className="mt-4 grid gap-3">
          <label className="min-w-0 text-sm">Tanggal mulai<input type="date" required min="0001-01-01" max="9999-12-31" className={inputClass} value={draft.start} onChange={(event) => update('start', event.target.value)} /></label>
          <label className="min-w-0 text-sm">Tanggal akhir<input type="date" required min="0001-01-01" max="9999-12-31" className={inputClass} value={draft.end} onChange={(event) => update('end', event.target.value)} /></label>
        </div>}
        <p className="mt-4 text-xs text-muted">Tanggal mengikuti WIB. Minggu dimulai pada Senin.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </form>}
    </Modal>
  </>
}
