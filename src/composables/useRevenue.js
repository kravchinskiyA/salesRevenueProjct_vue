import { computed, toValue } from 'vue'
import { useQuery, useQueries } from '@tanstack/vue-query'
import { fetchDayReport } from '@/services/revenueService'
import { buildMonthReport } from '@/services/revenue'
import { CACHE } from '@/config/api'
import { daysOfMonth, todayISO } from '@/utils/date'
import { usePeriodStore } from '@/stores/period'

/** Единый ключ кеша для дня — день и месяц используют одни и те же записи */
export const dayReportKey = (date) => ['revenue', 'day', date]

/**
 * Опции запроса дня.
 * Прошлые дни не меняются → staleTime: Infinity (из кеша, без запросов).
 * Сегодня → свежие 5 минут, потом фоновое обновление.
 */
export function dayReportOptions(date) {
  return {
    queryKey: dayReportKey(date),
    queryFn: () => fetchDayReport(date),
    staleTime: () => (date === todayISO() ? CACHE.todayStaleTime : Infinity),
  }
}

/** Отчёт за день. date — строка, ref или getter */
export function useDayRevenue(date) {
  return useQuery({
    queryKey: () => dayReportKey(toValue(date)),
    queryFn: ({ queryKey }) => fetchDayReport(queryKey[2]),
    staleTime: (query) => (query.queryKey[2] === todayISO() ? CACHE.todayStaleTime : Infinity),
  })
}

/**
 * Отчёт за месяц: параллельно запрашивает каждый доступный день месяца.
 * Пока даты не поддерживаются API — запрашивается только сегодняшний день.
 */
export function useMonthRevenue(month) {
  const period = usePeriodStore()

  const allDays = computed(() => daysOfMonth(toValue(month)))
  const loadableDays = computed(() => allDays.value.filter((date) => period.isDateAllowed(date)))

  const results = useQueries({
    queries: () => loadableDays.value.map(dayReportOptions),
  })

  const report = computed(() => {
    const reportsByDate = {}
    results.value.forEach((result, i) => {
      if (result.data) reportsByDate[loadableDays.value[i]] = result.data
    })
    return buildMonthReport(toValue(month), allDays.value, reportsByDate)
  })

  const isPending = computed(() => results.value.some((r) => r.isPending))
  const isFetching = computed(() => results.value.some((r) => r.isFetching))
  const error = computed(() => results.value.find((r) => r.error)?.error ?? null)
  const dataUpdatedAt = computed(() => Math.max(0, ...results.value.map((r) => r.dataUpdatedAt)))
  const refetch = () => Promise.all(results.value.map((r) => r.refetch()))

  return { report, loadableDays, isPending, isFetching, error, dataUpdatedAt, refetch }
}
