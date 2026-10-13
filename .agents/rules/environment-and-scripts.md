# Правило: Переменные окружения и команды разработки (Environment & Scripts)

## Назначение
Регламент конфигурации окружения проекта, ключей доступа к API и команд сборки/запуска.

## 1. Переменные окружения
Локальные параметры задаются в файле `.env.local` (добавлен в `.gitignore`), создаваемом на основе `.env.example`.

### Шаблон конфигурации (`.env.local`)
```ini
# Ключ доступа к финансовым API-источникам
VITE_SOURCES_API_KEY=your_sources_api_key

# Ключ к API курсов валют CurrencyFreaks
VITE_CURRENCY_API_KEY=your_currencyfreaks_key

# Опционально: активация свободного переключения исторических дат (true/false)
# VITE_FEATURE_DATE_SWITCHING=true
```

## 2. Команды разработки
Все команды выполняются из корня проекта `salesRevenueProject`:

- **Установка зависимостей:**
  ```bash
  npm install
  ```
- **Запуск dev-сервера с HMR (Hot Module Replacement):**
  ```bash
  npm run dev
  ```
- **Проверка типов / Сборка production-бандла:**
  ```bash
  npm run build
  ```
- **Локальный предпросмотр собранного production-бандла:**
  ```bash
  npm run preview
  ```
