# Отчет по аудиту качества и контрактов API: ShopAdmin Financial APIs Audit Configuration

> **Дата формирования:** 14.10.2026, 20:51:37  
> **Статус качества данных:** 🟡 ТРЕБУЕТ ВНИМАНИЯ (Индекс надежности: **68/100**)  
> **Целевая аудитория:** Backend-разработчики, архитекторы API, QA Engineers.

---

## 1. Сводка состояния сервисов

| Эндпоинт / Сервис | HTTP Статус | Время ответа | Объем выборки | Вердикт |
| :--- | :--- | :--- | :--- | :--- |
| **currency** | `200` | `311 ms` | 1042 записей | 🟢 В норме |

### Итоги аудита
- **Всего выявлено замечаний:** 2
- 🔴 **Критичные дефекты (Critical):** 1
- 🟡 **Несоответствия контракту (Warning):** 1
- 🔵 **Рекомендации по оптимизации (Info):** 0

---

## 2. Подробный реестр выявленных дефектов и аномалий

### 1. [WARNING] 🟡 Обнаружены посторонние поля верхнего уровня: title, timestamp, stats, issues, responses 

- **Эндпоинт:** `Источник 1 (/api/finance1)`
- **Код правила:** `UNEXPECTED_ROOT_FIELDS`
- **Ожидалось по спецификации:** `Только поля: transactions`
- **Фактический ответ сервера:** `Присутствуют: ["title","timestamp","stats","issues","responses"]`
- **Влияние на клиентское приложение:** Загрязнение контракта, утечка нерелевантных персональных/адресных данных (PII).
- **Рекомендация по исправлению:** Удалить лишние данные или вынести их в соответствующий доменный эндпоинт.
- **Пример фрагмента данных:**
```json
{"title":"ShopAdmin Financial APIs Audit Configuration","timestamp":"2026-10-14T17:50:47.710Z","stats":{"endpointsChecked":2,"totalIssues":28,"critical":0,"warning":28,"info":0},"issues":[{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"UNEXPECTED_ROOT_FIELDS","message":"Обнаружены посторонние поля верхнего уровня: address","expected":"Только поля: transactions","actual":"Присутствуют: [\"address\"]","example":"{\"address\":{\"city\":\"New York\",\"street\":\"5th Avenue\",\"houseNumber\":10}}","impact":"Загрязнение контракта, утечка нерелевантных персональных/адресных данных (PII).","recommendation":"Удалить лишние данные или вынести их в соответствующий доменный эндпоинт."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[0])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"paid\",\"amount\":100,\"currency\":\"USD\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[0])","expected":"\"status\": \"paid\"","actual":"\"type\": \"paid\"","example":"{\"type\":\"paid\",\"amount\":100,\"currency\":\"USD\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[1])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"pending\",\"amount\":50,\"currency\":\"USD\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[1])","expected":"\"status\": \"paid\"","actual":"\"type\": \"pending\"","example":"{\"type\":\"pending\",\"amount\":50,\"currency\":\"USD\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[2])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"paid\",\"amount\":880,\"currency\":\"USD\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[2])","expected":"\"status\": \"paid\"","actual":"\"type\": \"paid\"","example":"{\"type\":\"paid\",\"amount\":880,\"currency\":\"USD\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[3])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"paid\",\"amount\":130,\"currency\":\"USD\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[3])","expected":"\"status\": \"paid\"","actual":"\"type\": \"paid\"","example":"{\"type\":\"paid\",\"amount\":130,\"currency\":\"USD\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[4])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"rejected\",\"amount\":560,\"currency\":\"USD\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[4])","expected":"\"status\": \"paid\"","actual":"\"type\": \"rejected\"","example":"{\"type\":\"rejected\",\"amount\":560,\"currency\":\"USD\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"NON_STANDARD_STATUS","message":"Нестандартизированное значение статуса: \"rejected\" (finance1[4])","expected":"Один из: paid, pending, failed, cancelled, refunded","actual":"\"rejected\"","example":"{\"type\":\"rejected\",\"amount\":560,\"currency\":\"USD\"}","impact":"Статус может некорректно классифицироваться логикой расчёта выручки.","recommendation":"Стандартизировать статусы в соответствии с enum."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[5])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"paid\",\"amount\":230,\"currency\":\"EUR\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[5])","expected":"\"status\": \"paid\"","actual":"\"type\": \"paid\"","example":"{\"type\":\"paid\",\"amount\":230,\"currency\":\"EUR\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[6])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"paid\",\"amount\":530,\"currency\":\"EUR\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[6])","expected":"\"status\": \"paid\"","actual":"\"type\": \"paid\"","example":"{\"type\":\"paid\",\"amount\":530,\"currency\":\"EUR\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"MISSING_TRANSACTION_ID","message":"В объекте отсутствует уникальный идентификатор \"id\" (finance1[7])","expected":"Поле \"id\": number|string","actual":"Отсутствует","example":"{\"type\":\"rejected\",\"amount\":430,\"currency\":\"EUR\"}","impact":"Фронтенд вынужден использовать индекс массива как ключ, что ломает реактивность и сортировку.","recommendation":"Добавить первичный ключ в модель транзакции."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"FIELD_ALIAS_DEPRECATED","message":"Использовано устаревшее наименование поля \"type\" вместо \"status\" (finance1[7])","expected":"\"status\": \"paid\"","actual":"\"type\": \"rejected\"","example":"{\"type\":\"rejected\",\"amount\":430,\"currency\":\"EUR\"}","impact":"Рассинхронизация с доменной моделью клиента.","recommendation":"Переименовать поле \"type\" в \"status\"."},{"endpoint":"Источник 1 (/api/finance1)","severity":"WARNING","code":"NON_STANDARD_STATUS","message":"Нестандартизированное значение статуса: \"rejected\" (finance1[7])","expected":"Один из: paid, pending, failed, cancelled, refunded","actual":"\"rejected\"","example":"{\"type\":\"rejected\",\"amount\":430,\"currency\":\"EUR\"}","impact":"Статус может некорректно классифицироваться логикой расчёта выручки.","recommendation":"Стандартизировать статусы в соответствии с enum."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"usd\" (finance2[0])","expected":"USD","actual":"usd","example":"300 usd","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"eur\" (finance2[1])","expected":"EUR","actual":"eur","example":"200 eur","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"usd\" (finance2[2])","expected":"USD","actual":"usd","example":"150 usd","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"usd\" (finance2[3])","expected":"USD","actual":"usd","example":"200 usd","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"eur\" (finance2[4])","expected":"EUR","actual":"eur","example":"450 eur","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"usd\" (finance2[5])","expected":"USD","actual":"usd","example":"400 usd","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"usd\" (finance2[6])","expected":"USD","actual":"usd","example":"670 usd","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"usd\" (finance2[7])","expected":"USD","actual":"usd","example":"190 usd","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."},{"endpoint":"Источник 2 (/api/finance2)","severity":"WARNING","code":"LOWERCASE_CURRENCY_CODE","message":"Код валюты передан в нижнем регистре: \"eur\" (finance2[8])","expected":"EUR","actual":"eur","example":"500 eur","impact":"Нарушение ISO 4217, сбой чувствительного к регистру сопоставления с курсами.","recommendation":"Всегда сериализовать коды валют в верхнем регистре (USD, EUR)."}],"responses":{"currency":{"status":200,"durationMs":357,"count":1042},"finance1":{"status":200,"durationMs":192,"length":8},"finance2":{"status":200,"durationMs":75,"length":9}}}
```

### 2. [CRITICAL] 🔴 Свойство "transactions" должно быть массивом 

- **Эндпоинт:** `Источник 1 (/api/finance1)`
- **Код правила:** `COLLECTION_NOT_ARRAY`
- **Ожидалось по спецификации:** `Array в поле "transactions"`
- **Фактический ответ сервера:** `undefined`
- **Влияние на клиентское приложение:** Невозможно итерироваться по элементам коллекции.
- **Рекомендация по исправлению:** Всегда возвращать массив в свойстве "transactions".

---

## 3. Рекомендованный контракт API (Target Contracts)

Ниже приведены целевые схемы данных, исключающие необходимость поддерживать клиентские адаптеры и fallback-поля:

### `Источник 1 (/api/finance1)`
```json
{
  "transactions": [
    {
      "id": 1,
      "amount": 100.00,
      "currency": "USD",
      "status": "paid"
    }
  ]
}
```
*Требование: использовать ключ `status` вместо `type`, обязательно передавать первичный ключ `id`, исключить лишние нефинансовые объекты (например, `address`)*.

### `Источник 2 (/api/finance2)`
```json
[
  "100.00 USD",
  "250.50 EUR"
]
```
*Требование: соблюдать формат `<сумма> <КОД_ISO>`, коды валют передавать строго в верхнем регистре.*

---

## 4. Команды для воспроизведения (Reproduce cURL)

```bash
# Источник 1 (/api/finance1)
curl -i -H "x-api-key: prodcpakey333" "https://cpa-server-vtel.onrender.com/api/finance1"

# Источник 2 (/api/finance2)
curl -i -H "x-api-key: prodcpakey333" "https://cpa-server-vtel.onrender.com/api/finance2"

```
