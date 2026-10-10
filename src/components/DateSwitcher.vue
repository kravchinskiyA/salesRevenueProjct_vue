<script setup>
import { computed } from 'vue'
import { FEATURES } from '@/config/features'
import {
  formatDay,
  formatMonth,
  addDays,
  addMonths,
} from '@/utils/date'

const props = defineProps({
  mode: {
    type: String,
    default: 'day', // 'day' | 'month'
  },
  value: {
    type: String,
    required: true,
  },
  max: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['change'])

const isDateSwitchingEnabled = FEATURES.dateSwitching

const displayLabel = computed(() => {
  if (props.mode === 'day') {
    return formatDay(props.value)
  }
  return formatMonth(props.value)
})

function onPrev() {
  if (!isDateSwitchingEnabled) return
  if (props.mode === 'day') {
    emit('change', addDays(props.value, -1))
  } else {
    emit('change', addMonths(props.value, -1))
  }
}

function onNext() {
  if (!isDateSwitchingEnabled) return
  const next = props.mode === 'day' ? addDays(props.value, 1) : addMonths(props.value, 1)
  if (props.max && next > props.max) return
  emit('change', next)
}

function onInput(event) {
  if (!isDateSwitchingEnabled) return
  const val = event.target.value
  if (val) emit('change', val)
}
</script>

<template>
  <div class="toolbar-date-group" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
    <div class="date-switcher">
      <button
        type="button"
        class="btn-icon"
        title="Предыдущий период"
        :disabled="!isDateSwitchingEnabled"
        @click="onPrev"
      >
        ‹
      </button>

      <label class="date-switcher__display" style="cursor: pointer; position: relative;">
        <span>{{ displayLabel }}</span>
        <input
          :type="mode === 'day' ? 'date' : 'month'"
          :value="value"
          :max="max"
          :disabled="!isDateSwitchingEnabled"
          class="date-input"
          style="position: absolute; opacity: 0; inset: 0; width: 100%; cursor: pointer;"
          @change="onInput"
        />
      </label>

      <button
        type="button"
        class="btn-icon"
        title="Следующий период"
        :disabled="!isDateSwitchingEnabled || (max && value >= max)"
        @click="onNext"
      >
        ›
      </button>
    </div>

    <!-- Подсказка о фича-флаге для пользователя/разработчика -->
    <div
      v-if="!isDateSwitchingEnabled"
      class="feature-badge-hint"
      title="API бэкенда пока возвращает только текущий срез данных. Чтобы включить выбор дат: задайте VITE_FEATURE_DATE_SWITCHING=true в .env.local"
    >
      <span>🔒 Выбор даты временно отключен (API поддерживает только текущий день)</span>
    </div>
  </div>
</template>
