// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Ground is a digital constant 0 that makes an unused control deliberately inactive.',
    'Земля — цифрова константа 0, що явно вимикає невикористаний керувальний вхід.',
  ],
  steps: [
    ['Add Ground from Inputs & outputs.', 'Додайте Землю з розділу джерел та індикаторів.'],
    [
      'Connect its 0 output to a reset input that should remain inactive.',
      'Підключіть вихід 0 до входу скидання, який має бути неактивним.',
    ],
    [
      'Fan the same output out to other one-bit inputs requiring a definite 0.',
      'За потреби розгалузьте цей вихід до інших однобітних входів із потрібним нулем.',
    ],
  ],
  experiment: [
    'Compare an AND input connected to Ground with one left unwired in Diagnostics.',
    'Порівняйте в діагностиці вхід І, підключений до Землі, та непідключений вхід.',
  ],
  expected: [
    'Connected inputs read 0. They no longer have a floating-Z warning.',
    'Підключені входи показують 0. Попередження про непідключений стан Z зникає.',
  ],
  pitfalls: [
    [
      'This is a logic source, not a simulated electrical reference or a all eight zero-valued data lines.',
      'Це логічне джерело, а не модель електричної землі чи готові вісім нульових ліній даних.',
    ],
    [
      'A strong 1 on the same net conflicts with Ground and creates X. Disabling Ground releases its output to Z.',
      'Сильна 1 у тій самій мережі конфліктує із Землею та дає X. Вимкнення Землі переводить вихід у Z.',
    ],
  ],
  outputs: {
    out: [
      'A continuously driven one-bit 0 while enabled.',
      'Постійний однобітний 0, поки елемент увімкнено.',
    ],
  },
  examples: ['d-memory', 'counter'],
};
