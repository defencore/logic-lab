export default {
  id: 'stepper-basics',
  label: 'Stepper motor: STEP and DIR',
  ua: 'Кроковий двигун: STEP та DIR',
  category: 'motion',
  level: 'beginner',
  description:
    'Drive a lead-screw axis with pulses, reverse direction, and measure motion per step.',
  descriptionUa:
    'Керуйте віссю з ходовим гвинтом імпульсами, змінюйте напрямок і вимірюйте рух за крок.',
  lesson: {
    en: {
      goal: 'Relate STEP edges, DIR and microstepping to travel in millimeters.',
      steps: [
        {
          title: 'Observe positive motion',
          text: 'Keep the simulation running; press Run only if paused. The axis starts at 10 mm. Each rising edge moves 8 / 200 = 0.04 mm; at 20 Hz the speed is 0.8 mm per simulated second. Select the axis to read Position.',
          nodes: ['clock', 'axis', 'sensor'],
        },
        {
          title: 'Reverse and disable',
          text: 'Set Direction=0 to move toward smaller positions. Set Motion enable=0: pulses continue but position holds. Re-enable to resume on a new STEP edge. No step occurs merely because direction or enable changes.',
          nodes: ['direction', 'enable', 'axis'],
        },
        {
          title: 'Compare microsteps',
          text: 'Pause, set Reset=1 and then 0 to return to 10 mm, and set Direction=1. Select the axis and change Microsteps from 1 to 4. Run for one simulated second: travel becomes 0.2 mm. The start-position sensor only lights within 0.08 mm of 10 mm.',
          nodes: ['axis', 'clock', 'reset', 'at-start'],
        },
      ],
      expected:
        'One accepted rising edge moves lead / (steps per revolution × microsteps). DIR=1 is positive, DIR=0 negative; disabled or reset axes do not travel.',
    },
    ua: {
      goal: 'Пов’яжіть фронти STEP, напрямок DIR і мікрокрок із рухом у міліметрах.',
      steps: [
        {
          title: 'Спостерігайте додатний рух',
          text: 'Залиште симуляцію активною; натисніть Запуск лише після паузи. Вісь починає з 10 мм. Кожен фронт рухає її на 8 / 200 = 0.04 мм; при 20 Гц швидкість — 0.8 мм за секунду симуляції. Оберіть вісь для читання Position.',
          nodes: ['clock', 'axis', 'sensor'],
        },
        {
          title: 'Змініть напрямок і зупиніть',
          text: 'Задайте Direction=0 для руху до менших координат. Motion enable=0 утримує позицію, хоча імпульси тривають. Увімкніть знову для руху за новим фронтом STEP. Сама зміна напрямку чи дозволу не робить кроку.',
          nodes: ['direction', 'enable', 'axis'],
        },
        {
          title: 'Порівняйте мікрокроки',
          text: 'На паузі перемкніть Reset в 1 та 0 для повернення до 10 мм і задайте Direction=1. Оберіть вісь та змініть Microsteps з 1 на 4. За секунду симуляції рух становитиме 0.2 мм. Датчик старту світиться лише в межах 0.08 мм від 10 мм.',
          nodes: ['axis', 'clock', 'reset', 'at-start'],
        },
      ],
      expected:
        'Один дозволений фронт рухає на lead / (steps per revolution × microsteps). DIR=1 — додатний напрямок, DIR=0 — від’ємний; вимкнена чи скинута вісь не рухається.',
    },
  },
  lab: {
    duration: 25,
    questions: {
      en: [
        'What travel does one edge produce with 200 steps/revolution and an 8 mm lead?',
        'Why does four-times microstepping reduce speed at the same clock frequency?',
        'Does changing DIR while STEP is high create a step?',
      ],
      ua: [
        'Який рух дає один фронт при 200 кроках на оберт і ході 8 мм?',
        'Чому чотири мікрокроки зменшують швидкість при тій самій частоті?',
        'Чи створює зміна DIR при STEP=1 новий крок?',
      ],
    },
    deliverables: {
      en: [
        'A saved .logic.json experiment.',
        'A position/time table for positive, negative, disabled and four-microstep motion.',
      ],
      ua: [
        'Збережений дослід .logic.json.',
        'Таблиця позиції й часу для додатного, від’ємного, вимкненого та мікрокрокового руху.',
      ],
    },
    objectives: {
      en: [
        'Relate STEP edges, DIR and microstepping to travel in millimeters.',
        'Measure the relationship between control signals and observed axis motion.',
      ],
      ua: [
        'Пов’яжіть фронти STEP, напрямок DIR і мікрокрок із рухом у міліметрах.',
        'Виміряйте зв’язок керувальних сигналів зі спостереженим рухом осі.',
      ],
    },
    tasks: {
      en: [
        'Keep the simulation running; press Run only if paused. The axis starts at 10 mm. Each rising edge moves 8 / 200 = 0.04 mm; at 20 Hz the speed is 0.8 mm per simulated second. Select the axis to read Position.',
        'Set Direction=0 to move toward smaller positions. Set Motion enable=0: pulses continue but position holds. Re-enable to resume on a new STEP edge. No step occurs merely because direction or enable changes.',
        'Pause, set Reset=1 and then 0 to return to 10 mm, and set Direction=1. Select the axis and change Microsteps from 1 to 4. Run for one simulated second: travel becomes 0.2 mm. The start-position sensor only lights within 0.08 mm of 10 mm.',
      ],
      ua: [
        'Залиште симуляцію активною; натисніть Запуск лише після паузи. Вісь починає з 10 мм. Кожен фронт рухає її на 8 / 200 = 0.04 мм; при 20 Гц швидкість — 0.8 мм за секунду симуляції. Оберіть вісь для читання Position.',
        'Задайте Direction=0 для руху до менших координат. Motion enable=0 утримує позицію, хоча імпульси тривають. Увімкніть знову для руху за новим фронтом STEP. Сама зміна напрямку чи дозволу не робить кроку.',
        'На паузі перемкніть Reset в 1 та 0 для повернення до 10 мм і задайте Direction=1. Оберіть вісь та змініть Microsteps з 1 на 4. За секунду симуляції рух становитиме 0.2 мм. Датчик старту світиться лише в межах 0.08 мм від 10 мм.',
      ],
    },
  },
  circuitPath: 'examples/stepper-basics/circuit.json',
  labPath: 'examples/stepper-basics/README.md',
};
