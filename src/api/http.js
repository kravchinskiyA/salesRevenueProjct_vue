import { SOURCES_API_KEY } from '@/config/api'

/**
 * Базовый HTTP-запрос (перенесён из hw2: helpers/fetchData.js).
 * По умолчанию добавляет x-api-key источников; заголовки можно переопределить.
 */
export async function fetchData(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': SOURCES_API_KEY,
  }
  // заголовок со значением undefined не отправляется — так можно отключить дефолтный
  const headers = Object.fromEntries(
    Object.entries({ ...defaultHeaders, ...(options.headers || {}) }).filter(
      ([, value]) => value !== undefined,
    ),
  )
  const config = { ...options, headers }

  const response = await fetch(url, config)

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`)
  }

  return response.json()
}

/** Собирает URL с query-параметрами, пропуская пустые значения */
export function buildUrl(base, params = {}) {
  const url = new URL(base)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}
