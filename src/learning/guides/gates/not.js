// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A NOT gate reverses one digital condition: high becomes low and low becomes high.',
    'Інвертор змінює цифрову умову на протилежну: одиницю на нуль, а нуль на одиницю.',
  ],
  steps: [
    ['Add one switch, a NOT gate and an LED.', 'Додайте перемикач, інвертор та світлодіод.'],
    [
      'Connect switch Q to A and inverter Q to LED D.',
      'Підключіть Q перемикача до A, а Q інвертора — до D світлодіода.',
    ],
    [
      'Toggle the switch and watch the opposite LED state.',
      'Перемикайте вхід та спостерігайте протилежний стан світлодіода.',
    ],
  ],
  experiment: [
    'Put a second NOT gate after the first. Its output restores the original input.',
    'Поставте другий інвертор після першого. Його вихід відновить початковий сигнал.',
  ],
  expected: [
    'A=0 gives Q=1; A=1 gives Q=0. Two inversions give the original bit.',
    'A=0 дає Q=1; A=1 дає Q=0. Дві інверсії повертають початковий біт.',
  ],
  pitfalls: [
    [
      'NOT cannot recover a floating or conflicting input: Z or X is interpreted as unknown logic.',
      'Інвертор не відновлює непідключений або конфліктний вхід: Z чи X дає невідомий результат.',
    ],
  ],
  inputs: { a: ['The one-bit signal to invert.', 'Однобітний сигнал для інверсії.'] },
  outputs: { out: ['The logical complement of A.', 'Логічне заперечення A.'] },
  examples: ['logic-gates'],
};
