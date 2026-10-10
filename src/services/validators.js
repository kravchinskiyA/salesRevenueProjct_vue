// Валидаторы входящих данных (перенесены из hw2: validators/*.js)

export function validateFirstSource(source) {
  //проверка на объект входящих данных
  if (!source || typeof source !== 'object') {
    throw new TypeError('Первый источник: должен быть объектом')
  }
  //проверка на массив транзакций
  if (!source.transactions || !Array.isArray(source.transactions)) {
    throw new TypeError('Первый источник: firstSource.transactions должен быть массивом или его нет')
  }
  if (source.transactions.length === 0) {
    console.info('firstsource', 'Первый источник: в первом источнике нет транзакций')
    return true
  }
  //проверка на ключи и типы значений в объекте транзакции
  for (const transaction of source.transactions) {
    if (typeof transaction !== 'object' || transaction === null) {
      throw new TypeError('Первый источник: Элемент транзакции должен быть объектом')
    }

    if (!('amount' in transaction) || !('currency' in transaction)) {
      throw new Error('Первый источник: Элемент транзакции должен содержать поля amount и currency')
    }

    if (typeof transaction.amount !== 'number') {
      throw new TypeError('Первый источник: Поле amount должно быть числом')
    }

    if (typeof transaction.currency !== 'string') {
      throw new TypeError('Первый источник: Поле currency должно быть строкой')
    }
  }
  return true
}

export function validateSecondSource(source) {
  if (!source || !Array.isArray(source)) {
    throw new TypeError('Второй источник: должен быть массивом')
  }
  if (source.length === 0) {
    console.info('secondsource', 'Второй источник: во втором источнике нет транзаций')
    return true
  }
  //проверка элементов массива на строку
  for (const item of source) {
    if (typeof item !== 'string') {
      throw new TypeError('Второй источник: Элемент массива должен быть строкой')
    }
    if (!Number(item.split(' ')[0])) {
      throw new TypeError('Второй источник: Элемент массива должен содержать cумму транзации')
    }
  }
  return true
}

export function validateCurrencyRates(currency) {
  if (!currency?.rates || Object.keys(currency.rates).length === 0) {
    throw new Error('Currency rates are not available')
  }
  return true
}
