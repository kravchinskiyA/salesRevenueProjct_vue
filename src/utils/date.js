const pad = (n) => String(n).padStart(2, '0')

/** Date -> 'YYYY-MM-DD' в локальной зоне */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 'YYYY-MM-DD' -> Date (локальная полночь) */
export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

/** 'YYYY-MM-DD' -> 'YYYY-MM' */
export const toMonthKey = (iso) => iso.slice(0, 7)

export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toISODate(fromISODate(value)) === value
}

export function isValidMonthKey(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function addDays(iso, amount) {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function addMonths(monthKey, amount) {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + amount, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/** Все дни месяца: ['YYYY-MM-01', ...] */
export function daysOfMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  return Array.from({ length: count }, (_, i) => `${monthKey}-${pad(i + 1)}`)
}

const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

export const formatDay = (iso) => dayFormatter.format(fromISODate(iso))
export const formatDateTime = (timestamp) => dateTimeFormatter.format(new Date(timestamp))
export function formatMonth(monthKey) {
  const text = monthFormatter.format(fromISODate(`${monthKey}-01`)).replace(' г.', '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
