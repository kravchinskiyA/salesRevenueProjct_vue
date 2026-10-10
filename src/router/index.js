import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/day',
    },
    {
      path: '/day/:date?',
      name: 'day',
      component: () => import('@/views/DayView.vue'),
    },
    {
      path: '/month/:month?',
      name: 'month',
      component: () => import('@/views/MonthView.vue'),
    },
    {
      path: '/transaction/:source/:id',
      name: 'transaction',
      component: () => import('@/views/TransactionDetailView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/day',
    },
  ],
})

export default router
