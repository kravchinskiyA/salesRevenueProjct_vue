/**
 * Фича-флаги приложения.
 *
 * dateSwitching — выбор произвольной даты/месяца.
 * Пока API не умеет отдавать данные за конкретную дату, флаг выключен:
 * доступен только текущий день (и текущий месяц), переключатели неактивны.
 *
 * Чтобы включить — добавьте в .env.local:
 *   VITE_FEATURE_DATE_SWITCHING=true
 * и перезапустите dev-сервер. Больше ничего менять не нужно:
 * роутер, стор, API-слой и UI уже читают этот флаг.
 */
export const FEATURES = Object.freeze({
  dateSwitching: import.meta.env.VITE_FEATURE_DATE_SWITCHING === 'true',
})
