import { SOURCES } from '@/config/api'
import { statusLabel } from './format'

/* ------------------------------------------------------------------
 * Экспорт отчётов: CSV, Excel (xlsx), PNG графика.
 * xlsx подгружается динамически — не увеличивает стартовый бандл.
 * ------------------------------------------------------------------ */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** CSV: «;» и BOM — чтобы русский Excel открывал файл корректно */
export function exportCsv(rows, filename) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const csv = rows.map((row) => row.map(escape).join(';')).join('\r\n')
  downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), filename)
}

/** sheets: [{ name, rows: [[...], ...] }] */
export async function exportXlsx(sheets, filename) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = rows[0]?.map((_, col) => ({
      wch: Math.max(...rows.map((r) => String(r[col] ?? '').length), 8) + 2,
    }))
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  })
  XLSX.writeFile(workbook, filename)
}

/** PNG графика с непрозрачным фоном (canvas Chart.js прозрачный) */
export function exportChartPng(canvas, filename, background = '#141625') {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0)
  out.toBlob((blob) => blob && downloadBlob(blob, filename), 'image/png')
}

/* ---------- Табличные представления отчётов ---------- */

const TRANSACTION_HEADER = ['Источник', '№', 'Статус', 'Сумма', 'Валюта', 'Курс к USD', 'Итого, USD']

const transactionRow = (t) => [
  SOURCES[t.source].title,
  t.number,
  statusLabel(t.status),
  t.amount,
  t.currency,
  t.rate,
  t.usd,
]

export function dayReportToRows(report) {
  const { finance1, finance2 } = report.sources
  return {
    summary: [
      ['Показатель', 'Значение'],
      ['Дата', report.date],
      [`${SOURCES.finance1.title}, USD`, finance1.total],
      [`${SOURCES.finance1.title}, транзакций`, finance1.count],
      [`${SOURCES.finance2.title}, USD`, finance2.total],
      [`${SOURCES.finance2.title}, транзакций`, finance2.count],
      ['Всего, USD', report.total],
      ['Всего транзакций', report.count],
    ],
    transactions: [
      TRANSACTION_HEADER,
      ...finance1.transactions.map(transactionRow),
      ...finance2.transactions.map(transactionRow),
    ],
    byCurrency: [
      ['Валюта', 'Сумма в валюте', 'Транзакций', 'Итого, USD'],
      ...report.byCurrency.map((c) => [c.currency, c.amount, c.count, c.usd]),
    ],
  }
}

export function monthReportToRows(report) {
  return {
    days: [
      ['Дата', `${SOURCES.finance1.title}, USD`, `${SOURCES.finance2.title}, USD`, 'Транзакций', 'Всего, USD'],
      ...report.rows
        .filter((row) => row.report)
        .map((row) => [row.date, row.finance1, row.finance2, row.count, row.total]),
      ['Итого', report.totals.finance1, report.totals.finance2, report.count, report.total],
    ],
    byCurrency: [
      ['Валюта', 'Сумма в валюте', 'Транзакций', 'Итого, USD'],
      ...report.byCurrency.map((c) => [c.currency, c.amount, c.count, c.usd]),
    ],
  }
}
