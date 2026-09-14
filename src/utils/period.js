const wibDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
})
const monthLabel = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', month: 'short', year: 'numeric' })
const dayLabel = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

export function dateInWib(value = new Date()) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = Object.fromEntries(wibDate.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function periodError(period) {
  if (['all', 'this-month', 'this-week',].includes(period.mode)) return ''
  if (period.mode === 'month') return validDate(`${period.month}-01`) ? '' : 'Pilih bulan dan tahun yang valid.'
  if (period.mode === 'range') {
    if (!validDate(period.start) || !validDate(period.end)) return 'Isi tanggal mulai dan akhir yang valid.'
    if (period.end < period.start) return 'Tanggal akhir tidak boleh mendahului tanggal mulai.'
    return ''
  }
  return 'Pilih periode yang valid.'
}

export function periodBounds(period, now = new Date()) {
  if (periodError(period)) throw new RangeError(periodError(period))
  if (period.mode === 'all') return null
  if (period.mode === 'range') return { start: period.start, end: period.end }
  const today = dateInWib(now)
  if (period.mode === 'this-week') {
    const start = new Date(`${today}T00:00:00Z`)
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  const month = period.mode === 'month' ? period.month : today.slice(0, 7)
  const end = new Date(`${month}-01T00:00:00Z`)
  end.setUTCMonth(end.getUTCMonth() + 1, 0)
  return { start: `${month}-01`, end: end.toISOString().slice(0, 10) }
}

export function filterByPeriod(records, period, now = new Date()) {
  const bounds = periodBounds(period, now)
  if (!bounds) return records
  return records.filter((record) => {
    const date = dateInWib(record.transaction_date)
    return date >= bounds.start && date <= bounds.end
  })
}

export function periodLabel(period) {
  if (period.mode === 'this-month') return 'Bulan ini'
  if (period.mode === 'this-week') return 'Minggu ini'
  if (period.mode === 'all') return 'Semua waktu'
  if (period.mode === 'month') return monthLabel.format(new Date(`${period.month}-01T00:00:00Z`))
  const start = dayLabel.format(new Date(`${period.start}T00:00:00Z`))
  return period.start === period.end ? start : `${start} – ${dayLabel.format(new Date(`${period.end}T00:00:00Z`))}`
}
