export default {
  id: 'logic-gates',
  label: 'Seven logic gates',
  ua: 'Сім логічних елементів',
  category: 'basics',
  level: 'beginner',
  description: 'The same two switches feed AND, OR, XOR and their inverted variants.',
  descriptionUa: 'Два спільні перемикачі керують AND, OR, XOR та їхніми інверсіями.',
  lesson: {
    en: {
      goal: 'Compare the seven basic logic functions using identical inputs.',
      steps: [
        {
          title: 'Compare AND, OR and XOR',
          text: 'With A=1 and B=0, AND is 0 while OR and XOR are 1. Set B=1: AND and OR become 1, but XOR becomes 0.',
          nodes: ['a', 'b', 'and', 'or', 'xor'],
        },
        {
          title: 'Look for opposites',
          text: 'NAND always inverts AND, NOR inverts OR, and XNOR inverts XOR. NOT uses only A and always gives its opposite.',
          nodes: ['nand', 'nor', 'xnor', 'not'],
        },
        {
          title: 'Try every input pair',
          text: 'Click A and B to try 00, 01, 10 and 11. Select a gate header to read its explanation and Truth table in the inspector.',
          nodes: ['a', 'b'],
        },
      ],
      expected: 'Every inverted pair has opposite lamps. XOR is high for exactly one high input.',
    },
    ua: {
      goal: 'Порівняйте сім основних логічних функцій на однакових входах.',
      steps: [
        {
          title: 'Порівняйте AND, OR та XOR',
          text: 'При A=1, B=0 елемент AND дає 0, OR і XOR — 1. Увімкніть B: AND та OR дадуть 1, XOR — 0.',
          nodes: ['a', 'b', 'and', 'or', 'xor'],
        },
        {
          title: 'Знайдіть протилежності',
          text: 'NAND інвертує AND, NOR інвертує OR, XNOR інвертує XOR. NOT використовує лише A і дає протилежний біт.',
          nodes: ['nand', 'nor', 'xnor', 'not'],
        },
        {
          title: 'Перевірте всі пари',
          text: 'Клацайте A та B для комбінацій 00, 01, 10 та 11. Оберіть заголовок елемента, щоб прочитати пояснення й таблицю істинності.',
          nodes: ['a', 'b'],
        },
      ],
      expected:
        'Індикатори кожної інверсної пари протилежні. XOR дає одиницю рівно для одного високого входу.',
    },
  },
  circuitPath: 'examples/logic-gates/circuit.json',
  labPath: 'examples/logic-gates/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Compare the seven basic logic functions using identical inputs.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Порівняйте сім основних логічних функцій на однакових входах.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'With A=1 and B=0, AND is 0 while OR and XOR are 1. Set B=1: AND and OR become 1, but XOR becomes 0.',
        'NAND always inverts AND, NOR inverts OR, and XNOR inverts XOR. NOT uses only A and always gives its opposite.',
        'Click A and B to try 00, 01, 10 and 11. Select a gate header to read its explanation and Truth table in the inspector.',
      ],
      ua: [
        'При A=1, B=0 елемент AND дає 0, OR і XOR — 1. Увімкніть B: AND та OR дадуть 1, XOR — 0.',
        'NAND інвертує AND, NOR інвертує OR, XNOR інвертує XOR. NOT використовує лише A і дає протилежний біт.',
        'Клацайте A та B для комбінацій 00, 01, 10 та 11. Оберіть заголовок елемента, щоб прочитати пояснення й таблицю істинності.',
      ],
    },
    questions: {
      en: [
        'Which gates are inverses of one another?',
        'How do OR and XOR differ for inputs 11?',
        'Why does changing B never change NOT?',
      ],
      ua: [
        'Які елементи є інверсіями один одного?',
        'Чим OR і XOR відрізняються для входів 11?',
        'Чому зміна B не впливає на NOT?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A truth table for all seven outputs and a note identifying inverted pairs.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця всіх семи виходів і перелік інверсних пар.',
      ],
    },
  },
};
