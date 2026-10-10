<script setup>
import { computed, ref } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { SOURCES } from '@/config/api'
import { exportChartPng } from '@/utils/export'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  report: {
    type: Object,
    required: true,
  },
})

const chartRef = ref(null)

const chartData = computed(() => {
  // Метки - дни месяца (числа 01, 02, ...)
  const labels = props.report.rows.map((row) => row.date.slice(-2))

  const finance1Values = props.report.rows.map((row) => row.finance1 ?? 0)
  const finance2Values = props.report.rows.map((row) => row.finance2 ?? 0)

  return {
    labels,
    datasets: [
      {
        label: SOURCES.finance1.title,
        data: finance1Values,
        backgroundColor: 'hsl(262, 90%, 68%)',
        borderRadius: 4,
        stack: 'revenue',
      },
      {
        label: SOURCES.finance2.title,
        data: finance2Values,
        backgroundColor: 'hsl(190, 90%, 55%)',
        borderRadius: 4,
        stack: 'revenue',
      },
    ],
  }
})

const chartOptions = {
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
        label: (context) => ` ${context.dataset.label}: $ ${Number(context.raw).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { color: 'hsl(232, 20%, 18%)' },
      ticks: { color: 'hsl(230, 12%, 50%)', font: { family: 'JetBrains Mono', size: 11 } },
    },
    y: {
      stacked: true,
      grid: { color: 'hsl(232, 20%, 18%)' },
      ticks: {
        color: 'hsl(230, 12%, 50%)',
        callback: (val) => `$ ${val}`,
      },
    },
  },
}

function exportChart() {
  const canvas = chartRef.value?.chart?.canvas
  if (canvas) {
    exportChartPng(canvas, `chart-month-${props.report.month}.png`)
  }
}

defineExpose({
  exportChart,
})
</script>

<template>
  <section class="charts-grid charts-grid--single" aria-label="График выручки за месяц">
    <article class="chart-card">
      <header class="chart-card__head">
        <div>
          <h3>Динамика выручки по дням месяца</h3>
          <span style="font-size: 12px; color: var(--muted);">Сумма по двум источникам (USD)</span>
        </div>
        <button type="button" class="btn-icon" title="Сохранить график в PNG" @click="exportChart">
          📷
        </button>
      </header>
      <div class="chart-wrapper" style="height: 320px;">
        <Bar ref="chartRef" :data="chartData" :options="chartOptions" />
      </div>
    </article>
  </section>
</template>
