// Ключи берутся из .env.local (не попадает в git). Шаблон — .env.example
export const SOURCES_API_KEY = import.meta.env.VITE_SOURCES_API_KEY
export const CURRENCY_API_KEY = import.meta.env.VITE_CURRENCY_API_KEY

export const SOURCES_BASE_URL = 'https://cpa-server-vtel.onrender.com/api'
export const CURRENCY_BASE_URL = 'https://api.currencyfreaks.com/v2.0/rates'

/** Описание источников — используется в UI, графиках и экспорте */
export const SOURCES = Object.freeze({
  finance1: { id: 'finance1', title: 'Источник 1', color: 'hsl(262 90% 68%)' },
  finance2: { id: 'finance2', title: 'Источник 2', color: 'hsl(190 90% 55%)' },
})

export const SOURCE_IDS = Object.keys(SOURCES)

/** Время жизни кеша */
export const CACHE = Object.freeze({
  // данные за сегодня могут меняться — считаем свежими 5 минут
  todayStaleTime: 5 * 60 * 1000,
  // сколько хранить неиспользуемые данные в памяти и в localStorage
  gcTime: 24 * 60 * 60 * 1000,
  // при изменении формата данных увеличьте — старый кеш в localStorage сбросится
  buster: 'v1',
})
