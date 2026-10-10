/** Склонение: plural(5, 'транзакция', 'транзакции', 'транзакций') — перенесено из hw2 */
export function plural(count, one, few, many) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod100 >= 11 && mod100 <= 14) {
    return many
  }

  if (mod10 === 1) {
    return one
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }

  return many
}

export const transactionsLabel = (count) =>
  `${count} ${plural(count, 'транзакция', 'транзакции', 'транзакций')}`

const usdFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD' })
const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const rateFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 })

export const formatUsd = (value) => (Number.isFinite(value) ? usdFormatter.format(value) : '—')
export const formatNumber = (value) => (Number.isFinite(value) ? numberFormatter.format(value) : '—')
export const formatRate = (value) => (Number.isFinite(value) ? rateFormatter.format(value) : '—')

export const formatPercent = (value) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(1).replace('.', ',')} %` : '—'

export const TRANSACTION_STATUS = Object.freeze({
  paid: { label: 'Оплачено', tone: 'success' },
  pending: { label: 'Ожидает', tone: 'warning' },
  rejected: { label: 'Отклонено', tone: 'danger' },
})

export const statusLabel = (status) => TRANSACTION_STATUS[status]?.label ?? status ?? '—'
