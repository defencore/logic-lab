// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A line bank keeps eight separate digital signals in numbered order and shows their combined byte value.',
    'Блок ліній зберігає порядок восьми окремих цифрових сигналів та показує їхнє спільне байтове значення.',
  ],
  steps: [
    [
      'Connect eight switches or gate outputs to pins 0–7.',
      'Підключіть вісім перемикачів або виходів логіки до контактів 0–7.',
    ],
    [
      'Tie unused bit inputs to Ground so every bit is defined.',
      'Підключіть невикористані біти до Землі, щоб усі біти були визначеними.',
    ],
    [
      'Wire Q0…Q7 separately to DAC inputs D0…D7 and vary the switches.',
      'Окремо з’єднайте Q0…Q7 з входами ЦАП D0…D7 та змінюйте перемикачі.',
    ],
  ],
  experiment: [
    'Set only bits 0,2 and 7 high, then wire Q0…Q7 through a line breakout to verify the same pattern.',
    'Встановіть лише біти 0,2 і 7 та підключіть Q0…Q7 до розгалужувача для перевірки тієї самої комбінації.',
  ],
  expected: [
    'The resulting byte is 1+4+128=133. Setting bit n adds the weight 2ⁿ.',
    'Результат дорівнює 1+4+128=133. Встановлення біта n додає вагу 2ⁿ.',
  ],
  pitfalls: [
    [
      'An unwired bit is Z, not 0, and makes the assembled byte unknown. Define all eight inputs.',
      'Непідключений біт є Z, а не 0, і робить зібраний байт невідомим. Задайте всі вісім входів.',
    ],
    [
      'Each output keeps its own bit. Connecting several active drivers to the same bit can cause X; use tri-state control.',
      'Кожен вихід зберігає власний біт. Кілька активних джерел на одному біті можуть дати X; використовуйте керування трьома станами.',
    ],
  ],
  inputs: Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [
      `b${index}`,
      [
        `Bit ${index}: one-bit contribution with weight ${2 ** index}.`,
        `Біт ${index}: однобітний внесок із вагою ${2 ** index}.`,
      ],
    ]),
  ),
  outputs: {
    out: [
      'Q: eight separate output bits; the readout sums their binary weights.',
      'Q: вісім окремих вихідних бітів; індикатор підсумовує їхні двійкові ваги.',
    ],
  },
  examples: ['bus-mux', 'counter'],
};
