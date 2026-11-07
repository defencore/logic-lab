export default {
  id: 'bus-mux',
  label: 'Route an eight-bit bus',
  ua: 'Маршрутизація восьмибітної шини',
  category: 'architecture',
  level: 'intermediate',
  description: 'Select a byte, split and merge its bits, then route it to one output.',
  descriptionUa: 'Оберіть байт, розділіть та об’єднайте біти й спрямуйте на один вихід.',
  lesson: {
    en: {
      goal: 'Follow a byte through selection, individual wires and routing.',
      steps: [
        {
          title: 'Select byte A',
          text: 'Select B starts at 0. The multiplexer forwards Byte A=42. Select MUX to see the numeric bus input and output values.',
          nodes: ['a', 'b', 'select', 'mux'],
        },
        {
          title: 'Follow the bit order',
          text: 'The splitter sends b0 to b0, b1 to b1 and so on. The merger reconstructs the same byte. Thick wires carry eight bits; thin wires carry one.',
          nodes: ['splitter', 'merger'],
        },
        {
          title: 'Switch the route',
          text: 'Turn Select B on. Now 165 appears at Route 1 and Route 0 becomes 0. Turn it off to send 42 to Route 0. Select a scope to read its input immediately, or Run to draw traces.',
          nodes: ['select', 'demux', 'left', 'right'],
        },
      ],
      expected:
        'Selector 0 chooses A and route 0; selector 1 chooses B and route 1. Splitting and merging preserve the byte.',
    },
    ua: {
      goal: 'Простежте байт через вибір, окремі дроти й розподіл.',
      steps: [
        {
          title: 'Оберіть байт A',
          text: 'Select B спочатку має 0. Мультиплексор передає Byte A=42. Оберіть MUX, щоб побачити числові значення шин.',
          nodes: ['a', 'b', 'select', 'mux'],
        },
        {
          title: 'Простежте порядок бітів',
          text: 'Розгалужувач з’єднує b0 з b0, b1 з b1 тощо. Об’єднувач відновлює той самий байт. Товсті дроти передають вісім бітів, тонкі — один.',
          nodes: ['splitter', 'merger'],
        },
        {
          title: 'Перемкніть маршрут',
          text: 'Увімкніть Select B. Тепер Route 1 має 165, Route 0 — 0. Вимкніть його для передавання 42 у Route 0. Вхід осцилографа видно відразу; Запуск малює графік.',
          nodes: ['select', 'demux', 'left', 'right'],
        },
      ],
      expected:
        'Селектор 0 обирає A та маршрут 0, селектор 1 — B та маршрут 1. Розділення й об’єднання зберігають байт.',
    },
  },
  circuitPath: 'examples/bus-mux/circuit.json',
  labPath: 'examples/bus-mux/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Follow a byte through selection, individual wires and routing.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Простежте байт через вибір, окремі дроти й розподіл.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Select B starts at 0. The multiplexer forwards Byte A=42. Select MUX to see the numeric bus input and output values.',
        'The splitter sends b0 to b0, b1 to b1 and so on. The merger reconstructs the same byte. Thick wires carry eight bits; thin wires carry one.',
        'Turn Select B on. Now 165 appears at Route 1 and Route 0 becomes 0. Turn it off to send 42 to Route 0. Select a scope to read its input immediately, or Run to draw traces.',
      ],
      ua: [
        'Select B спочатку має 0. Мультиплексор передає Byte A=42. Оберіть MUX, щоб побачити числові значення шин.',
        'Розгалужувач з’єднує b0 з b0, b1 з b1 тощо. Об’єднувач відновлює той самий байт. Товсті дроти передають вісім бітів, тонкі — один.',
        'Увімкніть Select B. Тепер Route 1 має 165, Route 0 — 0. Вимкніть його для передавання 42 у Route 0. Вхід осцилографа видно відразу; Запуск малює графік.',
      ],
    },
    questions: {
      en: [
        'Why must splitter b0 connect to merger b0?',
        'What is the inactive demultiplexer output?',
        'How many scalar wires replace one eight-bit bus?',
      ],
      ua: [
        'Чому b0 розгалужувача слід з’єднувати з b0 об’єднувача?',
        'Який стан неактивного виходу демультиплексора?',
        'Скільки окремих дротів замінюють восьмибітну шину?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A routing table for both selector states and one screenshot showing split/merged bit order.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця маршрутів для обох станів селектора й знімок порядку розділених бітів.',
      ],
    },
  },
};
