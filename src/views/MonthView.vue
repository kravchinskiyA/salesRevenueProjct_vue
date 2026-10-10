<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePeriodStore } from '@/stores/period'
import { useMonthRevenue } from '@/composables/useRevenue'
import { SOURCES } from '@/config/api'
import { formatUsd, formatNumber, transactionsLabel } from '@/utils/format'
import { formatDay } from '@/utils/date'
import { exportXlsx, exportCsv, monthReportToRows } from '@/utils/export'

import DateSwitcher from '@/components/DateSwitcher.vue'
import ExportMenu from '@/components/ExportMenu.vue'
import MonthCharts from '@/components/MonthCharts.vue'

const route = useRoute()
const router = useRouter()
const period = usePeriodStore()

const monthChartsRef = ref(null)

const currentMonth = computed(() => {
  const param = route.params.month
  if (param && period.isMonthAllowed(param)) {
    return param
  }
  return period.currentMonth
})

watch(
  currentMonth,
  (month) => {
    period.rememberMonth(month)
    if (!route.params.month && month) {
      router.replace(`/month/${month}`)
    }
  },
  { immediate: true },
)

const { report, isPending, isFetching, error, refetch } = useMonthRevenue(currentMonth)

function handleMonthChange(newMonth) {
  if (period.isMonthAllowed(newMonth)) {
    router.push(`/month/${newMonth}`)
  }
}

function goToDay(date) {
  router.push(`/day/${date}`)
}

// Экспорт
function handleExportXlsx() {
  if (!report.value) return
  const data = monthReportToRows(report.value)
  const sheets = [
    { name: 'Выручка по дням', rows: data.days },
    { name: 'По валютам', rows: data.byCurrency },
  ]
  exportXlsx(sheets, `revenue-month-${report.value.month}.xlsx`)
}

function handleExportCsv() {
  if (!report.value) return
  const data = monthReportToRows(report.value)
  exportCsv(data.days, `revenue-month-${report.value.month}.csv`)
}

function handleExportPng() {
  monthChartsRef.value?.exportChart()
}
</script>

<template>
  <div>
    <!-- Заголовок страницы и тулбар -->
    <section class="page-head">
      <div class="page-head__title">
        <h1>Сводная выручка за месяц</h1>
        <p class="page-head__subtitle">
          Аналитика выручки по всем дням месяца с разбивкой по источникам
        </p>
      </div>

      <div class="toolbar">
        <DateSwitcher
          mode="month"
          :value="currentMonth"
          :max="period.currentMonth"
          @change="handleMonthChange"
        />

        <ExportMenu
          :has-chart="Boolean(report)"
          @export-xlsx="handleExportXlsx"
          @export-csv="handleExportCsv"
          @export-png="handleExportPng"
        />
      </div>
    </section>

    <!-- Состояние ошибки -->
    <section v-if="error" class="error" aria-live="assertive">
      <div class="error-content">
        <div class="error-title">Не удалось сформировать отчет за месяц</div>
        <div class="error-message">{{ error.message || error }}</div>
        <div class="error-hint">Попробуйте обновить данные</div>
        <div style="margin-top: 14px;">
          <button type="button" class="btn btn--primary" @click="refetch">
            Повторить попытку
          </button>
        </div>
      </div>
    </section>

    <!-- Состояние загрузки -->
    <div v-else-if="isPending" class="loading-container">
      <div class="spinner"></div>
      <p>Сбор данных за месяц...</p>
    </div>

    <!-- Основной контент -->
    <template v-else-if="report">
      <!-- Итоговые карточки (4 колонки) -->
      <section class="stats stats--four" aria-label="Итоги месяца">
        <article class="stat-card">
          <span class="stat-card__label">{{ SOURCES.finance1.title }}</span>
          <span class="stat-card__value">
            {{ formatUsd(report.totals.finance1) }}
          </span>
          <span class="stat-card__meta">за месяц</span>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ SOURCES.finance2.title }}</span>
          <span class="stat-card__value">
            {{ formatUsd(report.totals.finance2) }}
          </span>
          <span class="stat-card__meta">за месяц</span>
        </article>

        <article class="stat-card stat-card--accent">
          <span class="stat-card__label">Всего за месяц</span>
          <span class="stat-card__value">
            {{ formatUsd(report.total) }}
          </span>
          <span class="stat-card__meta">{{ transactionsLabel(report.count) }}</span>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">В среднем за день</span>
          <span class="stat-card__value">
            {{ formatUsd(report.average) }}
          </span>
          <span class="stat-card__meta">
            дней с данными: {{ report.daysWithData }}
          </span>
        </article>
      </section>

      <!-- График динамики по дням месяца -->
      <MonthCharts ref="monthChartsRef" :report="report" />

      <!-- Таблица по дням месяца -->
      <article class="panel" style="margin-bottom: 28px;">
        <header class="panel__head">
          <h2>Выручка по календарным дням</h2>
          <span class="badge">{{ report.month }}</span>
        </header>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th class="num">{{ SOURCES.finance1.title }}, USD</th>
                <th class="num">{{ SOURCES.finance2.title }}, USD</th>
                <th class="num">Транзакций</th>
                <th class="num">Всего, USD</th>
                <th style="text-align: right;">Действие</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in report.rows"
                :key="row.date"
                :class="{ 'clickable-row': row.report }"
                @click="row.report ? goToDay(row.date) : null"
              >
                <td class="mono">
                  <strong>{{ formatDay(row.date) }}</strong>
                  <span
                    v-if="row.date === period.today"
                    class="badge badge--tag badge--cyan"
                    style="margin-left: 8px;"
                  >
                    сегодня
                  </span>
                </td>
                <td class="num">{{ row.finance1 !== null ? formatNumber(row.finance1) : '—' }}</td>
                <td class="num">{{ row.finance2 !== null ? formatNumber(row.finance2) : '—' }}</td>
                <td class="num">{{ row.count !== null ? row.count : '—' }}</td>
                <td class="num strong">
                  {{ row.total !== null ? formatUsd(row.total) : '—' }}
                </td>
                <td style="text-align: right;">
                  <button
                    v-if="row.report"
                    type="button"
                    class="btn"
                    style="padding: 4px 10px; font-size: 12px;"
                    @click.stop="goToDay(row.date)"
                  >
                    Открыть день →
                  </button>
                  <span v-else style="color: var(--muted); font-size: 12px;">нет данных</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Итого за месяц</td>
                <td class="num">{{ formatNumber(report.totals.finance1) }}</td>
                <td class="num">{{ formatNumber(report.totals.finance2) }}</td>
                <td class="num">{{ report.count }}</td>
                <td class="num strong">{{ formatUsd(report.total) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>

      <!-- Таблица распределения по валютам за месяц -->
      <article class="panel">
        <header class="panel__head">
          <h2>Распределение по валютам за месяц</h2>
          <span class="badge badge--cyan">Конвертация в USD</span>
        </header>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Валюта</th>
                <th class="num">Сумма в валюте</th>
                <th class="num">Количество транзакций</th>
                <th class="num">Итого в USD</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="report.byCurrency.length === 0">
                <td colspan="4" class="text-center">Нет данных по валютам</td>
              </tr>
              <tr v-for="c in report.byCurrency" :key="c.currency">
                <td><span class="currency">{{ c.currency }}</span></td>
                <td class="num mono">{{ formatNumber(c.amount) }}</td>
                <td class="num">{{ c.count }}</td>
                <td class="num strong">{{ formatUsd(c.usd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </template>
  </div>
</template>
