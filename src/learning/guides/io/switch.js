// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A toggle switch supplies a digital bit that you can change by hand during a simulation.',
    'Перемикач задає цифровий біт, який можна вручну змінювати під час симуляції.',
  ],
  steps: [
    [
      'Place the switch and connect Q to a gate input or LED D.',
      'Розмістіть перемикач і підключіть Q до входу елемента або D світлодіода.',
    ],
    [
      'Use its switch control to alternate between 0 and 1.',
      'Користуйтеся кнопкою перемикача для зміни між 0 і 1.',
    ],
    [
      'Set Value in Properties if you need a particular initial switch position.',
      'Задайте Value у властивостях, якщо потрібен певний початковий стан.',
    ],
  ],
  experiment: [
    'Use one switch as a manual clock: 0→1 is a rising edge; returning to 0 prepares the next edge.',
    'Використайте перемикач як ручний такт: 0→1 є додатним фронтом; повернення в 0 готує наступний фронт.',
  ],
  expected: [
    'An LED follows the position immediately; an edge-triggered register changes only on the 0→1 transition.',
    'Світлодіод одразу повторює стан; регістр із тактуванням змінюється лише під час переходу 0→1.',
  ],
  pitfalls: [
    [
      'Holding a manual clock at 1 does not generate repeated clock edges.',
      'Утримання ручного такту в 1 не створює повторних фронтів.',
    ],
    [
      'Value is interpreted as a bit: zero is low and a nonzero value is high. Use Byte value for numbers.',
      'Value трактується як біт: нуль є 0, ненульове значення — 1. Для чисел використовуйте Значення байта.',
    ],
  ],
  outputs: {
    out: ['The current one-bit switch position.', 'Поточний однобітний стан перемикача.'],
  },
  examples: ['half-adder', 'd-memory', 'ram'],
};
