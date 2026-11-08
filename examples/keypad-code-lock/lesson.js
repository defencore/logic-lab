const steps = {
  en: [
    {
      title: 'Scan the row/column matrix',
      text: 'A 200 Hz counter and visible gates activate one keypad row at a time. A detected column stops scanning until release. The default Pulse mode queues each ordinary click as a 0.04 s simulated press, with a released gap between keys. Run the simulation to process the queue; while paused, inputs wait without advancing time. Hold mode instead needs at least 0.02 simulated seconds per key. KEY MAP is an external ROM translating row/column addresses into digits 0–9, star=10 and hash=11. The keypad contains no digit encoder.',
      nodes: ['keypad', 'scan-clock', 'scan', 'row0', 'row1', 'row2', 'row3', 'present', 'key-map'],
    },
    {
      title: 'Read the secret in memory',
      text: 'SECRET stores one digit per address:0→2,1→5,2→8,3→0. Progress selects the next address. Inspect the live memory map, then find Data in Properties. Change only SECRET addresses 0…3 to choose another four-digit code; KEY MAP describes the keyboard layout and remains unchanged. Set the secret before starting a recording.',
      nodes: ['secret', 'progress', 'matches'],
    },
    {
      title: 'Enter and confirm 2580',
      text: 'Click 2,5,8,0 separately while the simulation runs; Pulse mode preserves their order. Progress becomes 1,2,3,4 and Ready lights, but UNLOCK stays 0 until #. Match and Seen flip-flops capture a decision before advancing the ROM address. Holding a key counts once. Enter # to confirm: UNLOCK becomes 1. The last-key register preserves the most recently detected code for inspection.',
      nodes: [
        'keypad',
        'accepted',
        'seen',
        'progress',
        'ready',
        'unlocked',
        'open-led',
        'last-key',
      ],
    },
    {
      title: 'Reject and clear wrong attempts',
      text: 'Press * to clear, then enter 2 followed by9: Progress resets to 0 and Error lights. Early #, a fifth digit or multiple active columns also fail. * clears progress, unlock, error and the last-key register; RESET also restarts row scanning. Try SECRET=1,3,7,9 and confirm 1379; 2580 should now fail. Restore 2580 for the supplied preset. This scanner requires release before another key; it is not a full multi-key rollover decoder.',
      nodes: [
        'star',
        'wrong-digit',
        'wrong-hash',
        'multi',
        'attempt-reset',
        'alarm',
        'reset',
        'secret',
      ],
    },
    {
      title: 'Record and replay the experiment',
      text: 'Load Example action sequence under Assignments & submission → Action sequence. Ten keypad.keys mask changes press/release 2,5,8,0,#, ending with Progress=4, UNLOCK=1 and Error=0. Mask bits follow rows 1,2,3 /4,5,6 /7,8,9 /*,0,#. Record your own correct and wrong attempts with releases, predict each SECRET address and explain the captured comparisons. Stop restores the editable circuit.',
      nodes: ['keypad', 'secret', 'progress', 'unlocked', 'alarm', 'last-key'],
    },
  ],
  ua: [
    {
      title: 'Скануйте матрицю рядків і стовпців',
      text: 'Лічильник 200 Гц і видимі вентилі вмикають один рядок клавіатури за раз. Виявлений стовпець зупиняє сканування до відпускання. Типовий режим Pulse ставить звичайні кліки в чергу імпульсів по 0.04 модельної секунди з відпусканням між клавішами. Запустіть симуляцію для обробки; на паузі черга чекає без прихованого просування часу. У режимі Hold потрібне утримання щонайменше 0.02 модельної секунди. Зовнішня ПЗП KEY MAP перетворює адресу на цифри 0–9, зірочку=10 та решітку=11. Прихованого кодувальника в клавіатурі немає.',
      nodes: ['keypad', 'scan-clock', 'scan', 'row0', 'row1', 'row2', 'row3', 'present', 'key-map'],
    },
    {
      title: 'Прочитайте секрет із пам’яті',
      text: 'SECRET зберігає одну цифру за адресою:0→2,1→5,2→8,3→0. Progress обирає наступну адресу. Перегляньте живу карту пам’яті й знайдіть Data у властивостях. Для іншого чотиризначного коду змінюйте лише адреси SECRET 0…3; KEY MAP описує розкладку клавіш і не змінюється. Задавайте секрет до початку запису.',
      nodes: ['secret', 'progress', 'matches'],
    },
    {
      title: 'Введіть і підтвердьте 2580',
      text: 'При працюючій симуляції по черзі клацніть 2,5,8,0; Pulse зберігає їхній порядок. Progress стає 1,2,3,4 і вмикає Ready, але UNLOCK лишається 0 до #. Тригери Match і Seen фіксують рішення до зміни адреси ПЗП. Утримання рахується один раз. Підтвердьте # — UNLOCK стане 1. Регістр last-key зберігає останній виявлений код для перегляду.',
      nodes: [
        'keypad',
        'accepted',
        'seen',
        'progress',
        'ready',
        'unlocked',
        'open-led',
        'last-key',
      ],
    },
    {
      title: 'Відхиліть і очистіть хибні спроби',
      text: 'Очистіть через *, потім введіть 2 та 9: Progress скинеться в 0 й увімкнеться Error. Ранній #, п’ята цифра або кілька активних стовпців також дають помилку. * очищає прогрес, відкриття, помилку та last-key; RESET також скидає сканування. Спробуйте SECRET=1,3,7,9 та підтвердьте 1379; 2580 тепер хибний. Поверніть 2580 для готового сценарію. Pulse обробляє клавіші послідовно. Для досліду кількох стовпців оберіть Hold та утримуйте дві клавіші одного рядка; вони відхиляються. Повного багатоклавішного декодера тут немає.',
      nodes: [
        'star',
        'wrong-digit',
        'wrong-hash',
        'multi',
        'attempt-reset',
        'alarm',
        'reset',
        'secret',
      ],
    },
    {
      title: 'Запишіть і повторіть дослід',
      text: 'У «Завдання та здача → Сценарій дій» завантажте «Навчальний сценарій прикладу». Десять змін маски keypad.keys натискають/відпускають2,5,8,0,# та завершуються Progress=4, UNLOCK=1, Error=0. Біти йдуть рядками 1,2,3 /4,5,6 /7,8,9 /*,0,#. Запишіть власні правильні й хибні спроби з відпусканнями, передбачте адреси SECRET і поясніть порівняння. Зупинка повертає редаговану схему.',
      nodes: ['keypad', 'secret', 'progress', 'unlocked', 'alarm', 'last-key'],
    },
  ],
};
export default {
  id: 'keypad-code-lock',
  label: 'Matrix keypad: ROM code lock',
  ua: 'Матрична клавіатура: кодовий замок із ПЗП',
  category: 'architecture',
  level: 'intermediate',
  description:
    'Scan a real 3×4 matrix, read an editable four-digit secret from ROM, compare each press and confirm with #; * clears the attempt.',
  descriptionUa:
    'Скануйте матрицю 3×4, читайте змінний чотиризначний секрет із ПЗП, порівнюйте натискання та підтверджуйте #; * очищає спробу.',
  lesson: {
    en: {
      goal: 'Construct matrix scanning, ROM addressing, captured comparisons and progress memory with visible components, without a hidden lock controller.',
      steps: steps.en,
      expected:
        '2580 followed by # sets UNLOCK=1. Wrong, extra and early-confirm entries reset progress and raise Error; * clears the attempt. Held keys count once.',
    },
    ua: {
      goal: 'Побудуйте сканування матриці, адресацію ПЗП, фіксацію порівнянь і пам’ять прогресу видимими елементами без прихованого контролера замка.',
      steps: steps.ua,
      expected:
        '2580 та # задають UNLOCK=1. Хибна чи зайва цифра або раннє підтвердження скидають прогрес і вмикають Error; * очищає спробу. Утримання рахується один раз.',
    },
  },
  circuitPath: 'examples/keypad-code-lock/circuit.json',
  labPath: 'examples/keypad-code-lock/README.md',
  lab: {
    duration: 40,
    objectives: {
      en: [
        'Scan real contacts and decode keys with an external ROM table.',
        'Store a secret in memory and separate capture, address advancement and confirmation.',
      ],
      ua: [
        'Скануйте реальні контакти й декодуйте клавіші зовнішньою таблицею ПЗП.',
        'Зберігайте секрет у пам’яті й відділіть фіксацію, зміну адреси та підтвердження.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Why does holding a key not increment progress repeatedly?',
        'Which ROM sets the secret and which describes the keyboard?',
        'Why must comparison be captured before address advancement?',
        'Why is a fifth digit invalid even after four correct digits?',
      ],
      ua: [
        'Чому утримання не збільшує прогрес повторно?',
        'Яка ПЗП задає секрет, а яка описує клавіатуру?',
        'Чому порівняння фіксується до зміни адреси?',
        'Чому п’ята цифра хибна навіть після чотирьох правильних?',
      ],
    },
    deliverables: {
      en: [
        'Your circuit and recorded correct, wrong and cleared attempts.',
        'A matrix address table, expected SECRET addresses and an explanation of the two-stage capture.',
      ],
      ua: [
        'Власна схема й запис правильної, хибної та очищеної спроб.',
        'Таблиця адрес матриці, очікуваних адрес SECRET та пояснення двоетапної фіксації.',
      ],
    },
  },
  actionPreset: [
    { at: 0.1, node: 'keypad', key: 'keys', value: 2 },
    { at: 0.24, node: 'keypad', key: 'keys', value: 0 },
    { at: 0.34, node: 'keypad', key: 'keys', value: 16 },
    { at: 0.48, node: 'keypad', key: 'keys', value: 0 },
    { at: 0.58, node: 'keypad', key: 'keys', value: 128 },
    { at: 0.72, node: 'keypad', key: 'keys', value: 0 },
    { at: 0.82, node: 'keypad', key: 'keys', value: 1024 },
    { at: 0.96, node: 'keypad', key: 'keys', value: 0 },
    { at: 1.06, node: 'keypad', key: 'keys', value: 2048 },
    { at: 1.2, node: 'keypad', key: 'keys', value: 0 },
  ],
  actionProbes: [
    { node: 'progress', port: 'out', side: 'outputs' },
    { node: 'unlocked', port: 'q', side: 'outputs' },
    { node: 'alarm', port: 'q', side: 'outputs' },
    { node: 'last-key', port: 'out', side: 'outputs' },
    { node: 'secret', port: 'out', side: 'outputs' },
    { node: 'scan', port: 'out', side: 'outputs' },
    ...['col0', 'col1', 'col2'].map((port) => ({ node: 'keypad', port, side: 'outputs' })),
  ],
};
