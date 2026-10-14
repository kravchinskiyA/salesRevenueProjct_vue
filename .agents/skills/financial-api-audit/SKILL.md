---
name: financial-api-audit
description: >-
  Универсальный аудит и валидация ответов финансовых API (finance1, finance2, курсы валют и любые
  новые эндпоинты через audit.config.json). Выявляет расхождения контрактов, ошибки регистра кодов
  валют, неподдерживаемые валюты, подмену полей type/status, отсутствие id, утечки нефинансовых полей,
  нарушения SLA и формирует отчеты для backend-разработчиков в форматах Markdown и PDF.
---

# Universal Financial API Audit Skill

Универсальный декларативный скилл для автоматизированного аудита, валидации и формирования баг-репортов по качеству серверных ответов любых финансовых API в проекте `salesRevenueProject`.

Скилл работает на базе декларативной конфигурации [`audit.config.json`](./audit.config.json), что позволяет проверять любые финансовые источники без изменения исполняемого JavaScript-кода.

---

## 1. Возможности и выявляемые аномалии

Движок аудита выполняет глубокую проверку серверных данных по настраиваемым правилам:

1. **Проблемы регистра валют (ISO 4217):**
   - Выявление кодов в нижнем регистре (например, `usd`, `eur` в `finance2` вместо стандарта `USD`, `EUR`).
2. **Проверка валют и котировок:**
   - Наличие валюты в словаре доступных обменных курсов `currencyfreaks`.
   - Выявление неизвестных/экзотических валют без доступного курса.
3. **Несоответствия схеме и именованию полей:**
   - Использование устаревших псевдонимов полей (например, `type` вместо `status` в объектах транзакций `finance1`).
   - Отсутствие первичного ключа (`id`) транзакции.
4. **Нестандартизированные статусы:**
   - Статусы типа `rejected` вместо унифицированного `failed` (сверка с enum `standardStatuses`).
5. **Загрязнение контракта и утечки данных (Data Pollution / PII):**
   - Лишние поля верхнего уровня (например, объект `address: { city, street, houseNumber }` в ответе `finance1`).
6. **Числовая и финансовая точность:**
   - Нечисловые суммы, отрицательные/нулевые значения, превышение точности (более 2 знаков после запятой).
7. **Безопасность и авторизация (Auth Guard):**
   - Автоматическая проверка, что запрос без ключа авторизации возвращает `401 Unauthorized` или `403 Forbidden`.
8. **Контроль производительности (Latency SLA):**
   - Фиксация превышения времени ответа сервера относительно лимита `slaMs`.

---

## 2. Использование и запуск

### Быстрый запуск

```bash
# Через npm
npm run audit:api

# Напрямую через Node.js
node .agents/skills/financial-api-audit/scripts/audit.js
```

### Параметры командной строки

- `--config <path>` — путь к пользовательскому конфигурационному файлу (по умолчанию `.agents/skills/financial-api-audit/audit.config.json`).
- `--endpoint <id>` — аудит только конкретного эндпоинта (например: `--endpoint finance1`).
- `--out-dir <path>` — директория для сохранения отчетов (по умолчанию `./reports`).
- `--no-pdf` — генерация только Markdown-отчета без создания PDF.
- `--file <path>` — офлайн-аудит локального JSON-файла/мок-ответа без сетевых запросов.
- `--fail-on <critical|warning>` — аварийное завершение (`exit 1`) для CI/CD при наличии ошибок заданного уровня.
- `--min-score <0-100>` — минимальный порог качества данных для прохождения пайплайна в CI/CD.

#### Примеры:
```bash
# Проверка только первого источника без генерации PDF
node .agents/skills/financial-api-audit/scripts/audit.js --endpoint finance1 --no-pdf

# Офлайн-проверка мок-файла
node .agents/skills/financial-api-audit/scripts/audit.js --file ./mocks/response.json --endpoint finance1

# Запуск в CI/CD с блокировкой релиза при критических ошибках
node .agents/skills/financial-api-audit/scripts/audit.js --fail-on critical --min-score 70
```

---

## 3. Как подключить новый источник или изменить существующий

Все эндпоинты описываются в файле [`audit.config.json`](./audit.config.json). Чтобы добавить новый источник `finance3`, достаточно добавить блок в массив `endpoints`:

```json
{
  "id": "finance3",
  "name": "Источник 3 (/api/v2/orders)",
  "url": "${VITE_SOURCES_BASE_URL}/v2/orders",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer ${VITE_SOURCES_API_KEY}"
  },
  "authCheck": {
    "enabled": true
  },
  "root": {
    "type": "object",
    "collectionProperty": "orders",
    "allowedProperties": ["orders", "totalCount"]
  },
  "item": {
    "type": "object",
    "requireId": true,
    "statusField": {
      "preferred": "status",
      "forbiddenAliases": ["state", "type"]
    },
    "fields": {
      "amount": { "type": "number", "positive": true, "maxDecimals": 2 },
      "currency": { "type": "string", "iso4217": true, "requireUppercase": true, "requireRateMatch": true }
    }
  }
}
```

---

## 4. Форматы генерируемых отчетов

В папке `reports/` формируются:
1. `api-audit-report-YYYY-MM-DD.md` (и `api-audit-report-latest.md`) — детальный отчет для создания тикетов в трекере задач бэкенда.
2. `api-audit-report-YYYY-MM-DD.pdf` (и `api-audit-report-latest.pdf`) — официальный PDF-документ со стилями печатного листа A4.
3. `api-audit-data-YYYY-MM-DD.json` — структурированные сырые данные проверки для автоматизированного анализа.
