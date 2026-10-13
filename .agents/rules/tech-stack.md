# Правило: Технологический стек (Tech Stack)

## Назначение
Справочник технологий, библиотек и версий платформы, используемых в проекте.

## Состав стека
- **Фреймворк:** [Vue 3](https://vuejs.org/) (Composition API, синтаксис `<script setup>`).
- **Сборщик:** [Vite 8](https://vite.dev/) (`@vitejs/plugin-vue`, `vite-plugin-vue-devtools`).
- **Управление клиентским состоянием:** [Pinia 4](https://pinia.vuejs.org/).
- **Серверное состояние и кеширование:** [TanStack Vue Query 5](https://tanstack.com/query/latest) (`@tanstack/vue-query`, `@tanstack/query-sync-storage-persister`, `@tanstack/query-persist-client-core`).
- **Маршрутизация:** [Vue Router 5](https://router.vuejs.org/) (режим `HTML5 history`).
- **Визуализация данных:** [Chart.js 4](https://www.chartjs.org/) + [vue-chartjs 5](https://vue-chartjs.org/).
- **Экспорт данных:**
  - CSV (кодировка UTF-8 BOM, разделитель `;`).
  - Excel (`xlsx` / SheetJS через обязательный динамический импорт).
  - Графики в PNG (экспорт через Canvas API `toDataURL('image/png')`).
- **Стилизация:** Чистый CSS (Vanilla CSS, CSS Custom Properties, тёмная тема, адаптивная вёрстка без подключения CSS-фреймворков вроде Tailwind).
- **Среда выполнения:** Node.js `^22.18.0 || >=24.12.0` (ESM: `"type": "module"` в `package.json`).
