import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/query-persist-client-core'

import App from './App.vue'
import router from './router'
import { CACHE } from './config/api'
import './style.css'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE.gcTime,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Персистентный кеш в localStorage с версионированием (buster)
if (typeof window !== 'undefined') {
  const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: `SALES_REVENUE_CACHE_${CACHE.buster}`,
  })

  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: CACHE.gcTime,
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
