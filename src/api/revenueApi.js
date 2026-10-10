import { fetchData, buildUrl } from './http'
import { SOURCES_BASE_URL, CURRENCY_BASE_URL, CURRENCY_API_KEY } from '@/config/api'
import { FEATURES } from '@/config/features'
import { todayISO } from '@/utils/date'

/**
 * Слой доступа к API. Компоненты не знают про URL и ключи — только про функции.
 *
 * Все функции принимают дату 'YYYY-MM-DD'. Пока FEATURES.dateSwitching выключен,
 * дата в запрос не передаётся (API её не поддерживает) и сервер отдаёт текущие данные.
 * Когда API научится — включите флаг; при необходимости поправьте имя параметра здесь.
 */
const dateParam = (date) => (FEATURES.dateSwitching ? { date } : {})

export function getFirstSource(date) {
  return fetchData(buildUrl(`${SOURCES_BASE_URL}/finance1`, dateParam(date)))
}

export function getSecondSource(date) {
  return fetchData(buildUrl(`${SOURCES_BASE_URL}/finance2`, dateParam(date)))
}

/** Курсы валют к USD: за сегодня — latest, за прошлые дни — historical */
export function getCurrencyRates(date) {
  const isToday = !date || date === todayISO()
  const url = isToday
    ? buildUrl(`${CURRENCY_BASE_URL}/latest`, { apikey: CURRENCY_API_KEY })
    : buildUrl(`${CURRENCY_BASE_URL}/historical`, { apikey: CURRENCY_API_KEY, date })

  // currencyfreaks не принимает x-api-key источников — отправляем без лишних заголовков
  return fetchData(url, { headers: { 'x-api-key': undefined } })
}
