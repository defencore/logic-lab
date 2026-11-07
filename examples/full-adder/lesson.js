export default {
  id: 'full-adder',
  label: 'Full adder',
  ua: 'Повний суматор',
  category: 'basics',
  level: 'beginner',
  description: 'Add A, B and an incoming carry; read a two-bit answer.',
  descriptionUa: 'Додайте A, B і вхідний перенос; прочитайте двобітну відповідь.',
  lesson: {
    en: {
      goal: 'Learn why multi-bit addition needs a carry input.',
      steps: [
        {
          title: 'Add two ones',
          text: 'A and B start high and Carry in is low. The total is 2: Sum=0 and Carry out=1.',
          nodes: ['a', 'b', 'cin', 'adder'],
        },
        {
          title: 'Add the incoming carry',
          text: 'Turn Carry in on. The total becomes 3, so both result lamps turn on: binary 11.',
          nodes: ['cin', 'sum', 'carry'],
        },
        {
          title: 'Test an empty column',
          text: 'Set A=B=0 and leave Carry in=1. Only Sum should stay high. Try the remaining combinations and compare the adder Truth table.',
          nodes: ['a', 'b', 'cin'],
        },
      ],
      expected: 'A + B + Carry in = Sum + 2 × Carry out for all eight combinations.',
    },
    ua: {
      goal: 'Дізнайтеся, навіщо багатобітному додаванню потрібен вхід переносу.',
      steps: [
        {
          title: 'Додайте дві одиниці',
          text: 'A та B увімкнені, Carry in вимкнений. Сума дорівнює 2: Sum=0, Carry out=1.',
          nodes: ['a', 'b', 'cin', 'adder'],
        },
        {
          title: 'Додайте вхідний перенос',
          text: 'Увімкніть Carry in. Сума стане 3, обидва індикатори засвітяться: двійкове 11.',
          nodes: ['cin', 'sum', 'carry'],
        },
        {
          title: 'Перевірте порожній розряд',
          text: 'Установіть A=B=0, залишивши Carry in=1. Світиться лише Sum. Спробуйте інші комбінації й порівняйте таблицю істинності суматора.',
          nodes: ['a', 'b', 'cin'],
        },
      ],
      expected: 'A + B + Carry in = Sum + 2 × Carry out для всіх восьми комбінацій.',
    },
  },
  circuitPath: 'examples/full-adder/circuit.json',
  labPath: 'examples/full-adder/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Learn why multi-bit addition needs a carry input.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Дізнайтеся, навіщо багатобітному додаванню потрібен вхід переносу.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'A and B start high and Carry in is low. The total is 2: Sum=0 and Carry out=1.',
        'Turn Carry in on. The total becomes 3, so both result lamps turn on: binary 11.',
        'Set A=B=0 and leave Carry in=1. Only Sum should stay high. Try the remaining combinations and compare the adder Truth table.',
      ],
      ua: [
        'A та B увімкнені, Carry in вимкнений. Сума дорівнює 2: Sum=0, Carry out=1.',
        'Увімкніть Carry in. Сума стане 3, обидва індикатори засвітяться: двійкове 11.',
        'Установіть A=B=0, залишивши Carry in=1. Світиться лише Sum. Спробуйте інші комбінації й порівняйте таблицю істинності суматора.',
      ],
    },
    questions: {
      en: [
        'How is Carry in different from Carry out?',
        'How can two output bits represent the sum of three input bits?',
      ],
      ua: [
        'Чим Carry in відрізняється від Carry out?',
        'Як два вихідні біти представляють суму трьох вхідних бітів?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'An eight-row input/output table and the arithmetic identity checked for every row.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця з восьми рядків і перевірка арифметичної рівності для кожного рядка.',
      ],
    },
  },
};
