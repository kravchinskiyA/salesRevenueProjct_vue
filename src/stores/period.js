import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { FEATURES } from '@/config/features'
import { todayISO, toMonthKey, isValidISODate, isValidMonthKey } from '@/utils/date'

/**
 * Состояние периода: какой день «сегодня», какие даты разрешены,
 * последняя открытая дата/месяц (чтобы навигация сохраняла контекст).
 *
 * Сама выбранная дата живёт в URL (/day/2026-10-10) — так ссылками можно делиться,
 * а стор отвечает за правила доступа к датам.
 */
export const usePeriodStore = defineStore('period', () => {
  const today = ref(todayISO())
  const canSwitchDates = FEATURES.dateSwitching

  const lastDate = ref(today.value)
  const lastMonth = ref(toMonthKey(today.value))
  const currentMonth = computed(() => toMonthKey(today.value))

  function isDateAllowed(date) {
    if (!isValidISODate(date) || date > today.value) return false
    return canSwitchDates || date === today.value
  }

  function isMonthAllowed(month) {
    if (!isValidMonthKey(month) || month > currentMonth.value) return false
    return canSwitchDates || month === currentMonth.value
  }

  function rememberDate(date) {
    lastDate.value = date
    lastMonth.value = toMonthKey(date)
  }

  function rememberMonth(month) {
    lastMonth.value = month
  }

  /** Обновляет «сегодня» (например, если вкладка открыта после полуночи) */
  function syncToday() {
    const actual = todayISO()
    if (actual === today.value) return
    const wasOnToday = lastDate.value === today.value
    today.value = actual
    if (!canSwitchDates || wasOnToday) rememberDate(actual)
  }

  return {
    today,
    currentMonth,
    canSwitchDates,
    lastDate,
    lastMonth,
    isDateAllowed,
    isMonthAllowed,
    rememberDate,
    rememberMonth,
    syncToday,
  }
})
