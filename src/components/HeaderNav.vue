<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { formatDateTime } from '@/utils/date'

const props = defineProps({
  lastUpdatedAt: {
    type: Number,
    default: null,
  },
  isFetching: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['refresh'])

const route = useRoute()

const formattedUpdate = computed(() => {
  if (!props.lastUpdatedAt) return 'Загрузка...'
  return `Обновлено: ${formatDateTime(props.lastUpdatedAt)}`
})
</script>

<template>
  <header class="header">
    <div class="header__brand">
      <span class="header__logo">₿</span>
      <span class="header__title">Shop<span>Admin</span></span>
    </div>

    <nav class="header__nav" aria-label="Основная навигация">
      <router-link
        to="/day"
        class="nav-link"
        :class="{ active: route.path.startsWith('/day') || route.path === '/' }"
      >
        Выручка за день
      </router-link>
      <router-link
        to="/month"
        class="nav-link"
        :class="{ active: route.path.startsWith('/month') }"
      >
        Выручка за месяц
      </router-link>
      <router-link to="/sources" class="nav-link" :class="{ active: route.name === 'sources' }">
        Источники данных
      </router-link>
    </nav>

    <div v-if="route.name !== 'sources'" class="header__actions">
      <div class="header__status">
        <span class="status-dot"></span>
        <span id="last-update">{{ formattedUpdate }}</span>
      </div>

      <button
        type="button"
        class="btn-icon"
        title="Обновить данные"
        :disabled="isFetching"
        @click="emit('refresh')"
      >
        <span :style="{ display: 'inline-block', transform: isFetching ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }">
          ↻
        </span>
      </button>
    </div>
  </header>
</template>
