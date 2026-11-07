export default {
  id: 'wired-and',
  label: 'Open-drain wired AND',
  ua: 'Монтажне І з відкритим стоком',
  category: 'physical',
  level: 'intermediate',
  description: 'Share a line safely using released outputs and a weak pull-up.',
  descriptionUa: 'Об’єднайте виходи через відкритий стік і слабку підтяжку.',
  lesson: {
    en: {
      goal: 'See how a released output differs from actively driving a high level.',
      steps: [
        {
          title: 'Release both drivers',
          text: 'Release A and Release B start at 1. Both open drains output Z, so the weak pull-up alone makes Shared line high.',
          nodes: ['a', 'b', 'drain-a', 'drain-b', 'pull'],
        },
        {
          title: 'Pull the shared line low',
          text: 'Set Release A=0. Its driver actively pulls the line low and overrides the pull-up. Release B cannot force it high. Try both switch combinations.',
          nodes: ['a', 'drain-a', 'line'],
        },
        {
          title: 'Remove the pull-up',
          text: 'Return A=B=1. Select Weak pull-up and uncheck Enabled. Shared line becomes Z, not 1. Re-enable the resistor to restore a high line.',
          nodes: ['a', 'b', 'pull', 'line'],
        },
      ],
      expected:
        'The shared line is high only when every open drain releases it and a pull-up exists: wired AND behavior.',
    },
    ua: {
      goal: 'Побачте відмінність між відпущеним виходом і активною одиницею.',
      steps: [
        {
          title: 'Відпустіть обидва виходи',
          text: 'Release A та Release B спочатку мають 1. Обидва відкриті стоки дають Z, тому слабка підтяжка піднімає Shared line.',
          nodes: ['a', 'b', 'drain-a', 'drain-b', 'pull'],
        },
        {
          title: 'Стягніть спільну лінію до нуля',
          text: 'Задайте Release A=0. Вихід активно стягує лінію до нуля й переважає підтяжку. Release B не може підняти її. Перевірте обидва перемикачі.',
          nodes: ['a', 'drain-a', 'line'],
        },
        {
          title: 'Приберіть підтяжку',
          text: 'Поверніть A=B=1. Оберіть Weak pull-up і вимкніть Увімкнено. Shared line стане Z, а не 1. Увімкніть резистор для відновлення одиниці.',
          nodes: ['a', 'b', 'pull', 'line'],
        },
      ],
      expected:
        'Спільна лінія висока лише тоді, коли всі відкриті стоки відпущені й є підтяжка: монтажне І.',
    },
  },
  circuitPath: 'examples/wired-and/circuit.json',
  labPath: 'examples/wired-and/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'See how a released output differs from actively driving a high level.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Побачте відмінність між відпущеним виходом і активною одиницею.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Release A and Release B start at 1. Both open drains output Z, so the weak pull-up alone makes Shared line high.',
        'Set Release A=0. Its driver actively pulls the line low and overrides the pull-up. Release B cannot force it high. Try both switch combinations.',
        'Return A=B=1. Select Weak pull-up and uncheck Enabled. Shared line becomes Z, not 1. Re-enable the resistor to restore a high line.',
      ],
      ua: [
        'Release A та Release B спочатку мають 1. Обидва відкриті стоки дають Z, тому слабка підтяжка піднімає Shared line.',
        'Задайте Release A=0. Вихід активно стягує лінію до нуля й переважає підтяжку. Release B не може підняти її. Перевірте обидва перемикачі.',
        'Поверніть A=B=1. Оберіть Weak pull-up і вимкніть Увімкнено. Shared line стане Z, а не 1. Увімкніть резистор для відновлення одиниці.',
      ],
    },
    questions: {
      en: [
        'How does a released Z output differ from an actively driven 1?',
        'Why does a low driver override a pull-up?',
        'Why does removing the pull-up make the released line float?',
      ],
      ua: [
        'Чим відпущений вихід Z відрізняється від активної 1?',
        'Чому сильний нуль переважає підтяжку?',
        'Чому без підтяжки відпущена лінія плаває?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A four-row wired-AND table plus one observation with both drains released and the pull-up disabled.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця монтажного І з чотирма рядками та спостереження без підтяжки при відпущених стоках.',
      ],
    },
  },
};
