export default {
  id: 'schmitt',
  label: 'Schmitt hysteresis',
  ua: 'Гістерезис тригера Шмітта',
  category: 'physical',
  level: 'intermediate',
  description: 'Move a voltage above and below two thresholds and watch the stored decision.',
  descriptionUa: 'Змінюйте напругу навколо двох порогів і спостерігайте збережене рішення.',
  lesson: {
    en: {
      goal: 'Learn why two thresholds stop an output chattering near one voltage.',
      steps: [
        {
          title: 'Start below the low threshold',
          text: 'Voltage byte starts at 0, giving 0 V. The Schmitt output is 0. Select the DAC to read its voltage while changing the byte.',
          nodes: ['level', 'dac', 'schmitt'],
        },
        {
          title: 'Cross the high threshold',
          text: 'Set Voltage byte Value=200: the DAC produces about 3.92 V, above 3.5 V, so the output turns on. Then set Value=128 (about 2.51 V); the output stays on.',
          nodes: ['level', 'schmitt', 'clean'],
        },
        {
          title: 'Cross the low threshold',
          text: 'Set Value=50 (about 0.98 V): output turns off below 1.5 V. Set Value=128 again: the same 2.51 V now holds an off output. Do not reset between these changes.',
          nodes: ['level', 'schmitt', 'clean'],
        },
      ],
      expected:
        'Between 1.5 V and 3.5 V the output remembers its previous state; outside that band it switches deterministically.',
    },
    ua: {
      goal: 'Дізнайтеся, як два пороги запобігають перемиканню біля однієї напруги.',
      steps: [
        {
          title: 'Почніть нижче нижнього порогу',
          text: 'Voltage byte=0 дає 0 В. Вихід Шмітта — 0. Оберіть ЦАП, щоб читати напругу під час зміни байта.',
          nodes: ['level', 'dac', 'schmitt'],
        },
        {
          title: 'Перетніть верхній поріг',
          text: 'Задайте Voltage byte=200: ЦАП дасть близько 3.92 В, вище 3.5 В, і вихід увімкнеться. Потім задайте 128 (близько 2.51 В): вихід залишиться увімкненим.',
          nodes: ['level', 'schmitt', 'clean'],
        },
        {
          title: 'Перетніть нижній поріг',
          text: 'Задайте 50 (близько 0.98 В): нижче 1.5 В вихід вимкнеться. Поверніть 128: ті самі 2.51 В тепер збережуть вимкнений вихід. Не скидайте симуляцію між змінами.',
          nodes: ['level', 'schmitt', 'clean'],
        },
      ],
      expected:
        'Між 1.5 В і 3.5 В вихід пам’ятає попередній стан; за межами цього діапазону перемикається однозначно.',
    },
  },
  circuitPath: 'examples/schmitt/circuit.json',
  labPath: 'examples/schmitt/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Learn why two thresholds stop an output chattering near one voltage.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Дізнайтеся, як два пороги запобігають перемиканню біля однієї напруги.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Voltage byte starts at 0, giving 0 V. The Schmitt output is 0. Select the DAC to read its voltage while changing the byte.',
        'Set Voltage byte Value=200: the DAC produces about 3.92 V, above 3.5 V, so the output turns on. Then set Value=128 (about 2.51 V); the output stays on.',
        'Set Value=50 (about 0.98 V): output turns off below 1.5 V. Set Value=128 again: the same 2.51 V now holds an off output. Do not reset between these changes.',
      ],
      ua: [
        'Voltage byte=0 дає 0 В. Вихід Шмітта — 0. Оберіть ЦАП, щоб читати напругу під час зміни байта.',
        'Задайте Voltage byte=200: ЦАП дасть близько 3.92 В, вище 3.5 В, і вихід увімкнеться. Потім задайте 128 (близько 2.51 В): вихід залишиться увімкненим.',
        'Задайте 50 (близько 0.98 В): нижче 1.5 В вихід вимкнеться. Поверніть 128: ті самі 2.51 В тепер збережуть вимкнений вихід. Не скидайте симуляцію між змінами.',
      ],
    },
    questions: {
      en: [
        'How can the same 2.51 V input produce either output state?',
        'Which byte values cross the 1.5 V and 3.5 V thresholds?',
        'Why would a single threshold respond differently to noise?',
      ],
      ua: [
        'Як ті самі 2.51 В можуть давати різні стани виходу?',
        'Які коди перетинають пороги 1.5 В і 3.5 В?',
        'Чому один поріг інакше реагував би на шум?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A sequential voltage/output log for byte values 0 → 200 → 128 → 50 → 128.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Послідовний журнал напруги й виходу для кодів 0 → 200 → 128 → 50 → 128.',
      ],
    },
  },
};
