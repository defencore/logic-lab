export default {
  id: 'shift-register-sequence',
  label: 'Shift register: serial loading and replay',
  ua: 'Регістр зсуву: послідовне завантаження й повтор',
  category: 'sequential',
  level: 'beginner',
  description:
    'Load an eight-bit pattern through SER and manual CLK edges, observe each stored bit, then reset and replay the experiment.',
  descriptionUa:
    'Завантажте восьмибітний шаблон через SER і ручні фронти CLK, простежте кожен біт, а потім скиньте та повторіть дослід.',
  lesson: {
    en: {
      goal: 'Predict how each rising edge shifts stored bits and captures SER into Q0.',
      steps: [
        {
          title: 'Establish the initial state',
          text: 'Set CLK=0, then set RST=1 and return RST to 0. All Q lamps go low immediately. RST is asynchronous: it does not need a clock edge. Keep SER=0 for now.',
          nodes: ['clock', 'reset', 'shift'],
        },
        {
          title: 'Capture and hold one bit',
          text: 'Set SER=1 and switch CLK from 0 to 1. Q0 lights and the stored byte is 1. While CLK remains 1, set SER=0: the byte stays 1. Return CLK to 0 before the next capture.',
          nodes: ['ser', 'clock', 'shift', 'bit0'],
        },
        {
          title: 'Load a complete pattern',
          text: 'Reset again and enter SER bits 1,0,1,0,0,1,0,1 in that order, giving each bit its own CLK 0→1→0 pulse. The byte values after rising edges are 1,2,5,10,20,41,82,165. Read Q7…Q0 as 10100101. SOUT shows the current Q7, not a separate remembered discarded bit.',
          nodes: ['ser', 'clock', 'shift', 'serial'],
        },
        {
          title: 'Record, replay and explain',
          text: 'Start a fresh action recording, repeat the initial reset and eight pulses, then stop and replay. Compare the chronological input log and all eight output bits. Finally test RST=1 with CLK held high and explain why the byte still clears.',
          nodes: ['ser', 'clock', 'reset', 'shift'],
        },
      ],
      expected:
        'Eight MSB-first serial bits 10100101 produce decimal 165. Data changes without a rising edge do not shift; active RST clears immediately.',
    },
    ua: {
      goal: 'Спрогнозуйте зсув збережених бітів і захоплення SER у Q0 за кожним додатним фронтом.',
      steps: [
        {
          title: 'Підготуйте початковий стан',
          text: 'Задайте CLK=0, увімкніть RST=1 і поверніть RST у 0. Усі лампи Q негайно згаснуть. RST асинхронний: тактовий фронт для скидання не потрібен. Поки залиште SER=0.',
          nodes: ['clock', 'reset', 'shift'],
        },
        {
          title: 'Запишіть і втримайте один біт',
          text: 'Установіть SER=1 і перемкніть CLK із 0 в 1. Засвітиться Q0, збережений байт дорівнює 1. Не змінюючи CLK=1, задайте SER=0: байт залишиться 1. Перед наступним записом поверніть CLK у 0.',
          nodes: ['ser', 'clock', 'shift', 'bit0'],
        },
        {
          title: 'Завантажте повний шаблон',
          text: 'Знову скиньте регістр і по черзі подайте SER: 1,0,1,0,0,1,0,1, роблячи для кожного біта імпульс CLK 0→1→0. Після фронтів байт має значення 1,2,5,10,20,41,82,165. Q7…Q0 — 10100101. SOUT показує поточний Q7, а не окремо збережений витіснений біт.',
          nodes: ['ser', 'clock', 'shift', 'serial'],
        },
        {
          title: 'Запишіть, відтворіть і поясніть',
          text: 'Почніть новий запис дій, повторіть початкове скидання й вісім імпульсів, зупиніть та відтворіть. Порівняйте послідовність входів і всі вісім вихідних бітів. Окремо перевірте RST=1 при постійному CLK=1 та поясніть, чому байт очищається.',
          nodes: ['ser', 'clock', 'reset', 'shift'],
        },
      ],
      expected:
        'Вісім послідовних бітів 10100101 від старшого до молодшого дають число 165. Зміна даних без фронту не зсуває регістр; активний RST негайно очищає його.',
    },
  },
  circuitPath: 'examples/shift-register-sequence/circuit.json',
  labPath: 'examples/shift-register-sequence/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Distinguish a clock level from a rising-edge event.',
        'Trace bit position, serial order and asynchronous reset.',
      ],
      ua: [
        'Відрізніть рівень такту від події додатного фронту.',
        'Простежте позиції бітів, порядок передавання й асинхронне скидання.',
      ],
    },
    tasks: {
      en: [
        'Set CLK=0, then set RST=1 and return RST to 0. All Q lamps go low immediately. RST is asynchronous: it does not need a clock edge. Keep SER=0 for now.',
        'Set SER=1 and switch CLK from 0 to 1. Q0 lights and the stored byte is 1. While CLK remains 1, set SER=0: the byte stays 1. Return CLK to 0 before the next capture.',
        'Reset again and enter SER bits 1,0,1,0,0,1,0,1 in that order, giving each bit its own CLK 0→1→0 pulse. The byte values after rising edges are 1,2,5,10,20,41,82,165. Read Q7…Q0 as 10100101. SOUT shows the current Q7, not a separate remembered discarded bit.',
        'Start a fresh action recording, repeat the initial reset and eight pulses, then stop and replay. Compare the chronological input log and all eight output bits. Finally test RST=1 with CLK held high and explain why the byte still clears.',
      ],
      ua: [
        'Задайте CLK=0, увімкніть RST=1 і поверніть RST у 0. Усі лампи Q негайно згаснуть. RST асинхронний: тактовий фронт для скидання не потрібен. Поки залиште SER=0.',
        'Установіть SER=1 і перемкніть CLK із 0 в 1. Засвітиться Q0, збережений байт дорівнює 1. Не змінюючи CLK=1, задайте SER=0: байт залишиться 1. Перед наступним записом поверніть CLK у 0.',
        'Знову скиньте регістр і по черзі подайте SER: 1,0,1,0,0,1,0,1, роблячи для кожного біта імпульс CLK 0→1→0. Після фронтів байт має значення 1,2,5,10,20,41,82,165. Q7…Q0 — 10100101. SOUT показує поточний Q7, а не окремо збережений витіснений біт.',
        'Почніть новий запис дій, повторіть початкове скидання й вісім імпульсів, зупиніть та відтворіть. Порівняйте послідовність входів і всі вісім вихідних бітів. Окремо перевірте RST=1 при постійному CLK=1 та поясніть, чому байт очищається.',
      ],
    },
    questions: {
      en: [
        'Why must CLK return to 0 between two captures?',
        'What byte appears after the fourth bit, and why?',
        'What does SOUT mean when the final byte is 165?',
      ],
      ua: [
        'Чому між двома записами CLK треба повертати у 0?',
        'Який байт буде після четвертого біта й чому?',
        'Що означає SOUT при кінцевому байті 165?',
      ],
    },
    deliverables: {
      en: [
        'Submit your circuit and the recorded input sequence with replayed results.',
        'Provide a table of SER, CLK, RST and Q7…Q0 after every rising edge, plus your explanation.',
      ],
      ua: [
        'Здайте схему та записану послідовність входів із результатами повтору.',
        'Додайте таблицю SER, CLK, RST і Q7…Q0 після кожного фронту та власне пояснення.',
      ],
    },
  },
  actionPreset: [
    {
      at: 0,
      node: 'reset',
      key: 'value',
      value: 1,
    },
    {
      at: 0.1,
      node: 'reset',
      key: 'value',
      value: 0,
    },
    {
      at: 0.3,
      node: 'ser',
      key: 'value',
      value: 1,
    },
    {
      at: 0.4,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 0.5,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 0.6,
      node: 'ser',
      key: 'value',
      value: 0,
    },
    {
      at: 0.7,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 0.8,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 0.9,
      node: 'ser',
      key: 'value',
      value: 1,
    },
    {
      at: 1.0,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 1.1,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 1.2,
      node: 'ser',
      key: 'value',
      value: 0,
    },
    {
      at: 1.3,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 1.4,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 1.5,
      node: 'ser',
      key: 'value',
      value: 0,
    },
    {
      at: 1.6,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 1.7,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 1.8,
      node: 'ser',
      key: 'value',
      value: 1,
    },
    {
      at: 1.9,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 2.0,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 2.1,
      node: 'ser',
      key: 'value',
      value: 0,
    },
    {
      at: 2.2,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 2.3,
      node: 'clock',
      key: 'value',
      value: 0,
    },
    {
      at: 2.4,
      node: 'ser',
      key: 'value',
      value: 1,
    },
    {
      at: 2.5,
      node: 'clock',
      key: 'value',
      value: 1,
    },
    {
      at: 2.6,
      node: 'clock',
      key: 'value',
      value: 0,
    },
  ],
  actionProbes: [
    {
      node: 'shift',
      port: 'out',
      side: 'outputs',
    },
  ],
};
