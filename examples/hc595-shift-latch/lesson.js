const id = 'hc595-shift-latch';
const steps = {
  en: [
    {
      title: 'Fill the shift register',
      text: 'Reset the simulation. Keep MR̅=1, OE̅=0 and both clocks at 0. Enter SER bits 1,0,1,0,0,1,0,1 in that order. Give each bit one SRCLK 0→1→0 pulse. The chip shows shift byte 10100101; the bus monitor still reads 0.',
      nodes: ['ser', 'srclk', 'chip', 'monitor'],
    },
    {
      title: 'Latch the byte',
      text: 'Pulse RCLK 0→1→0 with SRCLK low. QA–QH now drive the bus monitor with 0xA5, decimal 165. QH′ is high because bit 7 of the shift register is 1.',
      nodes: ['rclk', 'chip', 'monitor', 'serial'],
    },
    {
      title: 'Release, clear and read again',
      text: 'Set OE̅=1. The bus monitor shows Z, and QH′ stays high. Set MR̅=0 to clear the shift byte and QH′. Return OE̅ to 0: the monitor still shows 165. Return MR̅ to 1 and pulse RCLK again to copy zero to storage.',
      nodes: ['mr', 'oe', 'rclk', 'chip', 'monitor', 'serial'],
    },
    {
      title: 'Replay and compare',
      text: 'Load the example action sequence in Assignments & submission → Action sequence. Step through the end of the eight shifts, the first RCLK, the output release and the clear. Compare the parallel byte with QH′ at each action.',
      nodes: ['chip', 'monitor', 'serial'],
    },
  ],
  ua: [
    {
      title: 'Заповніть регістр зсуву',
      text: 'Скиньте симуляцію. Залиште MR̅=1, OE̅=0 та обидва такти у 0. Подайте SER у порядку 1,0,1,0,0,1,0,1. Для кожного біта зробіть один імпульс SRCLK 0→1→0. Мікросхема покаже байт зсуву 10100101, а індикатор шини ще показуватиме 0.',
      nodes: ['ser', 'srclk', 'chip', 'monitor'],
    },
    {
      title: 'Зафіксуйте байт',
      text: 'Подайте імпульс RCLK 0→1→0, тримаючи SRCLK у 0. Через QA–QH індикатор шини тепер показує 0xA5, тобто 165. QH′ дорівнює 1, бо біт 7 регістра зсуву дорівнює 1.',
      nodes: ['rclk', 'chip', 'monitor', 'serial'],
    },
    {
      title: 'Відпустіть виходи, очистьте й прочитайте знову',
      text: 'Задайте OE̅=1. Індикатор шини покаже Z, а QH′ залишиться високим. Задайте MR̅=0, щоб очистити байт зсуву та QH′. Поверніть OE̅ у 0: індикатор усе ще показує 165. Поверніть MR̅ у 1 і знову подайте RCLK, щоб скопіювати нуль у регістр зберігання.',
      nodes: ['mr', 'oe', 'rclk', 'chip', 'monitor', 'serial'],
    },
    {
      title: 'Відтворіть і порівняйте',
      text: 'Завантажте навчальний сценарій прикладу в «Завдання та здача → Сценарій дій». Покроково перегляньте кінець восьми зсувів, перший RCLK, відпускання виходів та очищення. Порівнюйте паралельний байт із QH′ після кожної дії.',
      nodes: ['chip', 'monitor', 'serial'],
    },
  ],
};

const set = (ms, node, value) => ({ at: ms / 1000, node, key: 'value', value });
const actionPreset = [
  ...[1, 0, 1, 0, 0, 1, 0, 1].flatMap((bit, index) => {
    const at = 100 + index * 240;
    return [set(at, 'ser', bit), set(at + 80, 'srclk', 1), set(at + 160, 'srclk', 0)];
  }),
  set(2200, 'rclk', 1),
  set(2300, 'rclk', 0),
  set(2500, 'oe', 1),
  set(2700, 'mr', 0),
  set(2900, 'oe', 0),
  set(3000, 'mr', 1),
  set(3200, 'rclk', 1),
  set(3300, 'rclk', 0),
];

export default {
  id,
  label: '74HC595: shift and latch',
  ua: '74HC595: зсув і фіксація',
  category: 'sequential',
  level: 'beginner',
  description:
    'Shift in a byte while the parallel outputs hold their previous value, then latch it.',
  descriptionUa:
    'Введіть байт, поки паралельні виходи тримають попереднє значення, і зафіксуйте його.',
  lesson: {
    en: {
      goal: 'Trace how SRCLK, RCLK, MR̅ and OE̅ affect the two registers and their outputs.',
      steps: steps.en,
      expected:
        'The monitor reads 0 → 165 → Z → 165 → 0. QH′ stays high through output release and goes low on shift clear.',
    },
    ua: {
      goal: 'Простежте, як SRCLK, RCLK, MR̅ та OE̅ впливають на два регістри та їхні виходи.',
      steps: steps.ua,
      expected:
        'Індикатор показує 0 → 165 → Z → 165 → 0. QH′ лишається високим після відпускання виходів і переходить у 0 при очищенні регістра зсуву.',
    },
  },
  circuitPath: `examples/${id}/circuit.json`,
  labPath: `examples/${id}/README.md`,
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Observe serial loading and parallel latching as separate events.',
        'Predict what happens to each register and its outputs when OE̅ or MR̅ changes.',
      ],
      ua: [
        'Побачте послідовне завантаження й фіксацію паралельних виходів як окремі події.',
        'Спрогнозуйте стан обох регістрів і виходів при зміні OE̅ або MR̅.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Which clock changes QA–QH?',
        'Why does MR̅ clear QH′ without clearing the stored output byte?',
      ],
      ua: [
        'Який такт змінює QA–QH?',
        'Чому MR̅ очищує QH′, а зафіксований вихідний байт лишається?',
      ],
    },
    deliverables: {
      en: [
        'Submit a recorded replay of your own bit pattern.',
        'Provide a table of the shift byte, stored byte, bus value and QH′ after each stage.',
      ],
      ua: [
        'Здайте запис із власним шаблоном бітів.',
        'Додайте таблицю байта зсуву, байта зберігання, стану шини та QH′ після кожного етапу.',
      ],
    },
  },
  actionPreset,
  actionProbes: [
    { node: 'monitor', port: 'in', side: 'inputs' },
    { node: 'chip', port: 'serial', side: 'outputs' },
  ],
};
