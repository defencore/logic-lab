export default {
  id: 'printer-xyz',
  label: 'Three-axis printer',
  ua: 'Тривісний принтер',
  category: 'motion',
  level: 'intermediate',
  description:
    'Animate X, Y and Z together with independent controls, different screw leads and six endstops.',
  descriptionUa:
    'Анімуйте X, Y та Z разом із незалежним керуванням, різними ходами гвинтів і шістьма кінцевиками.',
  lesson: {
    en: {
      goal: 'Observe three simultaneous printer axes and separate pulse timing from per-axis mechanics and controls.',
      steps: [
        {
          title: 'Open the three-axis printer',
          text: 'Click 3D in the app header to open the mechanical view. Keep the simulation running; press Run only if paused. All three motors share a 40 Hz STEP clock, but each has its own direction and enable switch in the 3D panel. The first three motors are displayed as X, Y and Z.',
          nodes: ['x-axis', 'y-axis', 'z-axis', 'clock'],
        },
        {
          title: 'Compare travel from the same pulses',
          text: 'Use Reset simulation in the 3D panel to restore X=5, Y=10 and Z=3 mm. At 40 Hz, X and Y each travel 1.6 mm per simulated second because their lead is 8 mm/revolution. Z travels 0.4 mm/s because its lead is 2 mm/revolution. Compare live readouts and the rotating shafts.',
          nodes: ['clock', 'x-axis', 'y-axis', 'z-axis'],
        },
        {
          title: 'Reverse Y and hold X independently',
          text: 'Set Y direction=0 in the 3D panel: Y reverses while X and Z continue positively. Set X enable=0: only X holds position while Y and Z keep moving. Re-enable X when ready. The shared clock never changes merely because one axis is disabled.',
          nodes: ['y-direction', 'x-enable', 'x-axis', 'y-axis', 'z-axis'],
        },
        {
          title: 'Inspect endstops and camera views',
          text: 'Restore all direction and enable switches to 1. Try Perspective, Front and Top camera buttons; drag to orbit, scroll to zoom and right-drag to pan. Increase the shared clock to 200 Hz to reach the 20 mm endpoints sooner. Each maximum endstop and lamp activates at 20 mm; hard limits clamp travel. Set a direction to 0 to reverse away and release its endstop. The minimum sensors activate at 0 mm.',
          nodes: ['x-min', 'x-max', 'y-min', 'y-max', 'z-min', 'z-max'],
        },
      ],
      expected:
        'All axes animate together. At 40 Hz, X/Y move 1.6 mm/s and Z 0.4 mm/s; direction and enable act independently, and six endstops report the 0/20 mm boundaries.',
    },
    ua: {
      goal: 'Спостерігайте три осі принтера одночасно та відрізняйте спільні імпульси від механіки й керування окремих осей.',
      steps: [
        {
          title: 'Відкрийте тривісний принтер',
          text: 'Натисніть 3D у заголовку застосунку для механічного вигляду. Залиште симуляцію активною; натисніть Запуск лише після паузи. Три двигуни мають спільний STEP 40 Гц, але окремі перемикачі напрямку й дозволу у 3D-панелі. Перші три двигуни показуються як X, Y та Z.',
          nodes: ['x-axis', 'y-axis', 'z-axis', 'clock'],
        },
        {
          title: 'Порівняйте рух від однакових імпульсів',
          text: 'Скинути симуляцію у 3D-панелі повертає X=5, Y=10 та Z=3 мм. При 40 Гц X та Y рухаються по 1.6 мм за секунду симуляції завдяки ходу 8 мм/оберт. Z рухається на 0.4 мм/с завдяки ходу 2 мм/оберт. Порівняйте поточні координати й обертання валів.',
          nodes: ['clock', 'x-axis', 'y-axis', 'z-axis'],
        },
        {
          title: 'Незалежно змініть Y і зупиніть X',
          text: 'Задайте Y direction=0 у 3D-панелі: Y змінить напрямок, а X і Z продовжать додатний рух. X enable=0 утримує лише X, поки Y та Z рухаються. Потім увімкніть X знову. Вимкнення окремої осі не змінює спільний такт.',
          nodes: ['y-direction', 'x-enable', 'x-axis', 'y-axis', 'z-axis'],
        },
        {
          title: 'Перевірте кінцевики й камери',
          text: 'Поверніть усі напрямки й дозволи в 1. Спробуйте Перспектива, Спереду та Зверху; перетягуйте для обертання, прокручуйте для масштабу, правою кнопкою панорамуйте. Збільште спільний такт до 200 Гц, щоб швидше дістатися 20 мм. Верхні кінцевики й індикатори вмикаються при 20 мм; межі обмежують рух. Напрямок 0 відводить вісь від упору та звільняє кінцевик. Нижні датчики вмикаються при 0 мм.',
          nodes: ['x-min', 'x-max', 'y-min', 'y-max', 'z-min', 'z-max'],
        },
      ],
      expected:
        'Усі осі анімуються разом. При 40 Гц X/Y рухаються на 1.6 мм/с, Z — на 0.4 мм/с; напрямок і дозвіл незалежні, шість кінцевиків показують межі 0/20 мм.',
    },
  },
  circuitPath: 'examples/printer-xyz/circuit.json',
  labPath: 'examples/printer-xyz/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Observe three simultaneous printer axes and separate pulse timing from per-axis mechanics and controls.',
        'Measure shared-clock travel ratios and verify independent direction, enable and limit behavior.',
      ],
      ua: [
        'Спостерігайте три осі принтера одночасно та відрізняйте спільні імпульси від механіки й керування окремих осей.',
        'Виміряйте співвідношення руху від спільного такту й перевірте незалежні напрямки, дозволи та межі.',
      ],
    },
    tasks: {
      en: [
        'Click 3D in the app header to open the mechanical view. Keep the simulation running; press Run only if paused. All three motors share a 40 Hz STEP clock, but each has its own direction and enable switch in the 3D panel. The first three motors are displayed as X, Y and Z.',
        'Use Reset simulation in the 3D panel to restore X=5, Y=10 and Z=3 mm. At 40 Hz, X and Y each travel 1.6 mm per simulated second because their lead is 8 mm/revolution. Z travels 0.4 mm/s because its lead is 2 mm/revolution. Compare live readouts and the rotating shafts.',
        'Set Y direction=0 in the 3D panel: Y reverses while X and Z continue positively. Set X enable=0: only X holds position while Y and Z keep moving. Re-enable X when ready. The shared clock never changes merely because one axis is disabled.',
        'Restore all direction and enable switches to 1. Try Perspective, Front and Top camera buttons; drag to orbit, scroll to zoom and right-drag to pan. Increase the shared clock to 200 Hz to reach the 20 mm endpoints sooner. Each maximum endstop and lamp activates at 20 mm; hard limits clamp travel. Set a direction to 0 to reverse away and release its endstop. The minimum sensors activate at 0 mm.',
      ],
      ua: [
        'Натисніть 3D у заголовку застосунку для механічного вигляду. Залиште симуляцію активною; натисніть Запуск лише після паузи. Три двигуни мають спільний STEP 40 Гц, але окремі перемикачі напрямку й дозволу у 3D-панелі. Перші три двигуни показуються як X, Y та Z.',
        'Скинути симуляцію у 3D-панелі повертає X=5, Y=10 та Z=3 мм. При 40 Гц X та Y рухаються по 1.6 мм за секунду симуляції завдяки ходу 8 мм/оберт. Z рухається на 0.4 мм/с завдяки ходу 2 мм/оберт. Порівняйте поточні координати й обертання валів.',
        'Задайте Y direction=0 у 3D-панелі: Y змінить напрямок, а X і Z продовжать додатний рух. X enable=0 утримує лише X, поки Y та Z рухаються. Потім увімкніть X знову. Вимкнення окремої осі не змінює спільний такт.',
        'Поверніть усі напрямки й дозволи в 1. Спробуйте Перспектива, Спереду та Зверху; перетягуйте для обертання, прокручуйте для масштабу, правою кнопкою панорамуйте. Збільште спільний такт до 200 Гц, щоб швидше дістатися 20 мм. Верхні кінцевики й індикатори вмикаються при 20 мм; межі обмежують рух. Напрямок 0 відводить вісь від упору та звільняє кінцевик. Нижні датчики вмикаються при 0 мм.',
      ],
    },
    questions: {
      en: [
        'Why do X and Y travel four times farther than Z for the same number of STEP pulses?',
        'What happens to the other axes when X enable is off?',
        'Does reaching a hard limit stop the shared clock?',
        'How does a maximum endstop change when its axis reverses away?',
      ],
      ua: [
        'Чому X та Y рухаються вчетверо далі за Z при однаковій кількості STEP?',
        'Що відбувається з іншими осями при X enable=0?',
        'Чи зупиняє досягнення механічної межі спільний такт?',
        'Як змінюється верхній кінцевик при зворотному русі від упору?',
      ],
    },
    deliverables: {
      en: [
        'An exported printer-xyz .logic.json experiment.',
        'A one-second displacement table for X, Y and Z at 40 Hz.',
        'Screenshots from two camera views plus observations of independent reversal, disabling and endstop activation.',
      ],
      ua: [
        'Експортований дослід printer-xyz .logic.json.',
        'Таблиця переміщення X, Y та Z за секунду при 40 Гц.',
        'Знімки двох ракурсів і спостереження незалежної зміни напрямку, вимкнення й кінцевиків.',
      ],
    },
  },
};
