<script setup>
import { computed } from 'vue'
import { SOURCES } from '@/config/api'
import { formatUsd, formatNumber, formatRate, statusLabel, TRANSACTION_STATUS } from '@/utils/format'

const props = defineProps({
  transaction: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const sourceInfo = computed(() => {
  if (!props.transaction) return null
  return SOURCES[props.transaction.source] || { title: props.transaction.source }
})

const statusMeta = computed(() => {
  if (!props.transaction?.status) return null
  return TRANSACTION_STATUS[props.transaction.status] || { label: props.transaction.status, tone: 'muted' }
})

const formattedJson = computed(() => {
  if (!props.transaction?.raw) return ''
  return JSON.stringify(props.transaction.raw, null, 2)
})
</script>

<template>
  <div v-if="transaction" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <div>
          <h3 id="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>Детали транзакции #{{ transaction.number }}</span>
            <span class="badge">{{ sourceInfo.title }}</span>
          </h3>
        </div>
        <button type="button" class="btn-icon" aria-label="Закрыть" @click="emit('close')">
          ✕
        </button>
      </header>

      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item__label">Источник</span>
            <span class="detail-item__value">{{ sourceInfo.title }} ({{ transaction.source }})</span>
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
            <span class="detail-item__label">Итого в USD</span>
            <span class="detail-item__value" style="color: var(--accent); font-size: 20px;">
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
          <span class="detail-item__label">Исходный объект (Raw JSON)</span>
          <pre class="json-preview"><code>{{ formattedJson }}</code></pre>
        </div>
      </div>

      <footer class="modal-footer">
        <button type="button" class="btn" @click="emit('close')">
          Закрыть
        </button>
      </footer>
    </div>
  </div>
</template>
