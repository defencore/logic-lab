// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'ROM supplies a preset lookup table of 16 bytes, such as program constants or display patterns.',
    'ПЗП задає попередньо заповнену таблицю з 16 байтів, наприклад константи програми чи шаблони індикатора.',
  ],
  steps: [
    [
      'Enter up to 16 comma-separated bytes in Data; decimal and 0x-prefixed hexadecimal values are accepted.',
      'Введіть до 16 байтів через кому в Data; приймаються десяткові та шістнадцяткові з префіксом 0x.',
    ],
    [
      'Wire the four BCD lines to ADDR0…ADDR3 and keep CS=1,OE=1.',
      'Окремо підключіть чотири лінії BCD до ADDR0…ADDR3 та тримайте CS=1,OE=1.',
    ],
    [
      'Read the ROM value and observe Q0…Q7 while stepping through populated addresses.',
      'Читайте значення ПЗП та спостерігайте Q0…Q7, змінюючи адресу по заповнених комірках.',
    ],
  ],
  experiment: [
    'Set Data to 63,6,91,79 and connect Q directly to a seven-segment display; select addresses 0–3.',
    'Задайте Data як 63,6,91,79 та підключіть Q безпосередньо до семисегментного індикатора; обирайте адреси 0–3.',
  ],
  expected: [
    'The four addresses draw digits 0,1,2,3. Unspecified table locations read zero.',
    'Чотири адреси малюють цифри 0,1,2,3. Незаповнені комірки читаються як нуль.',
  ],
  pitfalls: [
    [
      'ROM has no clock or write input; editing Data changes its configured contents rather than performing a RAM write.',
      'ПЗП не має такту чи входу запису; редагування Data змінює налаштування, а не виконує запис ОЗП.',
    ],
    [
      'CS and OE are active-high and default to 1 if unwired; lowering either one releases Q to Z.',
      'CS та OE активні одиницею й без дроту означають 1; нуль на будь-якому переводить Q у Z.',
    ],
  ],
  inputs: {
    address: [
      'ADDR: four-bit index 0–15 into the configured table.',
      'ADDR: чотирибітний індекс 0–15 у заданій таблиці.',
    ],
    cs: ['CS: active-high chip select.', 'CS: вибір мікросхеми одиницею.'],
    oe: ['OE: active-high permission to drive Q.', 'OE: дозвіл керувати Q одиницею.'],
  },
  outputs: {
    out: [
      'Q: the selected table byte when CS and OE are high, otherwise Z.',
      'Q: обраний байт таблиці при CS=OE=1, інакше Z.',
    ],
  },
  examples: ['ram', 'bcd-display'],
};
