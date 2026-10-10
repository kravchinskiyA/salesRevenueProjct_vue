<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePeriodStore } from '@/stores/period'
import { useDayRevenue } from '@/composables/useRevenue'
import { SOURCES } from '@/config/api'
import { formatUsd, formatNumber, formatRate, statusLabel, TRANSACTION_STATUS } from '@/utils/format'
import { formatDay } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const period = usePeriodStore()

const sourceParam = computed(() => route.params.source)
const idParam = computed(() => route.params.id) // например "1"
const targetDate = computed(() => {
  const queryDate = route.query.date
  if (queryDate && period.isDateAllowed(queryDate)) return queryDate
  return period.today
})

const { data: report, isPending, error, refetch } = useDayRevenue(targetDate)

const transaction = computed(() => {
  if (!report.value) return null
  const sourceGroup = report.value.sources[sourceParam.value]
  if (!sourceGroup) return null

  // Ищем по id "finance1-1" или по number 1
  return sourceGroup.transactions.find(
    (t) => t.id === `${sourceParam.value}-${idParam.value}` || String(t.number) === String(idParam.value),
  )
})

const sourceInfo = computed(() => {
  return SOURCES[sourceParam.value] || { title: sourceParam.value }
})

const statusMeta = computed(() => {
  if (!transaction.value?.status) return null
  return TRANSACTION_STATUS[transaction.value.status] || { label: transaction.value.status, tone: 'muted' }
})

const formattedJson = computed(() => {
  if (!transaction.value?.raw) return ''
  return JSON.stringify(transaction.value.raw, null, 2)
})

function goBack() {
  router.push(`/day/${targetDate.value}`)
}
</script>

<template>
  <div>
    <div style="margin-top: 24px; margin-bottom: 20px;">
      <button type="button" class="btn" @click="goBack">
        ← Вернуться к отчету за {{ formatDay(targetDate) }}
      </button>
    </div>

    <!-- Ошибка -->
    <section v-if="error" class="error">
      <div class="error-content">
        <div class="error-title">Не удалось загрузить данные транзакции</div>
        <div class="error-message">{{ error.message || error }}</div>
        <div style="margin-top: 14px;">
          <button type="button" class="btn btn--primary" @click="refetch">
            Повторить попытку
          </button>
        </div>
      </div>
    </section>

    <!-- Загрузка -->
    <div v-else-if="isPending" class="loading-container">
      <div class="spinner"></div>
      <p>Загрузка информации о транзакции...</p>
    </div>

    <!-- Не найдена -->
    <section v-else-if="!transaction" class="error">
      <div class="error-content">
        <div class="error-title">Транзакция не найдена</div>
        <div class="error-message">
          В источнике {{ sourceInfo.title }} за {{ formatDay(targetDate) }} нет транзакции #{{ idParam }}.
        </div>
      </div>
    </section>

    <!-- Карточка транзакции -->
    <article v-else class="panel" style="max-width: 720px; margin: 0 auto;">
      <header class="panel__head">
        <div>
          <h2>Транзакция #{{ transaction.number }}</h2>
          <span style="font-size: 13px; color: var(--muted);">Дата: {{ formatDay(targetDate) }}</span>
        </div>
        <span class="badge">{{ sourceInfo.title }}</span>
      </header>

      <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item__label">Источник данных</span>
            <span class="detail-item__value">{{ sourceInfo.title }} ({{ sourceParam }})</span>
          </div>

          <div class="detail-item">
            <span class="detail-item__label">Статус</span>
            <span class="detail-item__value">
              <span
                v-if="transaction.status"
                class="badge badge--tag"
                :class="{
                  'badge--success': statusMeta.tone === 'success',
                  'badge--warning': statusMeta.tone === 'warning',
                  'badge--danger': statusMeta.tone === 'danger',
                }"
              >
                {{ statusLabel(transaction.status) }}
              </span>
              <span v-else style="color: var(--muted);">—</span>
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-item__label">Исходная сумма</span>
            <span class="detail-item__value">
              {{ formatNumber(transaction.amount) }}
              <span class="currency" style="margin-left: 4px;">{{ transaction.currency }}</span>
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-item__label">Курс к USD</span>
            <span class="detail-item__value mono">
              {{ transaction.currency === 'USD' ? '1.000000' : formatRate(transaction.rate) }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-item__label">Итоговая выручка (USD)</span>
            <span class="detail-item__value" style="color: var(--accent); font-size: 22px;">
              {{ formatUsd(transaction.usd) }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-item__label">ID транзакции</span>
            <span class="detail-item__value mono" style="font-size: 13px;">
              {{ transaction.id }}
            </span>
          </div>
        </div>

        <div class="detail-item" style="gap: 8px;">
          <span class="detail-item__label">Сырые данные (Raw JSON от API)</span>
          <pre class="json-preview"><code>{{ formattedJson }}</code></pre>
        </div>
      </div>
    </article>
  </div>
</template>
