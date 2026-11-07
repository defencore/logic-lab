export default {
  id: 'half-adder',
  label: 'Half adder',
  ua: 'Напівсуматор',
  category: 'basics',
  level: 'beginner',
  description: 'Build addition from XOR and AND, then test all four input combinations.',
  descriptionUa: 'Складіть додавання з XOR та AND і перевірте чотири комбінації входів.',
  lesson: {
    en: {
      goal: 'Discover how two bits produce a sum bit and a carry bit.',
      steps: [
        {
          title: 'Start with 1 + 0',
          text: 'A starts at 1 and B at 0. The Sum lamp is on; Carry is off. Click either switch to change its bit.',
          nodes: ['a', 'b'],
        },
        {
          title: 'Try 1 + 1',
          text: 'Set both A and B to 1. Sum turns off and Carry turns on: binary 10 means decimal 2.',
          nodes: ['a', 'b', 'carry', 'carry-led'],
        },
        {
          title: 'Complete the truth table',
          text: 'Try 00, 01, 10 and 11. Select XOR or AND and compare its Truth table with the lamps. Run is unnecessary for these gates.',
          nodes: ['sum', 'sum-led', 'carry'],
        },
      ],
      expected: 'Sum = A XOR B; Carry = A AND B. The pair Carry, Sum is the two-bit answer.',
    },
    ua: {
      goal: 'Дослідіть, як два біти утворюють суму й перенос.',
      steps: [
        {
          title: 'Почніть з 1 + 0',
          text: 'A має 1, B має 0. Sum світиться, Carry — ні. Клацніть перемикач, щоб змінити його біт.',
          nodes: ['a', 'b'],
        },
        {
          title: 'Спробуйте 1 + 1',
          text: 'Установіть A та B в 1. Sum гасне, Carry світиться: двійкове 10 — це десяткове 2.',
          nodes: ['a', 'b', 'carry', 'carry-led'],
        },
        {
          title: 'Перевірте таблицю істинності',
          text: 'Спробуйте 00, 01, 10 та 11. Оберіть XOR або AND і порівняйте таблицю істинності з індикаторами. Запуск для цих елементів не потрібний.',
          nodes: ['sum', 'sum-led', 'carry'],
        },
      ],
      expected: 'Sum = A XOR B; Carry = A AND B. Пара Carry, Sum — двобітний результат.',
    },
  },
  circuitPath: 'examples/half-adder/circuit.json',
  labPath: 'examples/half-adder/README.md',
  lab: {
    duration: 15,
    objectives: {
      en: [
        'Discover how two bits produce a sum bit and a carry bit.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Дослідіть, як два біти утворюють суму й перенос.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'A starts at 1 and B at 0. The Sum lamp is on; Carry is off. Click either switch to change its bit.',
        'Set both A and B to 1. Sum turns off and Carry turns on: binary 10 means decimal 2.',
        'Try 00, 01, 10 and 11. Select XOR or AND and compare its Truth table with the lamps. Run is unnecessary for these gates.',
      ],
      ua: [
        'A має 1, B має 0. Sum світиться, Carry — ні. Клацніть перемикач, щоб змінити його біт.',
        'Установіть A та B в 1. Sum гасне, Carry світиться: двійкове 10 — це десяткове 2.',
        'Спробуйте 00, 01, 10 та 11. Оберіть XOR або AND і порівняйте таблицю істинності з індикаторами. Запуск для цих елементів не потрібний.',
      ],
    },
    questions: {
      en: [
        'Why does 1 + 1 require a carry bit?',
        'Which input pairs light Sum, and which light Carry?',
      ],
      ua: ['Чому 1 + 1 потребує біта переносу?', 'За яких входів світяться Sum і Carry?'],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A four-row truth table with A, B, Sum and Carry.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця з чотирма рядками: A, B, Sum та Carry.',
      ],
    },
  },
};
