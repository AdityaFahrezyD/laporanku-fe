// Keep arithmetic in integer cents so decimal API strings retain their precision.
export function toCents(value) {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

export function sumAmounts(records, field = 'amount') {
  return records.reduce((total, record) => total + toCents(record[field]), 0n)
}

export function formatRupiah(value) {
  const cents = typeof value === 'bigint' ? value : toCents(value)
  const whole = new Intl.NumberFormat('id-ID').format(cents / 100n)
  const fraction = cents % 100n
  return `Rp ${whole}${fraction ? `,${String(fraction).padStart(2, '0')}` : ''}`
}

export function formatDate(value, withTime = false) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value)) + (withTime ? ' WIB' : '')
}
