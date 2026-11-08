export default {
  id: 'memory-bank-select',
  label: 'Memory map: two RAM banks selected by A4',
  ua: 'Карта пам’яті: вибір двох банків ОЗП бітом A4',
  category: 'architecture',
  level: 'intermediate',
  description:
    'Build a 32-byte memory map from two 16-byte RAMs, decode the high address bit and share eight individually connected read lines.',
  descriptionUa:
    'Побудуйте карту на 32 байти з двох ОЗП по 16 байтів, дешифруйте старший адресний біт і об’єднайте вісім окремих ліній читання.',
  lesson: {
    en: {
      goal: 'Separate a global address into chip selection and a local location without copying data between banks.',
      steps: [
        {
          title: 'Decode the global address',
          text: 'The five-bit global address initially equals 3. A3…A0 select local address 3 in both RAMs. A4=0 enables Bank 0 through NOT A4 and disables Bank 1; the selected-bank lamps show exactly one active bank.',
          nodes: ['address', 'bank-not', 'bank0-led', 'bank1-led'],
        },
        {
          title: 'Write a byte in each bank',
          text: 'At global address 3, write 42 with WE=1 and a CLK 0→1→0 pulse, then restore WE=0. Change global address to 19 (10011), data to 165 and repeat. Both writes use local address 3, but different CS inputs permit different RAMs.',
          nodes: ['address', 'data', 'clock', 'write', 'bank0', 'bank1'],
        },
        {
          title: 'Read the shared signal lines',
          text: 'With WE=0 and OE=1, alternate global addresses 3 and 19. Shared read byte displays 42 and 165. The deselected RAM outputs Z, so only the selected chip drives each shared bit line. Inspect one connection to follow both output branches.',
          nodes: ['address', 'bank0', 'bank1', 'read-byte'],
        },
        {
          title: 'Predict address and output changes',
          text: 'Visit global addresses 2 and 18: both are still 0. Set OE=0 and confirm that the shared output becomes Z without erasing either bank. Restore OE and explain how A4 differs from the four local address lines; copying the low four bits alone would alias addresses 3 and 19.',
          nodes: ['address', 'read', 'read-byte', 'bank0', 'bank1'],
        },
      ],
      expected:
        'Global addresses 0–15 select Bank 0 and 16–31 select Bank 1. Addresses 3 and 19 retain different bytes at the same local offset; the inactive chip releases all eight read lines.',
    },
    ua: {
      goal: 'Розділіть глобальну адресу на вибір мікросхеми й локальну комірку без копіювання даних між банками.',
      steps: [
        {
          title: 'Дешифруйте глобальну адресу',
          text: 'П’ятибітна глобальна адреса спочатку дорівнює 3. A3…A0 обирають локальну адресу 3 в обох ОЗП. A4=0 дозволяє Bank 0 через NOT A4 та вимикає Bank 1; лампи вибору показують рівно один активний банк.',
          nodes: ['address', 'bank-not', 'bank0-led', 'bank1-led'],
        },
        {
          title: 'Запишіть байт у кожен банк',
          text: 'За глобальною адресою 3 запишіть 42 при WE=1 імпульсом CLK 0→1→0, потім поверніть WE=0. Змініть глобальну адресу на 19 (10011), дані на 165 та повторіть. Обидва записи мають локальну адресу 3, але різні CS дозволяють різні ОЗП.',
          nodes: ['address', 'data', 'clock', 'write', 'bank0', 'bank1'],
        },
        {
          title: 'Прочитайте спільні сигнальні лінії',
          text: 'При WE=0 та OE=1 чергуйте глобальні адреси 3 та 19. Shared read byte показує 42 та 165. Невибрана ОЗП має Z на виходах, тому кожен спільний біт веде лише вибрана мікросхема. Перевірте одне з’єднання, простеживши обидві вихідні гілки.',
          nodes: ['address', 'bank0', 'bank1', 'read-byte'],
        },
        {
          title: 'Спрогнозуйте зміни адрес і виходів',
          text: 'Перейдіть до глобальних адрес 2 та 18: обидві все ще містять 0. Задайте OE=0 та перевірте Z на спільному виході без стирання банків. Поверніть OE й поясніть відмінність A4 від чотирьох локальних ліній; лише молодші чотири біти зробили б адреси 3 і 19 нерозрізненними.',
          nodes: ['address', 'read', 'read-byte', 'bank0', 'bank1'],
        },
      ],
      expected:
        'Глобальні адреси 0–15 обирають Bank 0, а 16–31 — Bank 1. Адреси 3 та 19 зберігають різні байти за однаковим локальним зміщенням; невибрана мікросхема відпускає всі вісім ліній читання.',
    },
  },
  circuitPath: 'examples/memory-bank-select/circuit.json',
  labPath: 'examples/memory-bank-select/README.md',
  lab: {
    duration: 40,
    objectives: {
      en: [
        'Split a global memory address into bank selection and local offset.',
        'Explain high-impedance outputs and mutually exclusive chip selection.',
      ],
      ua: [
        'Розділіть глобальну адресу пам’яті на вибір банку й локальне зміщення.',
        'Поясніть високоімпедансні виходи та взаємовиключний вибір мікросхем.',
      ],
    },
    tasks: {
      en: [
        'The five-bit global address initially equals 3. A3…A0 select local address 3 in both RAMs. A4=0 enables Bank 0 through NOT A4 and disables Bank 1; the selected-bank lamps show exactly one active bank.',
        'At global address 3, write 42 with WE=1 and a CLK 0→1→0 pulse, then restore WE=0. Change global address to 19 (10011), data to 165 and repeat. Both writes use local address 3, but different CS inputs permit different RAMs.',
        'With WE=0 and OE=1, alternate global addresses 3 and 19. Shared read byte displays 42 and 165. The deselected RAM outputs Z, so only the selected chip drives each shared bit line. Inspect one connection to follow both output branches.',
        'Visit global addresses 2 and 18: both are still 0. Set OE=0 and confirm that the shared output becomes Z without erasing either bank. Restore OE and explain how A4 differs from the four local address lines; copying the low four bits alone would alias addresses 3 and 19.',
      ],
      ua: [
        'П’ятибітна глобальна адреса спочатку дорівнює 3. A3…A0 обирають локальну адресу 3 в обох ОЗП. A4=0 дозволяє Bank 0 через NOT A4 та вимикає Bank 1; лампи вибору показують рівно один активний банк.',
        'За глобальною адресою 3 запишіть 42 при WE=1 імпульсом CLK 0→1→0, потім поверніть WE=0. Змініть глобальну адресу на 19 (10011), дані на 165 та повторіть. Обидва записи мають локальну адресу 3, але різні CS дозволяють різні ОЗП.',
        'При WE=0 та OE=1 чергуйте глобальні адреси 3 та 19. Shared read byte показує 42 та 165. Невибрана ОЗП має Z на виходах, тому кожен спільний біт веде лише вибрана мікросхема. Перевірте одне з’єднання, простеживши обидві вихідні гілки.',
        'Перейдіть до глобальних адрес 2 та 18: обидві все ще містять 0. Задайте OE=0 та перевірте Z на спільному виході без стирання банків. Поверніть OE й поясніть відмінність A4 від чотирьох локальних ліній; лише молодші чотири біти зробили б адреси 3 і 19 нерозрізненними.',
      ],
    },
    questions: {
      en: [
        'Which bank and local offset correspond to global address 19?',
        'Why can two RAM outputs share a bit line in this circuit?',
        'What would happen if both chip-select inputs were high with different stored bits?',
      ],
      ua: [
        'Який банк і локальне зміщення відповідають глобальній адресі 19?',
        'Чому виходи двох ОЗП можуть мати спільну бітову лінію в цій схемі?',
        'Що відбудеться при двох активних CS і різних збережених бітах?',
      ],
    },
    deliverables: {
      en: [
        'Submit your circuit and a recorded write/read sequence spanning both banks.',
        'Include a 32-address memory map and an explanation of CS and high-impedance behavior.',
      ],
      ua: [
        'Здайте схему й запис послідовності запису/читання обох банків.',
        'Додайте карту 32 адрес та пояснення роботи CS і високоімпедансних виходів.',
      ],
    },
  },
  actionPreset: [
    {
      at: 0.1,
      node: 'write',
      key: 'value',
      value: 1,
    },
    {
      at: 0.2,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 0.3,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 0.4,
      node: 'write',
      key: 'value',
      value: 0,
    },
    {
      at: 0.5,
      node: 'address',
      key: 'value',
      value: 19,
    },
    {
      at: 0.6,
      node: 'data',
      key: 'value',
      value: 165,
    },
    {
      at: 0.7,
      node: 'write',
      key: 'value',
      value: 1,
    },
    {
      at: 0.8,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 0.9,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 1,
      node: 'write',
      key: 'value',
      value: 0,
    },
    {
      at: 1.1,
      node: 'address',
      key: 'value',
      value: 3,
    },
    {
      at: 1.2,
      node: 'address',
      key: 'value',
      value: 19,
    },
  ],
  actionProbes: [
    {
      node: 'read-byte',
      port: 'out',
      side: 'outputs',
    },
  ],
};
