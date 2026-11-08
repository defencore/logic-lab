// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Byte value supplies a whole unsigned byte, plus narrower views for BCD digits and addresses.',
    'Значення байта задає цілий беззнаковий байт і його вужчі частини для BCD-цифр та адрес.',
  ],
  steps: [
    [
      'Add Byte value and set Value to an integer from 0 to 255.',
      'Додайте Значення байта та задайте ціле Value від 0 до 255.',
    ],
    [
      'Connect D0…D7 to the eight data inputs, or use the BCD and ADDR lines for four-bit and three-bit values.',
      'Підключіть D0…D7 до восьми входів даних або використайте окремі лінії BCD і ADDR для чотирьох та трьох бітів.',
    ],
    [
      'Check each receiver bit in Properties and keep the line numbers in the same order.',
      'Перевірте кожен біт приймача у властивостях і збережіть порядок номерів ліній.',
    ],
  ],
  experiment: [
    'Set Value=173. Compare D=173, BCD=13 and ADDR=5.',
    'Задайте Value=173. Порівняйте D=173, BCD=13 та ADDR=5.',
  ],
  expected: [
    'The narrower outputs contain only the lowest bits; they are not decimal-digit conversions.',
    'Вужчі виходи містять лише молодші біти; це не перетворення на десяткові цифри.',
  ],
  pitfalls: [
    [
      'Connect every required bit separately. A switch can drive any single data line; tie unused inputs to Ground.',
      'Підключіть кожен потрібний біт окремо. Перемикач може керувати однією лінією; невикористані входи підключіть до Землі.',
    ],
    [
      'For a BCD decoder keep BCD between 0 and 9; values 10–15 are not decimal digits.',
      'Для BCD-декодера тримайте BCD у межах 0–9; значення 10–15 не є десятковими цифрами.',
    ],
  ],
  outputs: {
    out: [
      'D: the rounded value clamped to 0–255, shown on eight separate lines.',
      'D: округлене значення в межах 0–255 на восьми окремих лініях.',
    ],
    nibble: ['BCD: value AND 15, range 0–15.', 'BCD: значення І 15, діапазон 0–15.'],
    address: ['ADDR: value AND 7, range 0–7.', 'ADDR: значення І 7, діапазон 0–7.'],
  },
  examples: ['bcd-display', 'bus-mux', 'alu', 'ram'],
};
