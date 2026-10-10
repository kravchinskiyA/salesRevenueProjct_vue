import { getFirstSource, getSecondSource, getCurrencyRates } from '@/api/revenueApi'
import { validateFirstSource, validateSecondSource, validateCurrencyRates } from './validators'
import { buildDayReport } from './revenue'

/** Загружает все данные за день, валидирует и собирает отчёт */
export async function fetchDayReport(date) {
  const [firstSource, secondSource, currency] = await Promise.all([
    getFirstSource(date),
    getSecondSource(date),
    getCurrencyRates(date),
  ])

  validateFirstSource(firstSource)
  validateSecondSource(secondSource)
  validateCurrencyRates(currency)

  return buildDayReport({ date, firstSource, secondSource, currency })
}
