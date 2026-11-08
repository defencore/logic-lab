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
          title: 'Try red plus amber, then green',
          text: 'Keep Red on and add Amber: both lamps light, Valid remains 1 and Go stays 0. This is the stop phase before green. Then turn Red and Amber off and Green on: Go becomes 1. Test amber alone as another valid stop state.',
          nodes: ['red', 'yellow', 'green', 'go'],
        },
        {
          title: 'Create and fix an invalid state',
          text: 'Leave Green on and also turn Red on. Both lamps visibly light, Valid becomes 0 and Go is withdrawn. All three lamps off is invalid too. Restore a valid stop phase or green alone.',
          nodes: ['red', 'green', 'valid', 'go'],
        },
      ],
      expected:
        'Red, amber, red plus amber and green alone are valid states. Red plus amber remains a stop command. Go is 1 only for green alone; darkness and conflicting green lamps are invalid.',
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
          title: 'Спробуйте червоний із жовтим, потім зелений',
          text: 'Лишіть Red та додайте Amber: обидві лампи світяться, Valid=1, Go=0. Це фаза зупинки перед зеленим. Вимкніть Red і Amber та ввімкніть Green: Go=1. Перевірте окремий жовтий як ще один правильний сигнал зупинки.',
          nodes: ['red', 'yellow', 'green', 'go'],
        },
        {
          title: 'Створіть і виправте неправильний стан',
          text: 'Залиште Green=1 та увімкніть Red. Обидві лампи світяться, Valid=0 і Go зникає. Усі три вимкнені теж недопустимі. Поверніть правильну фазу зупинки або окремий зелений.',
          nodes: ['red', 'green', 'valid', 'go'],
        },
      ],
      expected:
        'Червоний, жовтий, червоний із жовтим та окремий зелений — правильні стани. Червоний із жовтим лишається зупинкою. Go=1 лише для окремого зеленого; темрява та зелений з іншими лампами некоректні.',
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
        'Keep Red on and add Amber: both lamps light, Valid remains 1 and Go stays 0. This is the stop phase before green. Then turn Red and Amber off and Green on: Go becomes 1. Test amber alone as another valid stop state.',
        'Leave Green on and also turn Red on. Both lamps visibly light, Valid becomes 0 and Go is withdrawn. All three lamps off is invalid too. Restore a valid stop phase or green alone.',
      ],
      ua: [
        'Натисніть 3D та оберіть сцену світлофора. Червоний спочатку увімкнений, інші лампи вимкнені. Valid=1, Go=0: правильний сигнал зупинки не дозволяє рух.',
        'Лишіть Red та додайте Amber: обидві лампи світяться, Valid=1, Go=0. Це фаза зупинки перед зеленим. Вимкніть Red і Amber та ввімкніть Green: Go=1. Перевірте окремий жовтий як ще один правильний сигнал зупинки.',
        'Залиште Green=1 та увімкніть Red. Обидві лампи світяться, Valid=0 і Go зникає. Усі три вимкнені теж недопустимі. Поверніть правильну фазу зупинки або окремий зелений.',
      ],
    },
    questions: {
      en: [
        'Why can Valid=1 while Go=0?',
        'Why is red plus amber valid while it still forbids movement?',
      ],
      ua: [
        'Чому Valid=1 можливе при Go=0?',
        'Чому червоний із жовтим є коректним станом, але не дозволяє рух?',
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
