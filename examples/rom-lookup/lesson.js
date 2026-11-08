export default {
  id: 'rom-lookup',
  label: 'ROM: address-to-display lookup table',
  ua: 'ПЗП: таблиця відповідності адреси й індикатора',
  category: 'architecture',
  level: 'intermediate',
  description:
    'Use ROM addresses as hexadecimal character codes and read the stored segment masks directly on a seven-segment display.',
  descriptionUa:
    'Використайте адреси ПЗП як коди шістнадцяткових символів і прочитайте збережені маски сегментів на індикаторі.',
  lesson: {
    en: {
      goal: 'Explain how a stored lookup table replaces a combinational address-to-output function.',
      steps: [
        {
          title: 'Read a hexadecimal glyph',
          text: 'The initial address is decimal 10 (binary 1010, hexadecimal A). With CS=OE=1, ROM reads 119 and the display shows A. Address bits choose a stored byte; they are not the segment mask itself.',
          nodes: ['address', 'rom', 'display'],
        },
        {
          title: 'Walk through the complete table',
          text: 'Set Address successively to 0,1,…,15. Expect 0–9 followed by A,b,C,d,E,F. At addresses 0,1,10 and 15 the stored masks are 63,6,119 and 113. Record the eight individual output bits as well as the glyph.',
          nodes: ['address', 'rom', 'display'],
        },
        {
          title: 'Change table contents deliberately',
          text: 'Select ROM and edit its Data list in the inspector. Replace the byte at index 1 with 63, then select address 1: the display now shows 0. Restore that table entry to 6. No clock or runtime write input is involved.',
          nodes: ['rom', 'address', 'display'],
        },
        {
          title: 'Release and restore outputs',
          text: 'Turn OE off, inspect the Z states, and observe the blank display. Restore OE=1, then test CS=0 separately. Re-enabling both restores the same addressed glyph; disabling an output did not erase the table.',
          nodes: ['chip', 'read', 'rom', 'display'],
        },
      ],
      expected:
        'Four address bits select one of 16 fixed segment masks. Table editing changes the function; CS or OE low releases outputs without changing stored entries.',
    },
    ua: {
      goal: 'Поясніть, як таблиця в пам’яті задає комбінаційну відповідність адреси й виходу.',
      steps: [
        {
          title: 'Прочитайте шістнадцятковий символ',
          text: 'Початкова адреса — десяткове 10 (двійкове 1010, шістнадцяткове A). При CS=OE=1 ПЗП читає 119, а індикатор показує A. Адресні біти обирають збережений байт, а не є самою маскою сегментів.',
          nodes: ['address', 'rom', 'display'],
        },
        {
          title: 'Перегляньте всю таблицю',
          text: 'По черзі задайте Address=0,1,…,15. Очікуйте 0–9, а потім A,b,C,d,E,F. За адресами 0,1,10 і 15 маски дорівнюють 63,6,119 та 113. Запишіть вісім окремих вихідних бітів разом із символом.',
          nodes: ['address', 'rom', 'display'],
        },
        {
          title: 'Свідомо змініть вміст таблиці',
          text: 'Оберіть ПЗП та відредагуйте список Data в інспекторі. Замініть байт з індексом 1 на 63 і задайте адресу 1: індикатор покаже 0. Відновіть значення 6. Такт або вхід запису під час роботи для цього не потрібні.',
          nodes: ['rom', 'address', 'display'],
        },
        {
          title: 'Відпустіть і відновіть виходи',
          text: 'Вимкніть OE, перевірте стани Z та погаслий індикатор. Поверніть OE=1 і окремо перевірте CS=0. Увімкнення обох відновлює той самий адресований символ: вимкнення виходу не стерло таблицю.',
          nodes: ['chip', 'read', 'rom', 'display'],
        },
      ],
      expected:
        'Чотири адресні біти обирають одну з 16 сталих масок сегментів. Редагування таблиці змінює функцію; CS або OE=0 відпускає виходи без зміни вмісту.',
    },
  },
  circuitPath: 'examples/rom-lookup/circuit.json',
  labPath: 'examples/rom-lookup/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Map a four-bit address to an eight-bit stored output.',
        'Interpret individual segment bits and distinguish ROM contents from read controls.',
      ],
      ua: [
        'Зіставте чотирибітну адресу з восьмибітним збереженим виходом.',
        'Розшифруйте біти сегментів і відрізніть вміст ПЗП від керування читанням.',
      ],
    },
    tasks: {
      en: [
        'The initial address is decimal 10 (binary 1010, hexadecimal A). With CS=OE=1, ROM reads 119 and the display shows A. Address bits choose a stored byte; they are not the segment mask itself.',
        'Set Address successively to 0,1,…,15. Expect 0–9 followed by A,b,C,d,E,F. At addresses 0,1,10 and 15 the stored masks are 63,6,119 and 113. Record the eight individual output bits as well as the glyph.',
        'Select ROM and edit its Data list in the inspector. Replace the byte at index 1 with 63, then select address 1: the display now shows 0. Restore that table entry to 6. No clock or runtime write input is involved.',
        'Turn OE off, inspect the Z states, and observe the blank display. Restore OE=1, then test CS=0 separately. Re-enabling both restores the same addressed glyph; disabling an output did not erase the table.',
      ],
      ua: [
        'Початкова адреса — десяткове 10 (двійкове 1010, шістнадцяткове A). При CS=OE=1 ПЗП читає 119, а індикатор показує A. Адресні біти обирають збережений байт, а не є самою маскою сегментів.',
        'По черзі задайте Address=0,1,…,15. Очікуйте 0–9, а потім A,b,C,d,E,F. За адресами 0,1,10 і 15 маски дорівнюють 63,6,119 та 113. Запишіть вісім окремих вихідних бітів разом із символом.',
        'Оберіть ПЗП та відредагуйте список Data в інспекторі. Замініть байт з індексом 1 на 63 і задайте адресу 1: індикатор покаже 0. Відновіть значення 6. Такт або вхід запису під час роботи для цього не потрібні.',
        'Вимкніть OE, перевірте стани Z та погаслий індикатор. Поверніть OE=1 і окремо перевірте CS=0. Увімкнення обох відновлює той самий адресований символ: вимкнення виходу не стерло таблицю.',
      ],
    },
    questions: {
      en: [
        'Why does address 10 produce byte 119 rather than 10?',
        'Which table entry must change to alter only the glyph at address 1?',
        'Why does disabling OE preserve the lookup table?',
      ],
      ua: [
        'Чому адреса 10 дає байт 119, а не 10?',
        'Який елемент таблиці треба змінити лише для символу за адресою 1?',
        'Чому вимкнення OE зберігає таблицю відповідностей?',
      ],
    },
    deliverables: {
      en: [
        'Submit the complete address/segment-mask table with your recorded address sweep.',
        'Submit an edited ROM project plus an explanation of one intentionally changed glyph.',
      ],
      ua: [
        'Здайте повну таблицю адрес/масок сегментів із записом перебору адрес.',
        'Здайте проєкт зі зміненою ПЗП та поясненням одного свідомо зміненого символу.',
      ],
    },
  },
  actionPreset: [
    {
      at: 0.1,
      node: 'address',
      key: 'value',
      value: 0,
    },
    {
      at: 0.2,
      node: 'address',
      key: 'value',
      value: 1,
    },
    {
      at: 0.3,
      node: 'address',
      key: 'value',
      value: 2,
    },
    {
      at: 0.4,
      node: 'address',
      key: 'value',
      value: 3,
    },
    {
      at: 0.5,
      node: 'address',
      key: 'value',
      value: 4,
    },
    {
      at: 0.6,
      node: 'address',
      key: 'value',
      value: 5,
    },
    {
      at: 0.7,
      node: 'address',
      key: 'value',
      value: 6,
    },
    {
      at: 0.8,
      node: 'address',
      key: 'value',
      value: 7,
    },
    {
      at: 0.9,
      node: 'address',
      key: 'value',
      value: 8,
    },
    {
      at: 1.0,
      node: 'address',
      key: 'value',
      value: 9,
    },
    {
      at: 1.1,
      node: 'address',
      key: 'value',
      value: 10,
    },
    {
      at: 1.2,
      node: 'address',
      key: 'value',
      value: 11,
    },
    {
      at: 1.3,
      node: 'address',
      key: 'value',
      value: 12,
    },
    {
      at: 1.4,
      node: 'address',
      key: 'value',
      value: 13,
    },
    {
      at: 1.5,
      node: 'address',
      key: 'value',
      value: 14,
    },
    {
      at: 1.6,
      node: 'address',
      key: 'value',
      value: 15,
    },
  ],
  actionProbes: [
    {
      node: 'rom',
      port: 'out',
      side: 'outputs',
    },
  ],
};
