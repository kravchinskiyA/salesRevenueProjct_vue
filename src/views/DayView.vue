<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePeriodStore } from '@/stores/period'
import { useDayRevenue } from '@/composables/useRevenue'
import { SOURCES } from '@/config/api'
import { transactionsLabel } from '@/utils/format'
import { exportXlsx, exportCsv, dayReportToRows } from '@/utils/export'

import DateSwitcher from '@/components/DateSwitcher.vue'
import ExportMenu from '@/components/ExportMenu.vue'
import DayCharts from '@/components/DayCharts.vue'
import TransactionModal from '@/components/TransactionModal.vue'

const route = useRoute()
const router = useRouter()
const period = usePeriodStore()

const dayChartsRef = ref(null)
const selectedTransaction = ref(null)

// Текущая дата из маршрута или сегодня
const currentDate = computed(() => {
  const param = route.params.date
  if (param && period.isDateAllowed(param)) {
    return param
  }
  return period.today
})

watch(
  currentDate,
  (date) => {
    period.rememberDate(date)
    // Синхронизируем URL, если зашли просто на /day
    if (!route.params.date && date) {
      router.replace(`/day/${date}`)
    }
  },
  { immediate: true },
)

const { data: report, isPending, isFetching, error, dataUpdatedAt, refetch } = useDayRevenue(currentDate)

function handleDateChange(newDate) {
  if (period.isDateAllowed(newDate)) {
    router.push(`/day/${newDate}`)
  }
}

function openTransaction(item) {
  selectedTransaction.value = item
}

function closeTransaction() {
  selectedTransaction.value = null
}

// Экспорт
function handleExportXlsx() {
  if (!report.value) return
  const data = dayReportToRows(report.value)
  const sheets = [
    { name: 'Сводка', rows: data.summary },
    { name: 'Все транзакции', rows: data.transactions },
    { name: 'По валютам', rows: data.byCurrency },
  ]
  exportXlsx(sheets, `revenue-day-${report.value.date}.xlsx`)
}

function handleExportCsv() {
  if (!report.value) return
  const data = dayReportToRows(report.value)
  exportCsv(data.transactions, `transactions-day-${report.value.date}.csv`)
}

function handleExportPng() {
  dayChartsRef.value?.exportChart()
}
</script>

<template>
  <div>
    <!-- Заголовок страницы и тулбар -->
    <section class="page-head">
      <div class="page-head__title">
        <h1>Выручка магазина</h1>
        <p class="page-head__subtitle">
          Транзакции из двух источников за выбранный день, сконвертированные в USD
        </p>
      </div>

      <div class="toolbar">
        <DateSwitcher
          mode="day"
          :value="currentDate"
          :max="period.today"
          @change="handleDateChange"
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
        <div class="error-title">Не удалось загрузить данные</div>
        <div class="error-message">{{ error.message || error }}</div>
        <div class="error-hint">Попробуйте обновить данные или проверить доступность API</div>
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
      <p>Загрузка и расчет выручки...</p>
    </div>

    <!-- Основной контент отчета -->
    <template v-else-if="report">
      <!-- Итоговые карточки -->
      <section class="stats" aria-label="Итоги">
        <article class="stat-card">
          <span class="stat-card__label">{{ SOURCES.finance1.title }}</span>
          <span class="stat-card__value" id="first-source-summary">
            $ {{ report.sources.finance1.total }}
          </span>
          <span class="stat-card__meta" id="first-source-count">
            {{ transactionsLabel(report.sources.finance1.count) }}
          </span>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ SOURCES.finance2.title }}</span>
          <span class="stat-card__value" id="second-source-summary">
            $ {{ report.sources.finance2.total }}
          </span>
          <span class="stat-card__meta" id="second-source-count">
            {{ transactionsLabel(report.sources.finance2.count) }}
          </span>
        </article>

        <article class="stat-card stat-card--accent">
          <span class="stat-card__label">Всего заработано</span>
          <span class="stat-card__value" id="grand-total">
            $ {{ report.total }}
          </span>
          <span class="stat-card__meta">по обоим источникам</span>
        </article>
      </section>

      <!-- Графики дня -->
      <DayCharts ref="dayChartsRef" :report="report" />

      <!-- Таблицы источников -->
      <section class="tables">
        <!-- Источник 1 -->
        <article class="panel">
          <header class="panel__head">
            <h2>{{ SOURCES.finance1.title }}</h2>
            <div class="panel__actions">
              <span class="badge">finance1</span>
            </div>
          </header>
          <div class="table-wrap">
            <table class="table" id="first-source-table">
              <thead>
                <tr>
                  <th>№ транзакции</th>
                  <th class="num">Сумма</th>
                  <th>Валюта</th>
                  <th class="num">Курс к USD</th>
                  <th class="num">Итого, USD</th>
                </tr>
              </thead>
              <tbody id="first-source-body">
                <tr v-if="report.sources.finance1.transactions.length === 0">
                  <td colspan="5" class="text-center">Транзакций нет</td>
                </tr>
                <tr
                  v-for="item in report.sources.finance1.transactions"
                  :key="item.id"
                  class="clickable-row"
                  title="Нажмите для просмотра подробностей"
                  @click="openTransaction(item)"
                >
                  <td class="mono">#{{ item.number }}</td>
                  <td class="num">{{ item.amount }}</td>
                  <td><span class="currency">{{ item.currency }}</span></td>
                  <td class="num">
                    {{ item.currency === 'USD' ? '1.000000' : report.rates[item.currency] }}
                  </td>
                  <td class="num strong">{{ item.usd }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">Итого по источнику</td>
                  <td class="num" id="first-source-total">
                    {{ report.sources.finance1.total }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>

        <!-- Источник 2 -->
        <article class="panel">
          <header class="panel__head">
            <h2>{{ SOURCES.finance2.title }}</h2>
            <div class="panel__actions">
              <span class="badge badge--cyan">finance2</span>
            </div>
          </header>
          <div class="table-wrap">
            <table class="table" id="second-source-table">
              <thead>
                <tr>
                  <th>№ транзакции</th>
                  <th class="num">Сумма</th>
                  <th>Валюта</th>
                  <th class="num">Курс к USD</th>
                  <th class="num">Итого, USD</th>
                </tr>
              </thead>
              <tbody id="second-source-body">
                <tr v-if="report.sources.finance2.transactions.length === 0">
                  <td colspan="5" class="text-center">Транзакций нет</td>
                </tr>
                <tr
                  v-for="item in report.sources.finance2.transactions"
                  :key="item.id"
                  class="clickable-row"
                  title="Нажмите для просмотра подробностей"
                  @click="openTransaction(item)"
                >
                  <td class="mono">#{{ item.number }}</td>
                  <td class="num">{{ item.amount }}</td>
                  <td><span class="currency">{{ item.currency }}</span></td>
                  <td class="num">
                    {{ item.currency === 'USD' ? '1.000000' : report.rates[item.currency] }}
                  </td>
                  <td class="num strong">{{ item.usd }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">Итого по источнику</td>
                  <td class="num" id="second-source-total">
                    {{ report.sources.finance2.total }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>
      </section>
    </template>

    <!-- Модальное окно деталей транзакции -->
    <TransactionModal
      :transaction="selectedTransaction"
      @close="closeTransaction"
    />
  </div>
</template>
