// Canonical values use a decimal point; only the input display uses Indonesian separators.
export function formatMoneyInput(value) {
  if (!/^\d*(\.\d*)?$/.test(value)) return value
  const [whole, fraction] = value.split('.')
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : ',' + fraction)
}

export function parseMoneyInput(display) {
  return display.replaceAll('.', '').replaceAll(',', '.')
}

export function moneyInputError(value, min = '0') {
  if (!value) return 'Nominal wajib diisi.'
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'Gunakan angka dengan maksimal dua desimal setelah koma.'
  const cents = (text) => {
    const [whole, fraction = ''] = text.split('.')
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  }
  if (cents(value) < cents(min)) return min === '0' ? 'Saldo awal minimal 0.' : 'Nominal minimal 0,01.'
  if (cents(value) > 999999999999999n) return 'Nominal maksimal 9.999.999.999.999,99.'
  return ''
}
