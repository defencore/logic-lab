const steps = {
  en: [
    {
      title: 'Decode actual control pulses',
      text: 'Run for at least 50 ms. Course PWM uses 50 Hz and duty 0.0625: 1250 µs gives S1/S3 −45°. Height PWM uses duty 0.0875: 1750 µs gives S2/S4 +45°. Both servos and scopes receive the same digital PWM output.',
      nodes: ['course', 'height', 'servos'],
    },
    {
      title: 'Center and reach the endpoints',
      text: 'At 50 Hz, set Course Duty to 0.075 for a 1500 µs center pulse, 0.05 for 1000 µs (−90°), or 0.1 for 2000 µs (+90°). Wait for a complete pulse after each change.',
      nodes: ['course', 'servos'],
    },
    {
      title: 'Separate pulse width from duty',
      text: 'Keep a 1500 µs pulse: compare 50 Hz/duty 0.075 with 100 Hz/duty 0.15. Both center the servo. At fixed duty, changing frequency changes pulse width and therefore the angle. Use a short waveform window.',
      nodes: ['course', 'course-scope', 'height-scope', 'servos'],
    },
    {
      title: 'Detect a missing command',
      text: 'Set Course Duty to 0 or disconnect its servo wire. A disconnected signal shows X immediately; a stopped pulse train becomes X after Signal timeout (0.1 s). Restore 50 Hz/duty 0.075 and wait for a fresh complete pulse.',
      nodes: ['course', 'servos'],
    },
  ],
  ua: [
    {
      title: 'Декодуйте справжні імпульси керування',
      text: 'Запустіть щонайменше на 50 мс. Course PWM: 50 Гц і duty 0.0625 дають 1250 мкс та −45° на S1/S3. Height PWM: duty 0.0875 дає 1750 мкс та +45° на S2/S4. Серво й осцилографи отримують той самий цифровий вихід PWM.',
      nodes: ['course', 'height', 'servos'],
    },
    {
      title: 'Знайдіть центр і крайні положення',
      text: 'При 50 Гц задайте Course Duty=0.075 для центрального імпульсу 1500 мкс, 0.05 для 1000 мкс (−90°) або 0.1 для 2000 мкс (+90°). Після кожної зміни дочекайтеся повного імпульсу.',
      nodes: ['course', 'servos'],
    },
    {
      title: 'Відрізніть ширину від заповнення',
      text: 'Збережіть імпульс 1500 мкс: порівняйте 50 Гц/duty 0.075 і 100 Гц/duty 0.15. Обидва центрують серво. При сталому duty зміна частоти змінює ширину й кут. Оберіть коротке часове вікно осцилограми.',
      nodes: ['course', 'course-scope', 'height-scope', 'servos'],
    },
    {
      title: 'Виявіть втрату команди',
      text: 'Задайте Course Duty=0 або від’єднайте дріт серво. Від’єднання одразу дає X; зупинені імпульси дають X після Signal timeout (0.1 с). Поверніть 50 Гц/duty 0.075 і дочекайтеся нового повного імпульсу.',
      nodes: ['course', 'servos'],
    },
  ],
};
const goal = {
  en: 'Control four RC servos by pulse width and distinguish pulse duration, duty ratio and repetition frequency.',
  ua: 'Керуйте чотирма RC-серво шириною імпульсу та відрізніть тривалість імпульсу, заповнення й частоту повторення.',
};
export default {
  id: 'pwm-servos',
  label: 'RC servo pulse control',
  ua: 'RC-серво: керування імпульсами',
  category: 'mixed',
  level: 'intermediate',
  description:
    'Decode 1000–2000 µs digital pulses, compare 50/100 Hz commands, and detect missing control signals.',
  descriptionUa:
    'Декодуйте цифрові імпульси 1000–2000 мкс, порівняйте команди 50/100 Гц і виявіть втрату керування.',
  lesson: Object.fromEntries(
    ['en', 'ua'].map((language) => [
      language,
      {
        goal: goal[language],
        steps: steps[language],
        expected:
          language === 'ua'
            ? '1000/1500/2000 мкс відповідають −90°/0°/+90°. Стала ширина дає сталий кут; відсутній або некоректний сигнал дає X.'
            : '1000/1500/2000 µs map to −90°/0°/+90°. Equal pulse widths give equal angles; missing or invalid signals give X.',
      },
    ]),
  ),
  circuitPath: 'examples/pwm-servos/circuit.json',
  labPath: 'examples/pwm-servos/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [goal.en, 'Recognize a valid decoded position and an unknown command.'],
      ua: [goal.ua, 'Розпізнавайте достовірне декодоване положення та невідому команду.'],
    },
    tasks: Object.fromEntries(
      ['en', 'ua'].map((language) => [language, steps[language].map((step) => step.text)]),
    ),
    questions: {
      en: [
        'Why does an RC servo require the digital PWM output rather than the analog DUTY value?',
        'What duty makes a 1500 µs pulse at 50 Hz and at 100 Hz?',
        'Why is X different from a valid centered position?',
      ],
      ua: [
        'Чому RC-серво потребує цифрового виходу PWM, а не аналогового значення DUTY?',
        'Яке заповнення дає імпульс 1500 мкс при 50 і 100 Гц?',
        'Чим X відрізняється від достовірного нульового кута?',
      ],
    },
    deliverables: {
      en: [
        'An exported circuit and a pulse-width/angle table for 1000, 1250, 1500, 1750 and 2000 µs.',
        'Two traces showing equal 1500 µs high duration at 50/100 Hz and an explanation of signal loss.',
      ],
      ua: [
        'Експортована схема й таблиця ширини та кута для 1000, 1250, 1500, 1750 і 2000 мкс.',
        'Дві осцилограми з однаковою тривалістю 1500 мкс при 50/100 Гц та пояснення втрати сигналу.',
      ],
    },
  },
};
