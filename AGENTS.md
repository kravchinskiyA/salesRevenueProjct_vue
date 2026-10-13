# AGENTS.md — Навигатор по правилам проекта salesRevenueProject

Единая точка входа, индекс и матрица правил для ИИ-агентов и ассистентов, работающих с кодовой базой `salesRevenueProject`.

Все специализированные правила вынесены в модульные файлы в каталоге [`.agents/rules/`](.agents/rules).

---

## 1. Оглавление модульных правил

| Файл правила | Тематика и краткое содержание |
| :--- | :--- |
| [project-overview.md](.agents/rules/project-overview.md) | Назначение проекта ShopAdmin, общие цели агрегации выручки и ключевой функционал. |
| [tech-stack.md](.agents/rules/tech-stack.md) | Стек технологий: Vue 3, Vite 8, Pinia 4, TanStack Vue Query 5, Chart.js, SheetJS, Vanilla CSS. |
| [architecture.md](.agents/rules/architecture.md) | Структура директорий (`src/api`, `services`, `composables`, `stores`, `views`, `components`) и принцип разделения ответственности (SoC). |
| [business-logic.md](.agents/rules/business-logic.md) | Доменная логика: фильтрация только оплаченных транзакций (`paid`), расчет через центы, специфика источников `finance1`/`finance2`, курсы валют и фича-флаг дат. |
| [caching-state.md](.agents/rules/caching-state.md) | Серверный кеш (Vue Query), ключи запросов, `staleTime`, персистенция в LocalStorage, версионирование `CACHE.buster`, Pinia хранилища. |
| [environment-and-scripts.md](.agents/rules/environment-and-scripts.md) | Переменные окружения (`.env.local`), API-ключи, запуск dev-сервера, сборка и предпросмотр. |
| [code-standards.md](.agents/rules/code-standards.md) | Стандарты разработки: `<script setup>`, чистый CSS без Tailwind, динамический импорт SheetJS, запрет прямых fetch из UI. |

---

## 2. Матрица задач: когда и какие правила подключать

При получении задачи агент обязан определить категорию работы и подключить соответствующие правила согласно таблице ниже:

| Категория задачи | Примеры типовых задач | Обязательные правила для импорта |
| :--- | :--- | :--- |
| **Онбординг / Знакомство с проектом** | Анализ возможностей проекта, общий аудит кодовой базы, архитектурный обзор. | 1. [project-overview.md](.agents/rules/project-overview.md)<br>2. [tech-stack.md](.agents/rules/tech-stack.md)<br>3. [architecture.md](.agents/rules/architecture.md)<br>4. [docs/project-structure.md](docs/project-structure.md) |
| **Разработка UI и компонентов** | Создание новых Vue-компонентов, изменение вёрстки, стилей, анимаций, графиков Chart.js. | 1. [code-standards.md](.agents/rules/code-standards.md)<br>2. [tech-stack.md](.agents/rules/tech-stack.md)<br>3. [architecture.md](.agents/rules/architecture.md) |
| **Расчёты, аналитика и бизнес-логика** | Изменение формул выручки, добавление/изменение статусов транзакций, конвертация валют, расчёт дневных/месячных итогов, валидация входящих данных. | 1. [business-logic.md](.agents/rules/business-logic.md)<br>2. [code-standards.md](.agents/rules/code-standards.md)<br>3. [architecture.md](.agents/rules/architecture.md) |
| **Кеширование, запросы и хранилище** | Добавление новых эндпоинтов, оптимизация запросов, изменение времени жизни кеша (`staleTime`), изменение структуры отчётов и сброс кеша через `buster`. | 1. [caching-state.md](.agents/rules/caching-state.md)<br>2. [business-logic.md](.agents/rules/business-logic.md)<br>3. [architecture.md](.agents/rules/architecture.md) |
| **Экспорт данных** | Доработка выгрузки в Excel (XLSX), CSV (UTF-8 BOM), экспорт canvas-графиков в PNG. | 1. [code-standards.md](.agents/rules/code-standards.md) *(особенно динамический импорт SheetJS)*<br>2. [business-logic.md](.agents/rules/business-logic.md)<br>3. [tech-stack.md](.agents/rules/tech-stack.md) |
| **Конфигурация, окружение и сборка** | Настройка переменных `.env.local`, управление фича-флагами, запуск тестов, dev-сервера или production-сборки. | 1. [environment-and-scripts.md](.agents/rules/environment-and-scripts.md)<br>2. [tech-stack.md](.agents/rules/tech-stack.md) |
| **Архитектурный рефакторинг / Новые модули** | Добавление новых страниц, роутов Vue Router, выделение новых Pinia-сторов или сервисов. | 1. [architecture.md](.agents/rules/architecture.md)<br>2. [code-standards.md](.agents/rules/code-standards.md)<br>3. [caching-state.md](.agents/rules/caching-state.md)<br>4. [docs/project-structure.md](docs/project-structure.md) |

---

## 3. Алгоритм работы ИИ-агента

1. **Определить область изменений:** соотнести запрос пользователя с категориями из матрицы задач в разделе 2.
2. **Изучить целевые правила:** прочитать соответствующие документы из [`.agents/rules/`](.agents/rules) перед генерацией решений или изменением файлов.
3. **Проверка архитектуры:** При любых изменениях, затрагивающих архитектуру проекта, добавление модулей, сервисов, страниц или компонентов, агент **обязан** сверяться с документом [`docs/project-structure.md`](docs/project-structure.md).
4. **Соблюдать критические ограничения:**
   - Строгий расчет денег в центах (`toCents` / `fromCents`).
   - Использование только Vue 3 `<script setup>`.
   - Vanilla CSS без внешних utility-библиотек.
   - Инкремент `CACHE.buster` при любых модификациях структуры кешируемых данных.
   - Динамический импорт `xlsx` (`await import('xlsx')`).

## Завершение задач и память проекта

Когда ты считаешь, что задача полностью выполнена, и код работает, тыс Обязан выполнить следующие шаги перед тем, как отчитаться мне:

1. Открой файл `docs/progress.md`.
2. Запиши в него суть выполненной задачи, какие файлы были изменены и какие новые преременныые окружения (.env) были добавлены (Если были).
3. Если мы изменили структуру базы данных, анализируй схему в `docs/db-schema.md`
4. При правках в архитекктру вноси правки в [docs/project-structure.md](docs/project-structure.md).
