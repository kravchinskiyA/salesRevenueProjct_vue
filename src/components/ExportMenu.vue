<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  hasChart: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['export-xlsx', 'export-csv', 'export-png'])

const isOpen = ref(false)
const menuRef = ref(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function handleXlsx() {
  isOpen.value = false
  emit('export-xlsx')
}

function handleCsv() {
  isOpen.value = false
  emit('export-csv')
}

function handlePng() {
  isOpen.value = false
  emit('export-png')
}

function handleClickOutside(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="export-menu">
    <button type="button" class="btn btn--primary" @click="toggle">
      <span>📥 Экспорт отчета</span>
      <span style="font-size: 10px; margin-left: 2px;">▼</span>
    </button>

    <div v-if="isOpen" class="export-dropdown">
      <button type="button" class="export-item" @click="handleXlsx">
        <span>📊</span>
        <span>Скачать в Excel (.xlsx)</span>
      </button>

      <button type="button" class="export-item" @click="handleCsv">
        <span>📄</span>
        <span>Скачать в CSV (.csv)</span>
      </button>

      <button v-if="hasChart" type="button" class="export-item" @click="handlePng">
        <span>🖼</span>
        <span>Сохранить график (.png)</span>
      </button>
    </div>
  </div>
</template>
