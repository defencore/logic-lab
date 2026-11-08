export default {
  id: 'traffic-light',
  label: 'A traffic light from three bits',
  ua: 'Світлофор із трьох бітів',
  category: 'scenes',
  level: 'beginner',
  description:
    'Control red, amber and green lamps and distinguish a valid state from permission to proceed.',
  descriptionUa:
    'Керуйте червоним, жовтим і зеленим та відрізніть правильний стан від дозволу рухатися.',
  lesson: {
    en: {
      goal: 'Control red, amber and green lamps and distinguish a valid state from permission to proceed.',
      steps: [
        {
          title: 'Open the traffic-light scene',
          text: 'Click 3D and choose the traffic-light scene. Red starts on and the other lamps off. Valid is 1 but Go is 0: a valid stop signal is not permission to drive.',
          nodes: ['red', 'yellow', 'green', 'light'],
        },
        {
          title: 'Try amber, then green',
          text: 'Turn Red off and Amber on: the middle lamp lights but Go stays 0. Turn Amber off and Green on: Go becomes 1. Exactly one lamp must be active.',
          nodes: ['red', 'yellow', 'green', 'go'],
        },
        {
          title: 'Create and fix an invalid state',
          text: 'Leave Green on and also turn Red on. Both lamps visibly light, Valid becomes 0 and Go is withdrawn. All three lamps off is invalid too. Restore a single active lamp.',
          nodes: ['red', 'green', 'valid', 'go'],
        },
      ],
      expected:
        'A valid state has exactly one active lamp. Go is 1 only for a valid green-only state.',
    },
    ua: {
      goal: 'Керуйте червоним, жовтим і зеленим та відрізніть правильний стан від дозволу рухатися.',
      steps: [
        {
          title: 'Відкрийте сцену світлофора',
          text: 'Натисніть 3D та оберіть сцену світлофора. Червоний спочатку увімкнений, інші лампи вимкнені. Valid=1, Go=0: правильний сигнал зупинки не дозволяє рух.',
          nodes: ['red', 'yellow', 'green', 'light'],
        },
        {
          title: 'Спробуйте жовтий і зелений',
          text: 'Вимкніть Red та увімкніть Amber: середня лампа світиться, Go=0. Вимкніть Amber та увімкніть Green: Go=1. Має працювати рівно одна лампа.',
          nodes: ['red', 'yellow', 'green', 'go'],
        },
        {
          title: 'Створіть і виправте неправильний стан',
          text: 'Залиште Green=1 та увімкніть Red. Обидві лампи світяться, Valid=0 і Go зникає. Усі три вимкнені теж недопустимі. Поверніть одну активну лампу.',
          nodes: ['red', 'green', 'valid', 'go'],
        },
      ],
      expected: 'Правильний стан має рівно одну активну лампу. Go=1 лише для одного зеленого.',
    },
  },
  circuitPath: 'examples/traffic-light/circuit.json',
  labPath: 'examples/traffic-light/README.md',
  lab: {
    duration: 15,
    objectives: {
      en: [
        'Control red, amber and green lamps and distinguish a valid state from permission to proceed.',
        'Relate visible 3D behavior to the actual circuit signals and feedback.',
      ],
      ua: [
        'Керуйте червоним, жовтим і зеленим та відрізніть правильний стан від дозволу рухатися.',
        'Пов’яжіть видиму 3D-поведінку з реальними сигналами й зворотним зв’язком.',
      ],
    },
    tasks: {
      en: [
        'Click 3D and choose the traffic-light scene. Red starts on and the other lamps off. Valid is 1 but Go is 0: a valid stop signal is not permission to drive.',
        'Turn Red off and Amber on: the middle lamp lights but Go stays 0. Turn Amber off and Green on: Go becomes 1. Exactly one lamp must be active.',
        'Leave Green on and also turn Red on. Both lamps visibly light, Valid becomes 0 and Go is withdrawn. All three lamps off is invalid too. Restore a single active lamp.',
      ],
      ua: [
        'Натисніть 3D та оберіть сцену світлофора. Червоний спочатку увімкнений, інші лампи вимкнені. Valid=1, Go=0: правильний сигнал зупинки не дозволяє рух.',
        'Вимкніть Red та увімкніть Amber: середня лампа світиться, Go=0. Вимкніть Amber та увімкніть Green: Go=1. Має працювати рівно одна лампа.',
        'Залиште Green=1 та увімкніть Red. Обидві лампи світяться, Valid=0 і Go зникає. Усі три вимкнені теж недопустимі. Поверніть одну активну лампу.',
      ],
    },
    questions: {
      en: [
        'Why can Valid=1 while Go=0?',
        'What does this simplified model do with red and amber together?',
      ],
      ua: [
        'Чому Valid=1 можливе при Go=0?',
        'Що спрощена модель робить з одночасним червоним і жовтим?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project with the tested control circuit.',
        'A table of all eight lamp combinations with Valid and Go.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою керування.',
        'Таблиця восьми комбінацій ламп із Valid та Go.',
      ],
    },
  },
};
