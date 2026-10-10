import { SOURCES } from '@/config/api'

/* ------------------------------------------------------------------
 * Расчёт выручки (перенесено из hw2: calculateRevenue.js)
 * ------------------------------------------------------------------ */

export function calculateTotalRevenue(sourceTransactions, currency) {
  if (Object.keys(currency.rates).length === 0) {
    throw new Error('Currency rates are not available')
  }

  // Складываем округлённые суммы строк в центах только для оплаченных транзакций (status === 'paid')
  const totalCents = sourceTransactions.reduce((acc, transaction) => {
    if (typeof transaction === 'object') {
      const status = String(transaction.status ?? transaction.type ?? '').toLowerCase()
      if (status && status !== 'paid') {
        return acc
      }
    }
    return acc + Math.round(calculateItemRevenue(transaction, currency) * 100)
  }, 0)

  return totalCents / 100
}

export function calculateItemRevenue(transaction, currency) {
  if (Object.keys(currency.rates).length === 0) {
    throw new Error('Currency rates are not available')
  }
  let sum = 0
  const currencyUSD = currency.rates

  if (typeof transaction === 'object') {
    if (transaction.currency.toUpperCase() === 'USD') {
      sum += transaction.amount
    } else if (currencyUSD[transaction.currency.toUpperCase()]) {
      sum += transaction.amount / currencyUSD[transaction.currency.toUpperCase()]
    }
  }

  if (typeof transaction === 'string') {
    if (transaction.split(' ')[1].toUpperCase() === 'USD') {
      sum += Number(transaction.split(' ')[0])
    } else if (currencyUSD[transaction.split(' ')[1].toUpperCase()]) {
      sum += Number(transaction.split(' ')[0]) / currencyUSD[transaction.split(' ')[1].toUpperCase()]
    }
  }

  return Number(sum.toFixed(2))
}

/* ------------------------------------------------------------------
 * Нормализация: оба источника приводятся к одному формату,
 * чтобы таблицы, графики и экспорт работали с единой моделью.
 * ------------------------------------------------------------------ */

const toCents = (value) => Math.round(value * 100)
const fromCents = (cents) => cents / 100

function getRate(currency, code) {
  if (code === 'USD') return 1
  const rate = Number(currency.rates[code])
  return Number.isFinite(rate) ? rate : null
}

function normalizeTransaction(raw, index, sourceId, currency) {
  const isString = typeof raw === 'string'
  const [amountPart, currencyPart] = isString ? raw.split(' ') : []
  const code = (isString ? currencyPart : raw.currency).toUpperCase()
  const rawStatus = isString ? null : (raw.status ?? raw.type ?? null)
  const status = rawStatus ? String(rawStatus).toLowerCase() : null
  const isPaid = isString ? true : status === 'paid'

  return {
    id: `${sourceId}-${index + 1}`,
    number: index + 1,
    source: sourceId,
    amount: isString ? Number(amountPart) : raw.amount,
    currency: code,
    status,
    isPaid,
    rate: getRate(currency, code),
    usd: calculateItemRevenue(raw, currency),
    raw,
  }
}

function summarize(transactions) {
  // Выручка считается только по оплаченным транзакциям (status: 'paid')
  const paidTransactions = transactions.filter((t) => t.isPaid)
  const totalCents = paidTransactions.reduce((acc, t) => acc + toCents(t.usd), 0)
  return {
    transactions,
    paidTransactions,
    count: transactions.length,
    paidCount: paidTransactions.length,
    total: fromCents(totalCents),
  }
}

function groupByCurrency(transactions) {
  const groups = new Map()
  for (const t of transactions) {
    const group = groups.get(t.currency) ?? { currency: t.currency, amount: 0, usdCents: 0, count: 0 }
    group.amount += t.amount
    group.usdCents += toCents(t.usd)
    group.count += 1
    groups.set(t.currency, group)
  }
  return [...groups.values()]
    .map(({ usdCents, ...rest }) => ({ ...rest, usd: fromCents(usdCents) }))
    .sort((a, b) => b.usd - a.usd)
}

/**
 * Отчёт за день — единственная структура, которую получают компоненты.
 * Хранится в кеше (в т.ч. в localStorage), поэтому содержит только сериализуемые данные.
 */
export function buildDayReport({ date, firstSource, secondSource, currency }) {
  const finance1 = summarize(
    firstSource.transactions.map((t, i) => normalizeTransaction(t, i, SOURCES.finance1.id, currency)),
  )
  const finance2 = summarize(
    secondSource.map((t, i) => normalizeTransaction(t, i, SOURCES.finance2.id, currency)),
  )
  const all = [...finance1.transactions, ...finance2.transactions]
  const allPaid = [...finance1.paidTransactions, ...finance2.paidTransactions]

  return {
    date,
    sources: { finance1, finance2 },
    total: fromCents(toCents(finance1.total) + toCents(finance2.total)),
    count: all.length,
    paidCount: allPaid.length,
    // В валютную аналитику и графики идут только оплаченные транзакции
    byCurrency: groupByCurrency(allPaid),
    rates: currency.rates,
    ratesDate: currency.date ?? null,
    fetchedAt: Date.now(),
  }
}

/** Отчёт за месяц из набора дневных отчётов (дни без данных = null) */
export function buildMonthReport(month, days, reportsByDate) {
  const rows = days.map((date) => {
    const report = reportsByDate[date] ?? null
    return {
      date,
      report,
      finance1: report?.sources.finance1.total ?? null,
      finance2: report?.sources.finance2.total ?? null,
      total: report?.total ?? null,
      count: report?.count ?? null,
    }
  })
  const withData = rows.filter((row) => row.report)
  const sumCents = (key) => withData.reduce((acc, row) => acc + toCents(row[key]), 0)

  return {
    month,
    rows,
    daysWithData: withData.length,
    total: fromCents(sumCents('total')),
    totals: { finance1: fromCents(sumCents('finance1')), finance2: fromCents(sumCents('finance2')) },
    count: withData.reduce((acc, row) => acc + row.count, 0),
    average: withData.length ? fromCents(Math.round(sumCents('total') / withData.length)) : null,
    byCurrency: groupByCurrency(withData.flatMap((row) => [
      ...row.report.sources.finance1.transactions,
      ...row.report.sources.finance2.transactions,
    ])),
  }
}
