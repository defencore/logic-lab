const steps = {
  en: [
    {
      title: 'Follow the source and memory',
      text: 'The clock supplies 880 Hz at duty 0.5. T=1 allows the T flip-flop to invert Q on every rising CLK edge; RST=0 permits normal operation. Initial Q=0. The passive buzzer receives Q, while separate scopes expose both the original clock and the divided signal.',
      nodes: ['tone', 'toggle', 'reset', 'divider', 'source-trace', 'divided-trace', 'buzzer'],
    },
    {
      title: 'Explain the octave divider',
      text: 'Run at 1× and press Enable sound. Two source rising edges make one complete Q cycle, so Q is 880/2=440 Hz. Compare the two scopes in a 10 ms waveform window: source T=1.136364 ms=1136.364 µs, Q T=2.272727 ms=2272.727 µs. The buzzer sounds A4, one octave below the source frequency.',
      nodes: ['tone', 'divider', 'source-trace', 'divided-trace', 'buzzer'],
    },
    {
      title: 'Hold a bit without making a tone',
      text: 'Set T=0 while the clock runs. Q retains either 0 or 1, but the passive buzzer stops its sustained note because the held bit has no full periods. Set RST=1: Q becomes 0 asynchronously. Return RST=0 and T=1 to restore the 440 Hz divided tone.',
      nodes: ['toggle', 'reset', 'divider', 'buzzer'],
    },
    {
      title: 'Replay and vary the division',
      text: 'Load Example action sequence in Assignments & submission → Action sequence to reproduce hold, reset, restart, then a source change to 660 Hz and back to 880 Hz. Predict Q as 330 Hz and 440 Hz. Record another source frequency at or below the 1000 Hz clock limit. This is clocked division; ideal gate feedback has no propagation delay and cannot replace the clock.',
      nodes: ['tone', 'toggle', 'reset', 'divider', 'buzzer'],
    },
  ],
  ua: [
    {
      title: 'Простежте джерело й пам’ять',
      text: 'Генератор видає 880 Гц при duty=0.5. T=1 дозволяє T-тригеру інвертувати Q за кожним додатним фронтом CLK; RST=0 дозволяє звичайну роботу. Початковий Q=0. Пасивний зумер отримує Q, а окремі осцилографи показують початковий такт і поділений сигнал.',
      nodes: ['tone', 'toggle', 'reset', 'divider', 'source-trace', 'divided-trace', 'buzzer'],
    },
    {
      title: 'Поясніть поділ на октаву',
      text: 'Запустіть на 1× й натисніть «Увімкнути звук». Два додатні фронти джерела створюють один повний цикл Q, тому Q має 880/2=440 Гц. Порівняйте осцилографи у вікні 10 мс: T джерела=1.136364 мс=1136.364 мкс, T виходу Q=2.272727 мс=2272.727 мкс. Зумер звучить нотою ля A4, на октаву нижче частоти джерела.',
      nodes: ['tone', 'divider', 'source-trace', 'divided-trace', 'buzzer'],
    },
    {
      title: 'Утримуйте біт без утворення тону',
      text: 'Задайте T=0, не зупиняючи такт. Q збереже 0 або 1, але пасивний зумер припинить сталий тон, бо утримуваний біт не має повних періодів. Задайте RST=1: Q асинхронно стане 0. Поверніть RST=0 та T=1, щоб відновити поділений тон 440 Гц.',
      nodes: ['toggle', 'reset', 'divider', 'buzzer'],
    },
    {
      title: 'Повторіть і змініть поділ',
      text: 'Завантажте «Навчальний сценарій прикладу» в «Завдання та здача → Сценарій дій», щоб повторити утримання, скидання, запуск, а потім зміну джерела на 660 Гц і назад на 880 Гц. Передбачте Q як 330 Гц і 440 Гц. Запишіть іншу частоту джерела в межах 1000 Гц. Це тактований поділ; ідеальний зворотний зв’язок вентилів не має затримки поширення й не замінює генератор.',
      nodes: ['tone', 'toggle', 'reset', 'divider', 'buzzer'],
    },
  ],
};

export default {
  id: 'buzzer-clock-divider',
  label: 'Buzzer: build a clock divider',
  ua: 'Зумер: побудуйте подільник частоти',
  category: 'sequential',
  level: 'intermediate',
  description:
    'Turn an 880 Hz clock into a 440 Hz passive note with a T flip-flop; compare complete periods, memory hold and reset.',
  descriptionUa:
    'Перетворіть такт 880 Гц на пасивну ноту 440 Гц T-тригером: порівняйте повні періоди, утримання пам’яті та скидання.',
  lesson: {
    en: {
      goal: 'Construct a note with clocked memory and prove the divide-by-two frequency from both edge counts and full periods.',
      steps: steps.en,
      expected:
        'T=1 and RST=0 yield Q=440 Hz from an 880 Hz source. Holding Q at either bit stops the passive tone; reset clears Q.',
    },
    ua: {
      goal: 'Створіть ноту тактованою пам’яттю й доведіть поділ частоти на два кількістю фронтів та повними періодами.',
      steps: steps.ua,
      expected:
        'При T=1 і RST=0 вихід Q має 440 Гц від джерела 880 Гц. Утримання будь-якого біта Q припиняє пасивний тон; скидання очищає Q.',
    },
  },
  circuitPath: 'examples/buzzer-clock-divider/circuit.json',
  labPath: 'examples/buzzer-clock-divider/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Build a divide-by-two stage and derive its note from real binary edges.',
        'Distinguish a stored high bit from a periodic waveform and test reset independently.',
      ],
      ua: [
        'Побудуйте подільник на два й виведіть його ноту з фактичних двійкових фронтів.',
        'Відрізніть збережену 1 від періодичного сигналу й окремо перевірте скидання.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Why are two rising CLK edges required for one full Q cycle?',
        'Why is a held Q=1 silent on a passive buzzer but audible on an active buzzer?',
        'What source frequency produces a 330 Hz divided output?',
      ],
      ua: [
        'Чому для одного повного циклу Q потрібні два додатні фронти CLK?',
        'Чому утримуваний Q=1 мовчить на пасивному зумері, але звучить на активному?',
        'Яка частота джерела створює поділений вихід 330 Гц?',
      ],
    },
    deliverables: {
      en: [
        'Your circuit and recorded hold/reset/frequency experiment with observations.',
        'A comparison of source and Q periods in seconds, milliseconds and microseconds, plus the derived frequencies.',
      ],
      ua: [
        'Власна схема й запис досліду утримання, скидання та частоти зі спостереженнями.',
        'Порівняння періодів джерела й Q у секундах, мілісекундах і мікросекундах та виведені частоти.',
      ],
    },
  },
  actionPreset: [
    { at: 0.4, node: 'toggle', key: 'value', value: 0 },
    { at: 0.7, node: 'reset', key: 'value', value: 1 },
    { at: 0.8, node: 'reset', key: 'value', value: 0 },
    { at: 0.9, node: 'toggle', key: 'value', value: 1 },
    { at: 1.3, node: 'tone', key: 'frequency', value: 660 },
    { at: 1.7, node: 'tone', key: 'frequency', value: 880 },
    { at: 2.1, node: 'toggle', key: 'value', value: 0 },
  ],
  actionProbes: [
    { node: 'tone', port: 'out', side: 'outputs' },
    { node: 'divider', port: 'q', side: 'outputs' },
    { node: 'buzzer', port: 'in', side: 'inputs' },
  ],
};
