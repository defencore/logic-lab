// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Power supplies a digital constant 1, useful for enable pins and fixed logic conditions.',
    'Живлення задає цифрову константу 1 для входів дозволу та постійних логічних умов.',
  ],
  steps: [
    [
      'Add Power and connect its 1 output to an Enable input.',
      'Додайте Живлення та підключіть вихід 1 до входу Enable.',
    ],
    [
      'Attach the same output to an LED to verify the fixed high level.',
      'Підключіть цей вихід також до світлодіода для перевірки постійної одиниці.',
    ],
    [
      'Use separate wires from this output when several controls must stay enabled.',
      'Використовуйте окремі дроти від цього виходу для кількох постійно активних входів.',
    ],
  ],
  experiment: [
    'Feed VCC and a switch into AND; Q should now follow the switch.',
    'Подайте VCC і перемикач на І: Q повторюватиме перемикач.',
  ],
  expected: [
    'Every connected one-bit input reads 1; the test LED stays lit.',
    'Кожен підключений однобітний вхід читає 1; перевірочний світлодіод постійно світиться.',
  ],
  pitfalls: [
    [
      'Digital VCC=1 is a bit, not an analog 5 V supply. Use a DAC for a voltage.',
      'Цифровий VCC=1 — це біт, а не аналогове джерело 5 В. Для напруги використовуйте ЦАП.',
    ],
    [
      'Do not join strong VCC and Ground outputs: the shared net becomes X. A pull-up is the weak alternative.',
      'Не з’єднуйте сильні виходи VCC і Землі: мережа отримає X. Підтяжка дає слабку альтернативу.',
    ],
  ],
  outputs: {
    out: [
      'A continuously driven one-bit 1; disabling the source changes it to Z.',
      'Постійна однобітна 1; вимкнення джерела змінює її на Z.',
    ],
  },
  examples: ['logic-gates', 'd-memory'],
};
