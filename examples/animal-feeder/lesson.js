export default {
  id: 'animal-feeder',
  label: 'Animal feeder with feedback',
  ua: 'Годівниця зі зворотним зв’язком',
  category: 'scenes',
  level: 'intermediate',
  description:
    'Use bowl and hopper sensors to maintain food automatically instead of dispensing continuously.',
  descriptionUa:
    'За датчиками миски й бункера автоматично підтримуйте їжу замість безперервного насипання.',
  lesson: {
    en: {
      goal: 'Use bowl and hopper sensors to maintain food automatically instead of dispensing continuously.',
      steps: [
        {
          title: 'Observe a feeding cycle',
          text: 'Open the feeder in 3D. A hungry bowl sets the SR latch and starts dispensing; Full resets it. The remembered request continues between thresholds, while the animal consumes food. Watch the bowl, hopper and portions-eaten count change.',
          nodes: ['feeder', 'memory', 'automatic'],
        },
        {
          title: 'Refill the hopper manually',
          text: 'The empty-hopper guard blocks automatic dispensing without food. Click Refill hopper from 0 to 1 once to fill the hopper to capacity, then return it to 0. Holding it high does not refill repeatedly, and refill does not directly fill the bowl.',
          nodes: ['not-empty', 'automatic', 'refill', 'feeder'],
        },
        {
          title: 'Bypass feedback and recover',
          text: 'Turn Force dispensing on. It bypasses the full/empty guard; continued dispensing can overfill the bowl and latch Alarm. Turn Force dispensing off before pulsing Reset feeder. A refill alone does not clear a recorded alarm.',
          nodes: ['force', 'dispense', 'alarm', 'reset'],
        },
      ],
      expected:
        'Feedback fills a hungry bowl only until Full, then waits for hunger again. Manual hopper refill is edge-triggered; an unsafe manual dispense can latch an alarm.',
    },
    ua: {
      goal: 'За датчиками миски й бункера автоматично підтримуйте їжу замість безперервного насипання.',
      steps: [
        {
          title: 'Спостерігайте цикл годування',
          text: 'Відкрийте годівницю в 3D. Hungry встановлює SR і починає насипання; Full скидає її. Пам’ять підтримує запит між порогами, поки тварина їсть. Спостерігайте миску, бункер і кількість з’їдених порцій.',
          nodes: ['feeder', 'memory', 'automatic'],
        },
        {
          title: 'Наповніть бункер вручну',
          text: 'Захист Empty блокує автоматичне насипання без їжі. Перемкніть Refill hopper з 0 в 1 для наповнення бункера та поверніть 0. Постійна 1 не повторює наповнення; їжа не потрапляє прямо до миски.',
          nodes: ['not-empty', 'automatic', 'refill', 'feeder'],
        },
        {
          title: 'Обійдіть керування й відновіть',
          text: 'Увімкніть Force dispensing. Воно обходить Full/Empty; безперервне насипання може переповнити миску й запам’ятати Alarm. Вимкніть Force dispensing перед імпульсом Reset feeder. Саме наповнення бункера не очищає тривогу.',
          nodes: ['force', 'dispense', 'alarm', 'reset'],
        },
      ],
      expected:
        'Керування наповнює голодну миску до Full і чекає нового Hungry. Бункер наповнюється за фронтом; небезпечне ручне насипання запам’ятовує тривогу.',
    },
  },
  circuitPath: 'examples/animal-feeder/circuit.json',
  labPath: 'examples/animal-feeder/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Use bowl and hopper sensors to maintain food automatically instead of dispensing continuously.',
        'Relate visible 3D behavior to the actual circuit signals and feedback.',
      ],
      ua: [
        'За датчиками миски й бункера автоматично підтримуйте їжу замість безперервного насипання.',
        'Пов’яжіть видиму 3D-поведінку з реальними сигналами й зворотним зв’язком.',
      ],
    },
    tasks: {
      en: [
        'Open the feeder in 3D. A hungry bowl sets the SR latch and starts dispensing; Full resets it. The remembered request continues between thresholds, while the animal consumes food. Watch the bowl, hopper and portions-eaten count change.',
        'The empty-hopper guard blocks automatic dispensing without food. Click Refill hopper from 0 to 1 once to fill the hopper to capacity, then return it to 0. Holding it high does not refill repeatedly, and refill does not directly fill the bowl.',
        'Turn Force dispensing on. It bypasses the full/empty guard; continued dispensing can overfill the bowl and latch Alarm. Turn Force dispensing off before pulsing Reset feeder. A refill alone does not clear a recorded alarm.',
      ],
      ua: [
        'Відкрийте годівницю в 3D. Hungry встановлює SR і починає насипання; Full скидає її. Пам’ять підтримує запит між порогами, поки тварина їсть. Спостерігайте миску, бункер і кількість з’їдених порцій.',
        'Захист Empty блокує автоматичне насипання без їжі. Перемкніть Refill hopper з 0 в 1 для наповнення бункера та поверніть 0. Постійна 1 не повторює наповнення; їжа не потрапляє прямо до миски.',
        'Увімкніть Force dispensing. Воно обходить Full/Empty; безперервне насипання може переповнити миску й запам’ятати Alarm. Вимкніть Force dispensing перед імпульсом Reset feeder. Саме наповнення бункера не очищає тривогу.',
      ],
    },
    questions: {
      en: [
        'Why is a latch useful between Hungry and Full?',
        'Why is Empty about the hopper rather than the bowl?',
        'What changes on a refill edge, and what does it leave unchanged?',
      ],
      ua: [
        'Навіщо пам’ять між Hungry та Full?',
        'Чому Empty стосується бункера, а не миски?',
        'Що змінює фронт Refill і що лишає незмінним?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project with the tested control circuit.',
        'A bowl/hopper level trace for two automatic cycles, a refill observation and an alarm/recovery record.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою керування.',
        'Графік рівнів миски й бункера за два цикли, спостереження Refill та запис тривоги й відновлення.',
      ],
    },
  },
};
