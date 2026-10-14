import audit from 'virtual:api-audit'
import { SOURCES_BASE_URL, CURRENCY_BASE_URL } from '@/config/api'

const definitions = [
  { id: 'finance1', title: 'Источник 1', role: 'Транзакции', endpoint: `${SOURCES_BASE_URL}/finance1`, description: 'Суммы, валюты и статусы транзакций. В выручку входят только оплаченные операции.', format: 'Объект с массивом transactions', accent: 'var(--accent)' },
  { id: 'finance2', title: 'Источник 2', role: 'Транзакции', endpoint: `${SOURCES_BASE_URL}/finance2`, description: 'Суммы и валюты в строковом формате. Операции этого источника считаются оплаченными.', format: 'Массив строк «120.50 USD»', accent: 'var(--accent-2)' },
  { id: 'currency', title: 'CurrencyFreaks', role: 'Курсы валют', endpoint: `${CURRENCY_BASE_URL}/latest`, description: 'Курсы для пересчёта выручки в USD. Для прошлых дат используется /historical; аудит проверял /latest.', format: 'Курсы валют относительно USD', accent: 'var(--success)' },
]

export const auditTimestamp = audit.timestamp
export const dataSources = definitions.map((source) => {
  const result = audit.sources[source.id] || { checked: false, issues: [], total: 0 }
  const critical = result.issues.some((issue) => issue.severity === 'CRITICAL')
  const warning = result.issues.some((issue) => issue.severity === 'WARNING')
  const failed = result.checked && !(result.status >= 200 && result.status < 300)
  return { ...source, ...result, state: !result.checked ? 'unknown' : critical || failed ? 'critical' : warning ? 'warning' : 'healthy' }
})
