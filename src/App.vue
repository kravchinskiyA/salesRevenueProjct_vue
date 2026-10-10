<script setup>
import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import HeaderNav from '@/components/HeaderNav.vue'

const queryClient = useQueryClient()

// Вычисляем время последнего обновления из кеша
const lastUpdatedAt = computed(() => {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['revenue'] })
  if (queries.length === 0) return Date.now()
  return Math.max(...queries.map((q) => q.state.dataUpdatedAt || 0)) || Date.now()
})

const isFetching = computed(() => {
  return queryClient.isFetching({ queryKey: ['revenue'] }) > 0
})

function handleRefresh() {
  queryClient.invalidateQueries({ queryKey: ['revenue'] })
}
</script>

<template>
  <div class="layout">
    <HeaderNav
      :last-updated-at="lastUpdatedAt"
      :is-fetching="isFetching"
      @refresh="handleRefresh"
    />

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <span>© 2026 ShopAdmin — панель аналитики выручки</span>
      <span>Источники данных: finance1, finance2 • Курсы валют: currencyfreaks.com</span>
    </footer>
  </div>
</template>
