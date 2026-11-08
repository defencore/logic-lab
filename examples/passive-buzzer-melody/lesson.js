const steps = {
  en: [
    {
      title: 'Make one periodic note',
      text: 'The clock starts at 440 Hz with duty 0.5; PLAY=0 gates it off. Run at 1×, press Enable sound, then set PLAY=1 to hear A4. The AND gate passes the binary waveform to the passive buzzer and scope. Unlike an active buzzer, a constant high input is not a sustained note.',
      nodes: ['tone', 'play', 'gate', 'buzzer', 'trace'],
    },
    {
      title: 'Calculate the full period',
      text: 'Use a 10 ms waveform window and inspect rising edge to rising edge. f=1/(T1+T0), with time in seconds. At 440 Hz the full period is 2.272727 ms=2272.727 µs; each half at duty 0.5 is 1.136364 ms=1136.364 µs. Do not take the reciprocal of only one half.',
      nodes: ['tone', 'trace', 'buzzer'],
    },
    {
      title: 'Play and record five pitches',
      text: 'Load Example action sequence under Assignments & submission → Action sequence. Its ten actions play 440, 493.883, 523.251, 587.33 and 659.255 Hz, pause with PLAY=0, then repeat A4, gate it off and stop the clock after a silent tail. These are clock.frequency source changes, not edits to the buzzer. Stop replay before making your own recording; use different notes and predict their periods.',
      nodes: ['tone', 'play', 'buzzer'],
    },
    {
      title: 'Compare silence and speed',
      text: 'With PLAY=1, change clock duty to 0 and then 1: both are DC and produce no sustained tone, although a transition can click. Restore duty 0.5. Compare 1× and 0.5×: the configured simulated frequency remains 440 Hz while the real-time passive sound slows to half pitch. Use 1× for note comparisons.',
      nodes: ['tone', 'play', 'trace', 'buzzer'],
    },
  ],
  ua: [
    {
      title: 'Створіть одну періодичну ноту',
      text: 'Генератор починає з 440 Гц і duty=0.5; PLAY=0 закриває сигнал. Запустіть симуляцію на 1×, натисніть «Увімкнути звук» й задайте PLAY=1, щоб почути ля A4. AND пропускає двійковий сигнал до пасивного зумера й осцилографа. На відміну від активного зумера, стала 1 не є безперервною нотою.',
      nodes: ['tone', 'play', 'gate', 'buzzer', 'trace'],
    },
    {
      title: 'Обчисліть повний період',
      text: 'Оберіть вікно осцилограми 10 мс і виміряйте час між додатними фронтами. f=1/(T1+T0), де час у секундах. При 440 Гц повний період — 2.272727 мс=2272.727 мкс; кожна половина при duty=0.5 — 1.136364 мс=1136.364 мкс. Не обчислюйте обернену величину лише півперіоду.',
      nodes: ['tone', 'trace', 'buzzer'],
    },
    {
      title: 'Програйте та запишіть п’ять нот',
      text: 'Завантажте «Навчальний сценарій прикладу» в «Завдання та здача → Сценарій дій». Десять дій програють 440, 493.883, 523.251, 587.33 та 659.255 Гц, створять паузу через PLAY=0, повторять A4, закриють сигнал і зупинять генератор після тихого завершення. Це зміни джерела clock.frequency, а не редагування зумера. Перед власним записом зупиніть повтор; оберіть інші ноти й передбачте їхні періоди.',
      nodes: ['tone', 'play', 'buzzer'],
    },
    {
      title: 'Порівняйте тишу та швидкість',
      text: 'При PLAY=1 змініть duty генератора на 0, потім на 1: обидва рівні сталі й не дають сталого тону, хоча перехід може клацнути. Поверніть duty=0.5. Порівняйте 1× і 0.5×: модельна частота залишається 440 Гц, але реальний пасивний звук має вдвічі нижчу висоту. Для порівняння нот використовуйте 1×.',
      nodes: ['tone', 'play', 'trace', 'buzzer'],
    },
  ],
};

export default {
  id: 'passive-buzzer-melody',
  label: 'Passive buzzer: record a melody',
  ua: 'Пасивний зумер: запишіть мелодію',
  category: 'mixed',
  level: 'beginner',
  description:
    'Drive a passive buzzer with a 440 Hz binary clock, calculate its period, and replay five recorded pitches with a silent pause.',
  descriptionUa:
    'Керуйте пасивним зумером двійковим тактом 440 Гц, обчисліть період і повторіть п’ять записаних нот із паузою.',
  lesson: {
    en: {
      goal: 'Relate a passive note to its complete binary period and produce a repeatable melody with recorded frequency changes.',
      steps: steps.en,
      expected:
        'At 1×, PLAY passes a 440 Hz A4 note. The preset plays five distinct pitches, pauses, repeats A4 and ends silent; DC inputs stay silent.',
    },
    ua: {
      goal: 'Пов’яжіть пасивну ноту з повним двійковим періодом і створіть відтворювану мелодію записаними змінами частоти.',
      steps: steps.ua,
      expected:
        'При 1× PLAY пропускає ноту ля A4 440 Гц. Сценарій програє п’ять різних нот, паузу, знову A4 і завершується тишею; сталі входи мовчать.',
    },
  },
  circuitPath: 'examples/passive-buzzer-melody/circuit.json',
  labPath: 'examples/passive-buzzer-melody/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Derive audible frequency from a complete binary period with correct time units.',
        'Record clock source changes and a gated pause in a portable melody.',
      ],
      ua: [
        'Виведіть частоту звучання з повного двійкового періоду з правильними одиницями часу.',
        'Запишіть зміни тактового джерела й паузу в переносній мелодії.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Why does 1/(one high interval) give the wrong frequency at duty 0.5?',
        'Why do duty 0, duty 1 and PLAY=0 all remove a sustained passive note?',
        'Which clock settings are recorded, and which buzzer settings belong to the initial circuit?',
      ],
      ua: [
        'Чому 1/(один високий інтервал) дає хибну частоту при duty=0.5?',
        'Чому duty=0, duty=1 і PLAY=0 прибирають сталу пасивну ноту?',
        'Які налаштування генератора записуються, а які налаштування зумера належать початковій схемі?',
      ],
    },
    deliverables: {
      en: [
        'Your own recorded melody and exported circuit, with a deliberate silent pause.',
        'A table of five frequencies and predicted full periods, plus one measured waveform period.',
      ],
      ua: [
        'Власна записана мелодія й експортована схема з навмисною паузою.',
        'Таблиця п’яти частот та передбачених повних періодів і один виміряний період осцилограми.',
      ],
    },
  },
  actionPreset: [
    { at: 0.1, node: 'play', key: 'value', value: 1 },
    { at: 0.6, node: 'tone', key: 'frequency', value: 493.883 },
    { at: 1.1, node: 'tone', key: 'frequency', value: 523.251 },
    { at: 1.6, node: 'tone', key: 'frequency', value: 587.33 },
    { at: 2.1, node: 'tone', key: 'frequency', value: 659.255 },
    { at: 2.6, node: 'play', key: 'value', value: 0 },
    { at: 2.8, node: 'tone', key: 'frequency', value: 440 },
    { at: 3, node: 'play', key: 'value', value: 1 },
    { at: 3.5, node: 'play', key: 'value', value: 0 },
    { at: 3.8, node: 'tone', key: 'frequency', value: 0 },
  ],
  actionProbes: [
    { node: 'play', port: 'out', side: 'outputs' },
    { node: 'tone', port: 'out', side: 'outputs' },
    { node: 'buzzer', port: 'in', side: 'inputs' },
  ],
};
