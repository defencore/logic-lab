export default {
  id: 'traffic-junction',
  label: 'Four-phase traffic junction',
  ua: 'Чотирифазне перехрестя',
  category: 'scenes',
  level: 'intermediate',
  description:
    'Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.',
  descriptionUa:
    'Декодуйте лічильник у безконфліктні фази й спостерігайте наслідок обходу керування.',
  lesson: {
    en: {
      goal: 'Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.',
      steps: [
        {
          title: 'Watch a complete traffic cycle',
          text: 'Open the junction in 3D and keep both app Run and Scene run active. The two low counter bits select NS green, NS amber, EW green and EW amber. The 0.1 Hz clock advances phases every 10 seconds after the first 5-second half-cycle.',
          nodes: ['clock', 'phase', 'bits', 'junction'],
        },
        {
          title: 'Explain the clearance interval',
          text: 'During each amber phase neither axis has green. A red or amber car stops with its complete nose before the zebra and stop line; following cars retain a body-length gap. Vehicles already beyond the line clear before the other axis receives green. Observe both queues and actual passed cars.',
          nodes: ['ns-green', 'ns-yellow', 'ew-green', 'ew-yellow'],
        },
        {
          title: 'Bypass the safe sequence',
          text: 'For a repeatable collision, pause the app, turn Unsafe east/west override off, and click Reset simulation in the 3D panel to restart the clock at time zero. Turn the override on before resuming. Both directions now receive green during the initial phase; actual vehicle bodies collide and Crash latches. Changing lamps afterward does not undo the collision.',
          nodes: ['reset', 'unsafe', 'override', 'crash'],
        },
        {
          title: 'Recover and pause',
          text: 'Turn the unsafe override off before pulsing Reset junction again. Scene run=0 freezes traffic and holds the phase counter, while the source clock can continue. Return Scene run=1 to resume the controlled cycle.',
          nodes: ['unsafe', 'reset', 'run'],
        },
      ],
      expected:
        'Safe phases keep stopped vehicle noses before the zebra, preserve queue spacing and serve both directions. The unsafe override can cause contact between actual vehicle bodies and latch Crash; signals alone are not a collision.',
    },
    ua: {
      goal: 'Декодуйте лічильник у безконфліктні фази й спостерігайте наслідок обходу керування.',
      steps: [
        {
          title: 'Спостерігайте повний цикл',
          text: 'Відкрийте перехрестя в 3D та залиште активними Запуск і Scene run. Два молодші біти обирають NS green, NS amber, EW green, EW amber. Такт 0.1 Гц перемикає фази кожні 10 с після першого півперіоду 5 с.',
          nodes: ['clock', 'phase', 'bits', 'junction'],
        },
        {
          title: 'Поясніть інтервал очищення',
          text: 'Під час жовтої фази жоден напрямок не має зеленого. Передня частина машини зупиняється до зебри й стоп-лінії; наступні машини лишають проміжок між кузовами. Ті, що вже за лінією, виїжджають до зеленого іншому напрямку. Спостерігайте черги та справжні проїзди.',
          nodes: ['ns-green', 'ns-yellow', 'ew-green', 'ew-yellow'],
        },
        {
          title: 'Обійдіть правильну послідовність',
          text: 'Для повторюваної аварії поставте застосунок на паузу, вимкніть Unsafe east/west override та натисніть Скинути симуляцію у 3D-панелі для часу нуль. Увімкніть override до продовження. У початковій фазі обидва напрямки матимуть зелений; реальні кузови зіткнуться й Crash запам’ятається. Зміна ламп не скасує аварію.',
          nodes: ['reset', 'unsafe', 'override', 'crash'],
        },
        {
          title: 'Відновіть і зупиніть',
          text: 'Вимкніть небезпечний override перед новим імпульсом Reset junction. Scene run=0 зупиняє транспорт і фазовий лічильник, хоча джерело такту може працювати. Scene run=1 відновлює цикл.',
          nodes: ['unsafe', 'reset', 'run'],
        },
      ],
      expected:
        'Правильні фази утримують передні частини машин до зебри, зберігають чергу й пропускають обидва напрямки. Небезпечний обхід може звести реальні кузови й запам’ятати Crash; самі сигнали не є зіткненням.',
    },
  },
  circuitPath: 'examples/traffic-junction/circuit.json',
  labPath: 'examples/traffic-junction/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Decode a counter into nonconflicting green/amber phases, then observe the consequence of bypassing the controller.',
        'Relate visible 3D behavior to the actual circuit signals and feedback.',
      ],
      ua: [
        'Декодуйте лічильник у безконфліктні фази й спостерігайте наслідок обходу керування.',
        'Пов’яжіть видиму 3D-поведінку з реальними сигналами й зворотним зв’язком.',
      ],
    },
    tasks: {
      en: [
        'Open the junction in 3D and keep both app Run and Scene run active. The two low counter bits select NS green, NS amber, EW green and EW amber. The 0.1 Hz clock advances phases every 10 seconds after the first 5-second half-cycle.',
        'During each amber phase neither axis has green. A red or amber car stops with its complete nose before the zebra and stop line; following cars retain a body-length gap. Vehicles already beyond the line clear before the other axis receives green. Observe both queues and actual passed cars.',
        'For a repeatable collision, pause the app, turn Unsafe east/west override off, and click Reset simulation in the 3D panel to restart the clock at time zero. Turn the override on before resuming. Both directions now receive green during the initial phase; actual vehicle bodies collide and Crash latches. Changing lamps afterward does not undo the collision.',
        'Turn the unsafe override off before pulsing Reset junction again. Scene run=0 freezes traffic and holds the phase counter, while the source clock can continue. Return Scene run=1 to resume the controlled cycle.',
      ],
      ua: [
        'Відкрийте перехрестя в 3D та залиште активними Запуск і Scene run. Два молодші біти обирають NS green, NS amber, EW green, EW amber. Такт 0.1 Гц перемикає фази кожні 10 с після першого півперіоду 5 с.',
        'Під час жовтої фази жоден напрямок не має зеленого. Передня частина машини зупиняється до зебри й стоп-лінії; наступні машини лишають проміжок між кузовами. Ті, що вже за лінією, виїжджають до зеленого іншому напрямку. Спостерігайте черги та справжні проїзди.',
        'Для повторюваної аварії поставте застосунок на паузу, вимкніть Unsafe east/west override та натисніть Скинути симуляцію у 3D-панелі для часу нуль. Увімкніть override до продовження. У початковій фазі обидва напрямки матимуть зелений; реальні кузови зіткнуться й Crash запам’ятається. Зміна ламп не скасує аварію.',
        'Вимкніть небезпечний override перед новим імпульсом Reset junction. Scene run=0 зупиняє транспорт і фазовий лічильник, хоча джерело такту може працювати. Scene run=1 відновлює цикл.',
      ],
    },
    questions: {
      en: [
        'Why are mutually exclusive greens alone insufficient without clearance time?',
        'Which counter bits determine the four phases?',
        'Why must the unsafe override be removed before reset?',
        'Where is the front of a stopped car relative to the zebra, and what clearance remains between queued bodies?',
      ],
      ua: [
        'Чому взаємного виключення зелених недостатньо без часу очищення?',
        'Які біти лічильника визначають чотири фази?',
        'Чому override слід вимкнути перед скиданням?',
        'Де передня частина зупиненої машини відносно зебри та який проміжок лишається між кузовами?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project with the tested control circuit.',
        'A four-phase signal table, queue/passed observations and a collision/recovery screenshot pair.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою керування.',
        'Таблиця чотирьох фаз, спостереження черг і проїзду та знімки аварії й відновлення.',
      ],
    },
  },
};
