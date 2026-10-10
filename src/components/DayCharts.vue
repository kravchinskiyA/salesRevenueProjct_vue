<script setup>
import { computed, ref } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import { SOURCES } from '@/config/api'
import { exportChartPng } from '@/utils/export'

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  report: {
    type: Object,
    required: true,
  },
})

const doughnutChartRef = ref(null)
const barChartRef = ref(null)

// 1. Распределение выручки по источникам
const sourcesData = computed(() => {
  const f1 = props.report.sources.finance1.total
  const f2 = props.report.sources.finance2.total
  return {
    labels: [SOURCES.finance1.title, SOURCES.finance2.title],
    datasets: [
      {
        data: [f1, f2],
        backgroundColor: ['hsl(262, 90%, 68%)', 'hsl(190, 90%, 55%)'],
        borderColor: ['hsl(232, 28%, 10%)', 'hsl(232, 28%, 10%)'],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }
})

// 2. Распределение выручки по валютам
const currenciesData = computed(() => {
  const labels = props.report.byCurrency.map((item) => item.currency)
  const data = props.report.byCurrency.map((item) => item.usd)
  const colors = [
    'hsl(190, 90%, 55%)',
    'hsl(262, 90%, 68%)',
    'hsl(152, 70%, 50%)',
    'hsl(38, 92%, 54%)',
    'hsl(350, 85%, 62%)',
  ]

  return {
    labels,
    datasets: [
      {
        label: 'Сумма в USD',
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderRadius: 6,
      },
    ],
  }
})

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'hsl(230, 15%, 70%)',
        font: { family: 'Inter', size: 12 },
      },
    },
    tooltip: {
      backgroundColor: 'hsl(232, 22%, 13%)',
      titleColor: 'hsl(230, 30%, 96%)',
      bodyColor: 'hsl(230, 15%, 70%)',
      borderColor: 'hsl(232, 20%, 22%)',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        label: (context) => ` ${context.label || context.dataset.label}: $ ${Number(context.raw).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`,
      },
    },
  },
}

const barOptions = {
  ...commonOptions,
  scales: {
    x: {
      grid: { color: 'hsl(232, 20%, 18%)' },
      ticks: { color: 'hsl(230, 12%, 50%)', font: { family: 'JetBrains Mono', size: 12 } },
    },
    y: {
      grid: { color: 'hsl(232, 20%, 18%)' },
      ticks: {
        color: 'hsl(230, 12%, 50%)',
        callback: (val) => `$ ${val}`,
      },
    },
  },
}

function exportDoughnut() {
  const canvas = doughnutChartRef.value?.chart?.canvas
  if (canvas) {
    exportChartPng(canvas, `chart-sources-${props.report.date}.png`)
  }
}

function exportBar() {
  const canvas = barChartRef.value?.chart?.canvas
  if (canvas) {
    exportChartPng(canvas, `chart-currencies-${props.report.date}.png`)
  }
}

defineExpose({
  exportChart: exportDoughnut,
})
</script>

<template>
  <section class="charts-grid" aria-label="Графики дня">
    <article class="chart-card">
      <header class="chart-card__head">
        <h3>Выручка по источникам</h3>
        <button type="button" class="btn-icon" title="Сохранить график в PNG" @click="exportDoughnut">
          📷
        </button>
      </header>
      <div class="chart-wrapper">
        <Doughnut ref="doughnutChartRef" :data="sourcesData" :options="commonOptions" />
      </div>
    </article>

    <article class="chart-card">
      <header class="chart-card__head">
        <h3>Выручка по валютам (USD)</h3>
        <button type="button" class="btn-icon" title="Сохранить график в PNG" @click="exportBar">
          📷
        </button>
      </header>
      <div class="chart-wrapper">
        <Bar ref="barChartRef" :data="currenciesData" :options="barOptions" />
      </div>
    </article>
  </section>
</template>
