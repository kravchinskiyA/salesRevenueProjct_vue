#!/usr/bin/env node

/**
 * Универсальный аудитор финансовых API (Universal Financial API Auditor).
 * Работает на основе декларативного конфигурационного файла (audit.config.json),
 * проверяет соответствие ответов контракту, выявляет аномалии данных и генерирует
 * отчеты для backend-команды в форматах Markdown и PDF.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// 1. Разбор аргументов командной строки
const args = process.argv.slice(2)
function getArg(flag, defaultValue = null) {
  const index = args.indexOf(flag)
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue
}

const configPath = path.resolve(process.cwd(), getArg('--config', '.agents/skills/financial-api-audit/audit.config.json'))
const outDir = path.resolve(process.cwd(), getArg('--out-dir', 'reports'))
const targetDate = getArg('--date', null)
const offlineFile = getArg('--file', null)
const targetEndpointId = getArg('--endpoint', null)
const failOn = getArg('--fail-on', null) // 'critical' | 'warning'
const minScore = Number(getArg('--min-score', '0'))
const skipPdf = args.includes('--no-pdf')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

// 2. Чтение конфигурации
if (!fs.existsSync(configPath)) {
  console.error(`❌ Ошибка: Конфигурационный файл не найден: ${configPath}`)
  process.exit(1)
}

const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

// 3. Загрузка переменных окружения
if (rawConfig.envFile) {
  const envFilePath = path.resolve(process.cwd(), rawConfig.envFile)
  if (fs.existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envFilePath)
    } catch {
      // игнорируем ошибку парсинга
    }
  }
}

/** Подстановка переменных окружения вида ${VAR:-default} или ${VAR} */
function interpolate(template) {
  if (typeof template !== 'string') return template
  return template.replace(/\$\{([a-zA-Z0-9_]+)(?::-([^}]*))?\}/g, (_, varName, defVal) => {
    return process.env[varName] !== undefined ? process.env[varName] : (defVal ?? '')
  })
}

function interpolateObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(interpolateObject)
  const res = {}
  for (const [key, val] of Object.entries(obj)) {
    res[key] = typeof val === 'string' ? interpolate(val) : interpolateObject(val)
  }
  return res
}

const config = interpolateObject(rawConfig)

// Стандартные коды ISO 4217
const ISO_4217_CODES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'RUB', 'KRW', 'SGD', 'NZD', 'MXN', 'HKD', 'TRY', 'ZAR', 'SEK', 'NOK',
  'PLN', 'DKK', 'CZK', 'HUF', 'ILS', 'THB', 'IDR', 'MYR', 'PHP', 'AED',
  'SAR', 'CLP', 'COP', 'PEN', 'KZT', 'UAH', 'VND', 'EGP', 'QAR', 'KWD'
])

/** Выполнение HTTP-запроса с таймингом */
async function fetchEndpoint(url, options = {}) {
  const start = performance.now()
  let status = 0
  let statusText = ''
  let responseHeaders = {}
  let data = null
  let rawText = ''
  let error = null

  try {
    const res = await fetch(url, options)
    status = res.status
    statusText = res.statusText
    responseHeaders = Object.fromEntries(res.headers.entries())
    rawText = await res.text()
    try {
      data = JSON.parse(rawText)
    } catch {
      data = rawText
    }
  } catch (err) {
    error = err.message
  }

  const durationMs = Math.round(performance.now() - start)
  return { url, status, statusText, durationMs, headers: responseHeaders, data, rawText, error }
}

/** Универсальный движок аудита */
class UniversalApiAuditor {
  constructor(cfg) {
    this.cfg = cfg
    this.issues = []
    this.stats = {
      endpointsChecked: 0,
      totalIssues: 0,
      critical: 0,
      warning: 0,
      info: 0,
    }
    this.responses = {}
    this.availableRates = []
  }

  addIssue({ endpoint, severity, code, message, expected, actual, example = null, impact, recommendation }) {
    this.issues.push({
      endpoint,
      severity, // 'CRITICAL' | 'WARNING' | 'INFO'
      code,
      message,
      expected,
      actual,
      example,
      impact,
      recommendation,
    })
    this.stats.totalIssues += 1
    if (severity === 'CRITICAL') this.stats.critical += 1
    if (severity === 'WARNING') this.stats.warning += 1
    if (severity === 'INFO') this.stats.info += 1
  }

  async run() {
    console.log(`\n🔍 [Universal API Audit] Запуск проверки: "${this.cfg.title}"...\n`)

    // 1. Опрос сервиса котировок (если включен)
    if (this.cfg.currencyService?.enabled) {
      console.log(`📡 Получение справочника котировок валют...`)
      const curRes = await fetchEndpoint(this.cfg.currencyService.url)
      this.responses['currency'] = {
        status: curRes.status,
        durationMs: curRes.durationMs,
        count: curRes.data?.rates ? Object.keys(curRes.data.rates).length : 0,
      }
      if (curRes.status === 200 && curRes.data?.rates) {
        this.availableRates = Object.keys(curRes.data.rates)
      } else {
        this.addIssue({
          endpoint: 'currency-service',
          severity: 'CRITICAL',
          code: 'CURRENCY_RATES_UNAVAILABLE',
          message: `Сервис валютных курсов недоступен (${curRes.status || curRes.error})`,
          expected: 'HTTP 200 с объектом rates',
          actual: curRes.error || `HTTP ${curRes.status}`,
          impact: 'Невозможно конвертировать выручку в базовую валюту.',
          recommendation: 'Проверить квоту и доступность currencyfreaks.',
        })
      }
    }

    // 2. Режим офлайн-файла
    if (offlineFile) {
      console.log(`📁 Аудит локального файла: ${offlineFile}`)
      const raw = fs.readFileSync(path.resolve(process.cwd(), offlineFile), 'utf-8')
      const parsed = JSON.parse(raw)
      const epConfig = this.cfg.endpoints.find((e) => e.id === targetEndpointId) || this.cfg.endpoints[0]
      this.auditEndpointData(epConfig, parsed, 200, 0)
      return this.compileResults()
    }

    // 3. Проверка зарегистрированных эндпоинтов
    for (const ep of this.cfg.endpoints) {
      if (targetEndpointId && ep.id !== targetEndpointId) continue

      console.log(`📡 Проверка эндпоинта: ${ep.name} (${ep.url})...`)
      const res = await fetchEndpoint(ep.url, {
        method: ep.method || 'GET',
        headers: ep.headers || {},
      })
      this.stats.endpointsChecked += 1
      this.responses[ep.id] = {
        status: res.status,
        durationMs: res.durationMs,
        length: Array.isArray(res.data) ? res.data.length : (Array.isArray(res.data?.[ep.root?.collectionProperty]) ? res.data[ep.root.collectionProperty].length : 1),
      }

      // Проверка SLA задержки
      const maxSla = ep.slaMs || this.cfg.slaMsDefault || 1500
      if (res.durationMs > maxSla) {
        this.addIssue({
          endpoint: ep.name,
          severity: 'INFO',
          code: 'LATENCY_SLA_EXCEEDED',
          message: `Время ответа (${res.durationMs} ms) превышает допустимый порог (${maxSla} ms)`,
          expected: `< ${maxSla} ms`,
          actual: `${res.durationMs} ms`,
          impact: 'Замедление загрузки данных в интерфейсе пользователя.',
          recommendation: 'Оптимизировать запрос или настроить серверное кеширование.',
        })
      }

      // Проверка HTTP-статуса
      if (res.status !== 200) {
        this.addIssue({
          endpoint: ep.name,
          severity: 'CRITICAL',
          code: 'HTTP_ERROR',
          message: `Сервер вернул ошибку HTTP ${res.status}`,
          expected: 'HTTP 200 OK',
          actual: `HTTP ${res.status} (${res.statusText})`,
          impact: 'Данные эндпоинта полностью недоступны клиенту.',
          recommendation: 'Проверить доступность и логи бэкенда.',
        })
        continue
      }

      // Валидация данных по декларативным правилам
      this.auditEndpointData(ep, res.data, res.status, res.durationMs)

      // Проверка авторизации (Auth Guard)
      if (ep.authCheck?.enabled) {
        console.log(`🔒 Проверка защищенности ${ep.name} без ключей авторизации...`)
        const unauthRes = await fetchEndpoint(ep.url, { method: ep.method || 'GET' })
        const expectedCodes = ep.authCheck.expectedStatus || [401, 403]
        if (!expectedCodes.includes(unauthRes.status)) {
          this.addIssue({
            endpoint: ep.name,
            severity: 'CRITICAL',
            code: 'AUTH_ENFORCEMENT_FAILED',
            message: `Эндпоинт доступен без заголовков авторизации (HTTP ${unauthRes.status})`,
            expected: `HTTP ${expectedCodes.join(' или ')}`,
            actual: `HTTP ${unauthRes.status}`,
            impact: 'Угроза безопасности: утечка данных неавторизованным клиентам.',
            recommendation: 'Включить проверку ключа API в middleware бэкенда.',
          })
        }
      }
    }

    return this.compileResults()
  }

  auditEndpointData(ep, data, status, durationMs) {
    const rootConfig = ep.root || {}
    const expectedRootType = rootConfig.type || 'object'

    // Проверка корневого типа
    if (expectedRootType === 'array') {
      if (!Array.isArray(data)) {
        this.addIssue({
          endpoint: ep.name,
          severity: 'CRITICAL',
          code: 'INVALID_ROOT_ARRAY',
          message: 'Корневой ответ должен быть массивом',
          expected: 'Array',
          actual: typeof data,
          impact: 'Клиентский парсер выбрасывает исключение TypeError.',
          recommendation: 'Возвращать массив элементов.',
        })
        return
      }
      this.auditItems(ep, data)
      return
    }

    if (expectedRootType === 'object') {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        this.addIssue({
          endpoint: ep.name,
          severity: 'CRITICAL',
          code: 'INVALID_ROOT_OBJECT',
          message: 'Корневой ответ должен быть JSON-объектом',
          expected: 'JSON Object',
          actual: Array.isArray(data) ? 'Array' : typeof data,
          impact: 'Сбой валидатора при распаковке полей.',
          recommendation: 'Возвращать корневой JSON-объект.',
        })
        return
      }

      // Проверка на посторонние поля (Data Pollution / PII leak)
      if (rootConfig.allowedProperties && Array.isArray(rootConfig.allowedProperties)) {
        const extraKeys = Object.keys(data).filter((k) => !rootConfig.allowedProperties.includes(k))
        if (extraKeys.length > 0) {
          this.addIssue({
            endpoint: ep.name,
            severity: 'WARNING',
            code: 'UNEXPECTED_ROOT_FIELDS',
            message: `Обнаружены посторонние поля верхнего уровня: ${extraKeys.join(', ')}`,
            expected: `Только поля: ${rootConfig.allowedProperties.join(', ')}`,
            actual: `Присутствуют: ${JSON.stringify(extraKeys)}`,
            example: JSON.stringify(Object.fromEntries(extraKeys.map((k) => [k, data[k]]))),
            impact: 'Загрязнение контракта, утечка нерелевантных персональных/адресных данных (PII).',
            recommendation: 'Удалить лишние данные или вынести их в соответствующий доменный эндпоинт.',
          })
        }
      }

      // Проверка коллекции внутри объекта
      if (rootConfig.collectionProperty) {
        const collection = data[rootConfig.collectionProperty]
        if (!Array.isArray(collection)) {
          this.addIssue({
            endpoint: ep.name,
            severity: 'CRITICAL',
            code: 'COLLECTION_NOT_ARRAY',
            message: `Свойство "${rootConfig.collectionProperty}" должно быть массивом`,
            expected: `Array в поле "${rootConfig.collectionProperty}"`,
            actual: typeof collection,
            impact: 'Невозможно итерироваться по элементам коллекции.',
            recommendation: `Всегда возвращать массив в свойстве "${rootConfig.collectionProperty}".`,
          })
          return
        }
        this.auditItems(ep, collection)
      }
    }
  }

  auditItems(ep, items) {
    const itemConfig = ep.item || {}
    const standardStatuses = this.cfg.standardStatuses || ['paid', 'pending', 'failed', 'cancelled', 'refunded']

    items.forEach((item, idx) => {
      const rowId = `${ep.id}[${idx}]`

      // 1. Строковый формат элемента (например: "300 usd")
      if (itemConfig.type === 'string') {
        if (typeof item !== 'string') {
          this.addIssue({
            endpoint: ep.name,
            severity: 'CRITICAL',
            code: 'ITEM_NOT_STRING',
            message: `Элемент списка должен быть строкой (${rowId})`,
            expected: 'string',
            actual: typeof item,
            example: JSON.stringify(item),
            impact: 'Падение методов строкового парсинга.',
            recommendation: 'Сериализовать элементы как строки.',
          })
          return
        }

        if (itemConfig.pattern) {
          const reg = new RegExp(itemConfig.pattern)
          const match = item.trim().match(reg)
          if (!match) {
            this.addIssue({
              endpoint: ep.name,
              severity: 'CRITICAL',
              code: 'MALFORMED_STRING_PATTERN',
              message: `Строка не соответствует ожидаемому шаблону "${itemConfig.pattern}" (${rowId})`,
              expected: 'Формат "<amount> <CURRENCY>" (например: "150.00 USD")',
              actual: item,
              example: item,
              impact: 'Ошибка разделения суммы и валюты.',
              recommendation: 'Соблюдать строгий формат разделителей.',
            })
            return
          }

          if (itemConfig.parsedFields) {
            const amountVal = Number(match[itemConfig.parsedFields.amountIndex || 1])
            const currencyVal = match[itemConfig.parsedFields.currencyIndex || 2]

            // Проверка суммы
            if (Number.isNaN(amountVal)) {
              this.addIssue({
                endpoint: ep.name,
                severity: 'CRITICAL',
                code: 'INVALID_PARSED_AMOUNT',
                message: `Невозможно разобрать числовое значение суммы (${rowId})`,
                expected: 'Положительное число',
                actual: match[1],
                example: item,
                impact: 'NaN в финансовых вычислениях.',
                recommendation: 'Использовать точку как десятичный разделитель, убрать спецсимволы.',
              })
            } else if (itemConfig.parsedFields.positive && amountVal <= 0) {
              this.addIssue({
                endpoint: ep.name,
                severity: 'WARNING',
                code: 'NON_POSITIVE_AMOUNT',
                message: `Сумма транзакции меньше или равна нулю: ${amountVal} (${rowId})`,
                expected: '> 0',
                actual: amountVal,
                example: item,
                impact: 'Искажение финансовой статистики.',
                recommendation: 'Исключать неположительные транзакции из выборки.',
              })
            }

            // Проверка регистра валюты
            if (itemConfig.parsedFields.requireUppercase && currencyVal !== currencyVal.toUpperCase()) {
              this.addIssue({
                endpoint: ep.name,
                severity: 'WARNING',
                code: 'LOWERCASE_CURRENCY_CODE',
                message: `Код валюты передан в нижнем регистре: "${currencyVal}" (${rowId})`,
                expected: currencyVal.toUpperCase(),
                actual: currencyVal,
                example: item,
                impact: 'Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.',
                recommendation: 'Всегда сериализовать коды валют в верхнем регистре (USD, EUR).',
              })
            }

            // Проверка наличия курса
            const codeUpper = currencyVal.toUpperCase()
            if (itemConfig.parsedFields.requireRateMatch && this.availableRates.length > 0 && codeUpper !== 'USD') {
              if (!this.availableRates.includes(codeUpper)) {
                this.addIssue({
                  endpoint: ep.name,
                  severity: 'CRITICAL',
                  code: 'UNSUPPORTED_CURRENCY',
                  message: `Для валюты "${codeUpper}" отсутствует обменный курс (${rowId})`,
                  expected: 'Валюта из поддерживаемого списка провайдера курсов',
                  actual: codeUpper,
                  example: item,
                  impact: 'Невозможно рассчитать выручку в USD.',
                  recommendation: 'Валидировать допустимые валюты на уровне шлюза.',
                })
              }
            }
          }
        }
        return
      }

      // 2. Объектный формат элемента
      if (itemConfig.type === 'object') {
        if (!item || typeof item !== 'object') {
          this.addIssue({
            endpoint: ep.name,
            severity: 'CRITICAL',
            code: 'ITEM_NOT_OBJECT',
            message: `Элемент списка должен быть объектом (${rowId})`,
            expected: 'Object',
            actual: typeof item,
            example: JSON.stringify(item),
            impact: 'Ошибка парсинга полей.',
            recommendation: 'Возвращать объекты транзакций.',
          })
          return
        }

        // Проверка наличия primary key (id)
        if (itemConfig.requireId && !('id' in item)) {
          this.addIssue({
            endpoint: ep.name,
            severity: 'WARNING',
            code: 'MISSING_TRANSACTION_ID',
            message: `В объекте отсутствует уникальный идентификатор "id" (${rowId})`,
            expected: 'Поле "id": number|string',
            actual: 'Отсутствует',
            example: JSON.stringify(item),
            impact: 'Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.',
            recommendation: 'Добавить первичный ключ в модель транзакции.',
          })
        }

        // Проверка поля статуса
        if (itemConfig.statusField) {
          const { preferred, forbiddenAliases } = itemConfig.statusField
          if (forbiddenAliases && Array.isArray(forbiddenAliases)) {
            for (const alias of forbiddenAliases) {
              if (alias in item && !(preferred in item)) {
                this.addIssue({
                  endpoint: ep.name,
                  severity: 'WARNING',
                  code: 'FIELD_ALIAS_DEPRECATED',
                  message: `Использовано устаревшее наименование поля "${alias}" вместо "${preferred}" (${rowId})`,
                  expected: `"${preferred}": "paid"`,
                  actual: `"${alias}": "${item[alias]}"`,
                  example: JSON.stringify(item),
                  impact: 'Рассинхронизация с доменной моделью клиента.',
                  recommendation: `Переименовать поле "${alias}" в "${preferred}".`,
                })
              }
            }
          }

          const rawStatus = item[preferred] ?? item.type
          if (rawStatus) {
            const statusStr = String(rawStatus).toLowerCase()
            if (!standardStatuses.includes(statusStr)) {
              this.addIssue({
                endpoint: ep.name,
                severity: 'WARNING',
                code: 'NON_STANDARD_STATUS',
                message: `Нестандартизированное значение статуса: "${rawStatus}" (${rowId})`,
                expected: `Один из: ${standardStatuses.join(', ')}`,
                actual: `"${rawStatus}"`,
                example: JSON.stringify(item),
                impact: 'Статус может некорректно классифицироваться логикой расчёта выручки.',
                recommendation: 'Стандартизировать статусы в соответствии с enum.',
              })
            }
          }
        }

        // Проверка полей схемы
        if (itemConfig.fields) {
          for (const [field, fieldRule] of Object.entries(itemConfig.fields)) {
            const val = item[field]

            if (val === undefined || val === null) {
              this.addIssue({
                endpoint: ep.name,
                severity: 'CRITICAL',
                code: 'MISSING_REQUIRED_FIELD',
                message: `Обязательное поле "${field}" отсутствует в объекте (${rowId})`,
                expected: `Присутствие поля "${field}"`,
                actual: 'undefined',
                example: JSON.stringify(item),
                impact: 'Сбой нормализации транзакции.',
                recommendation: `Гарантировать наличие поля "${field}" в ответе.`,
              })
              continue
            }

            // Проверка типа
            if (fieldRule.type && typeof val !== fieldRule.type) {
              this.addIssue({
                endpoint: ep.name,
                severity: 'CRITICAL',
                code: 'FIELD_TYPE_MISMATCH',
                message: `Поле "${field}" имеет неверный тип (${rowId})`,
                expected: fieldRule.type,
                actual: typeof val,
                example: JSON.stringify(item),
                impact: 'Сбой математических операций или форматирования.',
                recommendation: `Привести поле "${field}" к типу ${fieldRule.type}.`,
              })
              continue
            }

            // Числовые правила
            if (fieldRule.type === 'number') {
              if (fieldRule.positive && val <= 0) {
                this.addIssue({
                  endpoint: ep.name,
                  severity: 'WARNING',
                  code: 'NON_POSITIVE_AMOUNT',
                  message: `Значение поля "${field}" неположительное: ${val} (${rowId})`,
                  expected: '> 0',
                  actual: val,
                  example: JSON.stringify(item),
                  impact: 'Искажение суммы выручки.',
                  recommendation: 'Исключать неположительные транзакции.',
                })
              }
              if (fieldRule.maxDecimals !== undefined) {
                const parts = String(val).split('.')
                if (parts[1] && parts[1].length > fieldRule.maxDecimals) {
                  this.addIssue({
                    endpoint: ep.name,
                    severity: 'INFO',
                    code: 'PRECISION_EXCEEDED',
                    message: `Поле "${field}" содержит более ${fieldRule.maxDecimals} знаков после запятой (${rowId})`,
                    expected: `<= ${fieldRule.maxDecimals} десятичных знаков`,
                    actual: val,
                    example: JSON.stringify(item),
                    impact: 'Риск погрешности округления.',
                    recommendation: 'Округлять суммы до центов на уровне бэкенда.',
                  })
                }
              }
            }

            // Валютные правила
            if (fieldRule.iso4217) {
              const codeStr = String(val)
              if (fieldRule.requireUppercase && codeStr !== codeStr.toUpperCase()) {
                this.addIssue({
                  endpoint: ep.name,
                  severity: 'WARNING',
                  code: 'CURRENCY_CASING',
                  message: `Код валюты "${codeStr}" передан не в верхнем регистре (${rowId})`,
                  expected: codeStr.toUpperCase(),
                  actual: codeStr,
                  example: JSON.stringify(item),
                  impact: 'Риск несовпадения при регистрозависимом поиске котировки.',
                  recommendation: 'Приводить коды валют к верхнему регистру перед отправкой.',
                })
              }

              const upper = codeStr.toUpperCase()
              if (!ISO_4217_CODES.has(upper)) {
                this.addIssue({
                  endpoint: ep.name,
                  severity: 'WARNING',
                  code: 'NON_ISO_CURRENCY',
                  message: `Код валюты "${upper}" не входит в стандартный реестр ISO 4217 (${rowId})`,
                  expected: 'Код по ISO 4217 (USD, EUR, GBP...)',
                  actual: upper,
                  example: JSON.stringify(item),
                  impact: 'Неизвестная валюта, вероятна ошибка ввода.',
                  recommendation: 'Ограничить ввод валют справочником ISO 4217.',
                })
              }

              if (fieldRule.requireRateMatch && this.availableRates.length > 0 && upper !== 'USD') {
                if (!this.availableRates.includes(upper)) {
                  this.addIssue({
                    endpoint: ep.name,
                    severity: 'CRITICAL',
                    code: 'CURRENCY_RATE_MISSING',
                    message: `Для валюты "${upper}" отсутствует обменный курс (${rowId})`,
                    expected: 'Валюта с доступным курсом',
                    actual: upper,
                    example: JSON.stringify(item),
                    impact: 'Конвертация невозможна, транзакция выпадет из расчета выручки.',
                    recommendation: 'Синхронизировать поддерживаемые валюты с поставщиком котировок.',
                  })
                }
              }
            }
          }
        }
      }
    })
  }

  compileResults() {
    return {
      title: this.cfg.title,
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues,
      responses: this.responses,
    }
  }
}

/** Генератор Markdown-отчета */
function generateMarkdownReport(auditResult, cfg) {
  const { stats, issues, responses, timestamp, title } = auditResult

  const grouped = {
    CRITICAL: issues.filter((i) => i.severity === 'CRITICAL'),
    WARNING: issues.filter((i) => i.severity === 'WARNING'),
    INFO: issues.filter((i) => i.severity === 'INFO'),
  }

  const healthScore = Math.max(0, 100 - stats.critical * 30 - stats.warning * 2)
  const healthBadge = healthScore >= 80 ? '🟢 ОТЛИЧНО' : healthScore >= 50 ? '🟡 ТРЕБУЕТ ВНИМАНИЯ' : '🔴 КРИТИЧНО'

  let md = `# Отчет по аудиту качества и контрактов API: ${title}

> **Дата формирования:** ${new Date(timestamp).toLocaleString('ru-RU')}  
> **Статус качества данных:** ${healthBadge} (Индекс надежности: **${healthScore}/100**)  
> **Целевая аудитория:** Backend-разработчики, архитекторы API, QA Engineers.

---

## 1. Сводка состояния сервисов

| Эндпоинт / Сервис | HTTP Статус | Время ответа | Объем выборки | Вердикт |
| :--- | :--- | :--- | :--- | :--- |
`

  for (const [id, r] of Object.entries(responses)) {
    const hasCrit = issues.some((i) => i.endpoint.includes(id) && i.severity === 'CRITICAL')
    const hasWarn = issues.some((i) => i.endpoint.includes(id) && i.severity === 'WARNING')
    const statusIcon = hasCrit ? '🔴 Ошибки' : hasWarn ? '🟡 Требует правок' : '🟢 В норме'
    md += `| **${id}** | \`${r.status || 'N/A'}\` | \`${r.durationMs || 0} ms\` | ${r.length ?? r.count ?? '-'} записей | ${statusIcon} |\n`
  }

  md += `
### Итоги аудита
- **Всего выявлено замечаний:** ${stats.totalIssues}
- 🔴 **Критичные дефекты (Critical):** ${stats.critical}
- 🟡 **Несоответствия контракту (Warning):** ${stats.warning}
- 🔵 **Рекомендации по оптимизации (Info):** ${stats.info}

---

## 2. Подробный реестр выявленных дефектов и аномалий

`

  if (issues.length === 0) {
    md += `*Все проверки успешно пройдены! Аномалий и отклонений от спецификации не обнаружено.*\n`
  } else {
    const uniqueIssuesMap = new Map()
    for (const issue of issues) {
      const key = `${issue.endpoint}__${issue.code}`
      if (!uniqueIssuesMap.has(key)) {
        uniqueIssuesMap.set(key, { ...issue, count: 1, examples: [issue.example].filter(Boolean) })
      } else {
        const item = uniqueIssuesMap.get(key)
        item.count += 1
        if (issue.example && item.examples.length < 3 && !item.examples.includes(issue.example)) {
          item.examples.push(issue.example)
        }
      }
    }

    let counter = 1
    for (const item of uniqueIssuesMap.values()) {
      const icon = item.severity === 'CRITICAL' ? '🔴' : item.severity === 'WARNING' ? '🟡' : '🔵'
      md += `### ${counter++}. [${item.severity}] ${icon} ${item.message} ${item.count > 1 ? `*(Встретилось: ${item.count} раз)*` : ''}

- **Эндпоинт:** \`${item.endpoint}\`
- **Код правила:** \`${item.code}\`
- **Ожидалось по спецификации:** \`${item.expected}\`
- **Фактический ответ сервера:** \`${item.actual}\`
- **Влияние на клиентское приложение:** ${item.impact}
- **Рекомендация по исправлению:** ${item.recommendation}
`
      if (item.examples.length > 0) {
        md += `- **Пример фрагмента данных:**\n\`\`\`json\n${item.examples.join('\n')}\n\`\`\`\n`
      }
      md += `\n`
    }
  }

  md += `---

## 3. Рекомендованный контракт API (Target Contracts)

Ниже приведены целевые схемы данных, исключающие необходимость поддерживать клиентские адаптеры и fallback-поля:

`

  for (const ep of cfg.endpoints) {
    md += `### \`${ep.name}\`\n`
    if (ep.item?.type === 'string') {
      md += `\`\`\`json
[
  "100.00 USD",
  "250.50 EUR"
]
\`\`\`
*Требование: соблюдать формат \`<сумма> <КОД_ISO>\`, коды валют передавать строго в верхнем регистре.*\n\n`
    } else {
      md += `\`\`\`json
{
  "transactions": [
    {
      "id": 1,
      "amount": 100.00,
      "currency": "USD",
      "status": "paid"
    }
  ]
}
\`\`\`
*Требование: использовать ключ \`status\` вместо \`type\`, обязательно передавать первичный ключ \`id\`, исключить лишние нефинансовые объекты (например, \`address\`)*.\n\n`
    }
  }

  md += `---

## 4. Команды для воспроизведения (Reproduce cURL)

\`\`\`bash
`
  for (const ep of cfg.endpoints) {
    const headersStr = ep.headers ? Object.entries(ep.headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ') : ''
    md += `# ${ep.name}\ncurl -i ${headersStr} "${ep.url}"\n\n`
  }
  md += `\`\`\`\n`

  return md
}

/** Генератор стилизованного HTML для качественной печати в PDF */
function generateHtmlReport(auditResult, cfg) {
  const { stats, responses, timestamp, issues, title } = auditResult
  const healthScore = Math.max(0, 100 - stats.critical * 30 - stats.warning * 2)
  const healthColor = healthScore >= 80 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444'

  const uniqueIssuesMap = new Map()
  for (const issue of issues) {
    const key = `${issue.endpoint}__${issue.code}`
    if (!uniqueIssuesMap.has(key)) {
      uniqueIssuesMap.set(key, { ...issue, count: 1, examples: [issue.example].filter(Boolean) })
    } else {
      const item = uniqueIssuesMap.get(key)
      item.count += 1
      if (issue.example && item.examples.length < 3 && !item.examples.includes(issue.example)) {
        item.examples.push(issue.example)
      }
    }
  }

  const issuesList = Array.from(uniqueIssuesMap.values())

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>API Quality & Integrity Audit Report</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      font-size: 12px;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-banner {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-area h1 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #0f172a;
    }
    .title-area p {
      margin: 0;
      color: #64748b;
      font-size: 11px;
    }
    .score-badge {
      text-align: right;
      padding: 6px 12px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .score-num {
      font-size: 20px;
      font-weight: 800;
      color: ${healthColor};
    }
    h2 {
      font-size: 13px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .stat-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .stat-val {
      font-size: 16px;
      font-weight: 700;
      margin-top: 2px;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    .issue-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .issue-card.CRITICAL { border-left: 4px solid #ef4444; background: #fff5f5; }
    .issue-card.WARNING { border-left: 4px solid #f59e0b; background: #fffbeb; }
    .issue-card.INFO { border-left: 4px solid #3b82f6; background: #eff6ff; }
    .issue-title {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      margin-right: 6px;
    }
    .badge.CRITICAL { background: #fee2e2; color: #991b1b; }
    .badge.WARNING { background: #fef3c7; color: #92400e; }
    .badge.INFO { background: #dbeafe; color: #1e40af; }
    .issue-meta {
      font-size: 11px;
      color: #334155;
      margin: 2px 0;
    }
    code {
      font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 10px;
      color: #0f172a;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 8px;
      border-radius: 4px;
      font-size: 10px;
      margin: 6px 0 2px 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="title-area">
      <h1>Отчет по аудиту качества и контрактов API</h1>
      <p>${title} &bull; Дата: ${new Date(timestamp).toLocaleString('ru-RU')}</p>
    </div>
    <div class="score-badge">
      <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600;">Data Health Score</div>
      <div class="score-num">${healthScore} / 100</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Эндпоинты</div>
      <div class="stat-val">${stats.endpointsChecked} активных</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Критичные дефекты</div>
      <div class="stat-val" style="color: #ef4444;">${stats.critical}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Замечания к контракту</div>
      <div class="stat-val" style="color: #f59e0b;">${stats.warning}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Всего сигналов</div>
      <div class="stat-val">${stats.totalIssues}</div>
    </div>
  </div>

  <h2>1. Состояние сервисов</h2>
  <table>
    <thead>
      <tr>
        <th>Сервис / Эндпоинт</th>
        <th>HTTP Код</th>
        <th>Задержка</th>
        <th>Объем выборки</th>
        <th>Вердикт</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(responses)
        .map(([id, r]) => {
          const hasCrit = issues.some((i) => i.endpoint.includes(id) && i.severity === 'CRITICAL')
          const hasWarn = issues.some((i) => i.endpoint.includes(id) && i.severity === 'WARNING')
          const statusIcon = hasCrit ? '🔴 Ошибки' : hasWarn ? '🟡 Требует правок' : '🟢 В норме'
          return `<tr>
            <td><strong>${id}</strong></td>
            <td><code>${r.status || 'N/A'}</code></td>
            <td>${r.durationMs || 0} ms</td>
            <td>${r.length ?? r.count ?? '-'} записей</td>
            <td>${statusIcon}</td>
          </tr>`
        })
        .join('')}
    </tbody>
  </table>

  <h2>2. Реестр выявленных аномалий для Backend команды</h2>
  ${issuesList
    .map(
      (item) => `
    <div class="issue-card ${item.severity}">
      <div class="issue-title">
        <span class="badge ${item.severity}">${item.severity}</span>
        ${item.message} ${item.count > 1 ? `<em>(встретилось ${item.count} раз)</em>` : ''}
      </div>
      <div class="issue-meta"><strong>Эндпоинт:</strong> <code>${item.endpoint}</code> | <strong>Код:</strong> <code>${item.code}</code></div>
      <div class="issue-meta"><strong>Ожидалось:</strong> ${item.expected}</div>
      <div class="issue-meta"><strong>Факт сервера:</strong> ${item.actual}</div>
      <div class="issue-meta"><strong>Влияние:</strong> ${item.impact}</div>
      <div class="issue-meta"><strong>Решение:</strong> ${item.recommendation}</div>
      ${
        item.examples.length > 0
          ? `<pre><code>${item.examples.slice(0, 2).join('\n')}</code></pre>`
          : ''
      }
    </div>`,
    )
    .join('')}
</body>
</html>`
}

/** Экспорт HTML в PDF через системный Google Chrome на macOS */
async function exportHtmlToPdf(htmlFilePath, pdfFilePath) {
  const possibleChromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'chromium',
  ]

  let chromeBin = null
  for (const bin of possibleChromePaths) {
    if (bin.startsWith('/')) {
      if (fs.existsSync(bin)) {
        chromeBin = bin
        break
      }
    }
  }

  if (!chromeBin) {
    console.warn('⚠️ Google Chrome не найден по стандартным путям. Генерация PDF пропущена.')
    return false
  }

  try {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfFilePath}`,
      `file://${htmlFilePath}`,
    ]
    await execFileAsync(chromeBin, args)
    return true
  } catch (err) {
    console.error('Ошибка при конвертации в PDF через Chrome:', err.message)
    return false
  }
}

// Точка входа
async function main() {
  const auditor = new UniversalApiAuditor(config)
  const auditResult = await auditor.run()

  const dateSlug = new Date().toISOString().slice(0, 10)
  const mdFileName = `api-audit-report-${dateSlug}.md`
  const htmlFileName = `api-audit-report-${dateSlug}.html`
  const pdfFileName = `api-audit-report-${dateSlug}.pdf`

  const mdFilePath = path.join(outDir, mdFileName)
  const htmlFilePath = path.join(outDir, htmlFileName)
  const pdfFilePath = path.join(outDir, pdfFileName)
  const jsonFilePath = path.join(outDir, `api-audit-data-${dateSlug}.json`)

  // 1. Сохранение Markdown и JSON
  const markdown = generateMarkdownReport(auditResult, config)
  fs.writeFileSync(mdFilePath, markdown, 'utf-8')
  fs.writeFileSync(path.join(outDir, 'api-audit-report-latest.md'), markdown, 'utf-8')
  fs.writeFileSync(jsonFilePath, JSON.stringify(auditResult, null, 2), 'utf-8')

  console.log(`\n📄 [Markdown] Отчет сохранен в: ${mdFilePath}`)

  // 2. Сохранение HTML и PDF
  if (!skipPdf) {
    const html = generateHtmlReport(auditResult, config)
    fs.writeFileSync(htmlFilePath, html, 'utf-8')
    console.log(`🌐 [HTML] Шаблон сохранен в: ${htmlFilePath}`)

    const pdfSuccess = await exportHtmlToPdf(htmlFilePath, pdfFilePath)
    if (pdfSuccess) {
      fs.copyFileSync(pdfFilePath, path.join(outDir, 'api-audit-report-latest.pdf'))
      console.log(`📑 [PDF] Официальный отчет сгенерирован: ${pdfFilePath}`)
    }
  }

  console.log('\n📊 Сводка аудита:')
  console.log(`- Проверено эндпоинтов: ${auditResult.stats.endpointsChecked}`)
  console.log(`- Критичных ошибок (Critical): ${auditResult.stats.critical}`)
  console.log(`- Замечаний к контракту (Warning): ${auditResult.stats.warning}`)
  console.log(`- Рекомендаций (Info): ${auditResult.stats.info}`)

  const healthScore = Math.max(0, 100 - auditResult.stats.critical * 30 - auditResult.stats.warning * 2)
  console.log(`- Индекс качества данных: ${healthScore}/100`)

  // Проверка порогов для CI/CD
  if (failOn === 'critical' && auditResult.stats.critical > 0) {
    console.error(`\n❌ CI/CD Fail: Обнаружено ${auditResult.stats.critical} критических дефектов данных.`)
    process.exit(1)
  }
  if (failOn === 'warning' && (auditResult.stats.critical > 0 || auditResult.stats.warning > 0)) {
    console.error(`\n❌ CI/CD Fail: Обнаружены замечания к контракту API.`)
    process.exit(1)
  }
  if (minScore > 0 && healthScore < minScore) {
    console.error(`\n❌ CI/CD Fail: Индекс качества (${healthScore}) ниже допустимого минимума (${minScore}).`)
    process.exit(1)
  }

  console.log('\n✅ Аудит успешно завершен.\n')
}

main().catch((err) => {
  console.error('Фатальная ошибка при выполнении аудита:', err)
  process.exit(1)
})
