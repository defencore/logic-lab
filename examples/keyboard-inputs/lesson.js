const steps = {
  en: [
    {
      title: 'Read the resting states',
      text: 'Open this circuit and focus the workspace. A uses hold, S uses inverted hold, and D uses toggle. Their physical bindings are KeyA, KeyS and KeyD, independent of the current typing language. Initially only the S lamp is on: the outputs are 0,1,0.',
      nodes: ['hold', 'inverted', 'toggle'],
    },
    {
      title: 'Compare hold and inverted hold',
      text: 'Hold A: its lamp turns on; release A: it turns off. Hold S: its lamp turns off; release S: it turns on. Press A and S together to compare both responses. Each source has one Q bit, and the three lamps operate independently.',
      nodes: ['hold', 'hold-lamp', 'inverted', 'inverted-lamp'],
    },
    {
      title: 'Separate a press from autorepeat',
      text: 'Press D once: its lamp turns on. Keep holding D: keyboard autorepeat does not flip it again. Release D: the lamp remains on. Press and release D again: it turns off. Losing focus releases held A/S inputs while preserving the latched D state.',
      nodes: ['toggle', 'toggle-lamp'],
    },
    {
      title: 'Record and replay the same experiment',
      text: 'Open Assignments & submission → Action sequence and start a fresh recording. Compare A, S and three separate D presses, then finish recording and replay. The log stores raw value changes; inverted Q is their complement, and toggle logs only latch changes. Alternatively load Example action sequence for a portable seven-action demonstration. Its final outputs are 0,1,1. Live keys are blocked during replay; Restart repeats the recording, and Stop restores your circuit.',
      nodes: ['hold', 'inverted', 'toggle', 'hold-lamp', 'inverted-lamp', 'toggle-lamp'],
    },
    {
      title: 'Resolve a binding conflict',
      text: 'Finish replay before editing. Select A and inspect its binding. Try assigning KeyS, already used by S: the application rejects the duplicate and keeps the old binding. Capture Shift+KeyK instead, test the new chord in the workspace, then restore KeyA. Inputs are ignored while typing in fields; Ctrl, Alt and Meta chords remain reserved for browser or system commands.',
      nodes: ['hold', 'inverted'],
    },
  ],
  ua: [
    {
      title: 'Прочитайте стани спокою',
      text: 'Відкрийте схему й поверніть фокус на робочий простір. A працює в режимі hold, S — inverted, D — toggle. Фізичні прив’язки KeyA, KeyS і KeyD не залежать від поточної мови введення. Спочатку світиться лише S: виходи дорівнюють 0,1,0.',
      nodes: ['hold', 'inverted', 'toggle'],
    },
    {
      title: 'Порівняйте утримання та інверсію',
      text: 'Утримуйте A: лампа світиться; відпустіть A: гасне. Утримуйте S: лампа гасне; відпустіть S: світиться. Натисніть A та S разом і порівняйте реакції. Кожне джерело має один біт Q, а три лампи працюють незалежно.',
      nodes: ['hold', 'hold-lamp', 'inverted', 'inverted-lamp'],
    },
    {
      title: 'Відрізніть натискання від автоповтору',
      text: 'Натисніть D один раз: лампа засвітиться. Утримуйте D: автоповтор не перемикає її знову. Відпустіть D: лампа залишається увімкненою. Ще раз натисніть і відпустіть D: лампа згасне. Втрата фокуса відпускає A/S, але зберігає зафіксований стан D.',
      nodes: ['toggle', 'toggle-lamp'],
    },
    {
      title: 'Запишіть і повторіть той самий дослід',
      text: 'Відкрийте «Завдання та здача → Сценарій дій» і почніть новий запис. Порівняйте A, S і три окремі натискання D, завершіть запис та відтворіть. Журнал зберігає сирі зміни value: inverted видає протилежний Q, а toggle записує лише зміни зафіксованого стану. Або завантажте «Навчальний сценарій прикладу»: це переносний дослід із семи дій, кінцеві виходи — 0,1,1. Під час повтору живі клавіші заблоковані; повторний запуск починає запис спочатку, а «Зупинити» повертає вашу схему.',
      nodes: ['hold', 'inverted', 'toggle', 'hold-lamp', 'inverted-lamp', 'toggle-lamp'],
    },
    {
      title: 'Усуньте конфлікт прив’язок',
      text: 'Перед редагуванням завершіть перегляд. Виберіть A й перевірте binding. Спробуйте призначити KeyS, уже зайнятий S: застосунок відхилить дублювання й залишить попередню прив’язку. Натомість запишіть Shift+KeyK, перевірте комбінацію на робочому просторі й поверніть KeyA. Під час набору тексту входи не реагують; комбінації з Ctrl, Alt і Meta залишаються для команд браузера та системи.',
      nodes: ['hold', 'inverted'],
    },
  ],
};

export default {
  id: 'keyboard-inputs',
  label: 'Keyboard inputs: hold, invert and toggle',
  ua: 'Клавіатурні входи: утримання, інверсія та перемикання',
  category: 'basics',
  level: 'beginner',
  description:
    'Operate three independent LED inputs with A, S and D; compare modes, resolve binding conflicts, then record and replay the changes.',
  descriptionUa:
    'Керуйте трьома незалежними світлодіодами через A, S і D: порівняйте режими, усуньте конфлікти прив’язок та запишіть і повторіть зміни.',
  lesson: {
    en: {
      goal: 'Distinguish momentary keyboard inputs from a latched toggle and reproduce their behavior with a portable recorded sequence.',
      steps: steps.en,
      expected:
        'Resting outputs are 0,1,0. A follows its press; S is inverted; D toggles once per new press. The supplied preset ends at 0,1,1.',
    },
    ua: {
      goal: 'Відрізніть клавіатурні входи з утриманням від зафіксованого перемикача та повторіть їх поведінку переносним записом дій.',
      steps: steps.ua,
      expected:
        'Стани спокою — 0,1,0. A повторює натискання; S інвертований; D перемикається один раз на нове натискання. Готовий сценарій завершується станом 0,1,1.',
    },
  },
  circuitPath: 'examples/keyboard-inputs/circuit.json',
  labPath: 'examples/keyboard-inputs/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Compare hold, inverted hold and toggle with independent one-bit outputs.',
        'Record a repeatable experiment and resolve keyboard binding conflicts.',
      ],
      ua: [
        'Порівняйте hold, inverted і toggle на незалежних однобітних виходах.',
        'Запишіть відтворюваний дослід і усуньте конфлікти клавіатурних прив’язок.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Why is S lit before any key is pressed?',
        'Why does holding D not create repeated toggles?',
        'Why does the inverted source store raw value 1 while its lamp is off?',
        'How can the same recorded sequence replay without a physical keyboard?',
      ],
      ua: [
        'Чому S світиться ще до першого натискання?',
        'Чому утримання D не створює повторних перемикань?',
        'Чому inverted зберігає сирий value 1, коли його лампа вимкнена?',
        'Як записана послідовність відтворюється без фізичної клавіатури?',
      ],
    },
    deliverables: {
      en: [
        'Your exported circuit and recorded input sequence, with replayed results.',
        'An observation table for press, hold and release in all three modes, plus an explanation of a rejected duplicate binding.',
      ],
      ua: [
        'Експортована схема й записана послідовність входів із результатами повтору.',
        'Таблиця натискання, утримання та відпускання в трьох режимах і пояснення відхиленої повторної прив’язки.',
      ],
    },
  },
  actionPreset: [
    { at: 0.1, node: 'hold', key: 'value', value: 1 },
    { at: 0.3, node: 'hold', key: 'value', value: 0 },
    { at: 0.5, node: 'inverted', key: 'value', value: 1 },
    { at: 0.7, node: 'inverted', key: 'value', value: 0 },
    { at: 0.9, node: 'toggle', key: 'value', value: 1 },
    { at: 1.1, node: 'toggle', key: 'value', value: 0 },
    { at: 1.3, node: 'toggle', key: 'value', value: 1 },
  ],
  actionProbes: [
    { node: 'hold', port: 'out', side: 'outputs' },
    { node: 'inverted', port: 'out', side: 'outputs' },
    { node: 'toggle', port: 'out', side: 'outputs' },
  ],
};
