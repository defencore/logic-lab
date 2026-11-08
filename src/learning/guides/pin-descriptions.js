// English and Ukrainian descriptions shared by related component manuals.
export const gatePins = {
  a: [
    'First one-bit operand. Connect a switch or another gate output.',
    'Перший однобітний аргумент. Підключіть перемикач або вихід іншого елемента.',
  ],
  b: ['Second one-bit operand, independent of A.', 'Другий однобітний аргумент, незалежний від A.'],
};

export const resetPin = [
  'RST: active-high asynchronous reset; an unwired reset is treated as inactive in this model.',
  'RST: асинхронне скидання одиницею; непідключене скидання в цій моделі вважається неактивним.',
];

export const clockPin = [
  'CLK: captures or changes state on a 0→1 transition only.',
  'CLK: запам’ятовує або змінює стан лише за переходом 0→1.',
];

export const qPins = {
  q: ['Q: the stored one-bit state.', 'Q: збережений однобітний стан.'],
  nq: ['Q̅: the logical complement of the stored state.', 'Q̅: логічна інверсія збереженого стану.'],
};
