const steps = {
  en: [
    {
      title: 'Predict the alarm permission',
      text: 'All three switches start at 0. Trace ARM AND (DOOR OR TEST): the OR requests an alarm, and ARM permits it. Predict all eight switch combinations before operating the circuit. The buzzer and lamp receive the same one-bit command.',
      nodes: ['arm', 'door', 'test', 'request', 'permission', 'buzzer', 'lamp'],
    },
    {
      title: 'Enable sound and test the door',
      text: 'Run the simulation and press Enable sound. Set ARM=1, then DOOR=1: the lamp lights and the active buzzer plays its internal 880 Hz tone at volume 0.15. Close the door: both stop. At ARM=0 the door cannot sound the alarm.',
      nodes: ['arm', 'door', 'buzzer', 'lamp'],
    },
    {
      title: 'Compare test and disarm',
      text: 'With ARM=1 and DOOR=0, set TEST=1: the alarm sounds. Keep TEST=1 and set ARM=0: it stops. Explain why TEST is an alternative request, not a bypass around ARM. Constant 1 is sufficient here because an active buzzer contains its own oscillator.',
      nodes: ['test', 'request', 'permission', 'buzzer'],
    },
    {
      title: 'Record the evidence',
      text: 'Load Example action sequence in Assignments & submission → Action sequence, or record your own switch changes. The supplied six actions demonstrate arm, door alarm, door closure, test, disarm and test release. Compare the lamp and buzzer input in the observation table. Stop restores your circuit; replay does not automatically grant audio permission.',
      nodes: ['arm', 'door', 'test', 'lamp', 'buzzer'],
    },
  ],
  ua: [
    {
      title: 'Передбачте дозвіл тривоги',
      text: 'Усі три перемикачі починають із 0. Простежте ARM AND (DOOR OR TEST): OR запитує тривогу, а ARM її дозволяє. Перед перемиканнями передбачте всі вісім комбінацій. Зумер і лампа отримують ту саму однобітну команду.',
      nodes: ['arm', 'door', 'test', 'request', 'permission', 'buzzer', 'lamp'],
    },
    {
      title: 'Увімкніть звук і перевірте двері',
      text: 'Запустіть симуляцію й натисніть «Увімкнути звук». Задайте ARM=1, потім DOOR=1: лампа засвітиться, а активний зумер видасть внутрішній тон 880 Гц із гучністю 0.15. Зачиніть двері: обидва вимкнуться. При ARM=0 двері не вмикають тривогу.',
      nodes: ['arm', 'door', 'buzzer', 'lamp'],
    },
    {
      title: 'Порівняйте тест і зняття з охорони',
      text: 'При ARM=1 і DOOR=0 задайте TEST=1: тривога звучить. Залиште TEST=1 та задайте ARM=0: вона припиниться. Поясніть, чому TEST є іншим запитом, а не обходом ARM. Сталої 1 тут достатньо, бо активний зумер містить власний генератор.',
      nodes: ['test', 'request', 'permission', 'buzzer'],
    },
    {
      title: 'Запишіть докази',
      text: 'Завантажте «Навчальний сценарій прикладу» в «Завдання та здача → Сценарій дій» або запишіть власні перемикання. Готові шість дій показують охорону, тривогу від дверей, закриття дверей, тест, зняття з охорони та відпускання тесту. Порівняйте лампу й вхід зумера в таблиці спостережень. Зупинка повертає вашу схему; повтор не надає дозвіл звуку автоматично.',
      nodes: ['arm', 'door', 'test', 'lamp', 'buzzer'],
    },
  ],
};

export default {
  id: 'active-buzzer-alarm',
  label: 'Active buzzer alarm',
  ua: 'Активний зумер: логічна сигналізація',
  category: 'basics',
  level: 'beginner',
  description:
    'Build ARM AND (DOOR OR TEST), compare an audible 880 Hz alarm with an LED, and replay its switch sequence.',
  descriptionUa:
    'Дослідіть ARM AND (DOOR OR TEST), порівняйте звукову тривогу 880 Гц зі світлодіодом та повторіть запис перемикань.',
  lesson: {
    en: {
      goal: 'Use OR requests and an AND permission to control an active buzzer, then justify every state with a truth table.',
      steps: steps.en,
      expected:
        'The alarm and lamp are on exactly when ARM=1 and either DOOR or TEST is 1. A steady enable produces one internal 880 Hz tone.',
    },
    ua: {
      goal: 'Керуйте активним зумером через запити OR і дозвіл AND, а потім обґрунтуйте кожен стан таблицею істинності.',
      steps: steps.ua,
      expected:
        'Тривога й лампа ввімкнені саме при ARM=1 та хоча б одному активному DOOR або TEST. Сталий дозвіл створює внутрішній тон 880 Гц.',
    },
  },
  circuitPath: 'examples/active-buzzer-alarm/circuit.json',
  labPath: 'examples/active-buzzer-alarm/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Build a gated alarm from two Boolean operations.',
        'Distinguish an active buzzer enable from the frequency of its internal tone.',
      ],
      ua: [
        'Побудуйте сигналізацію з дозволом через дві булеві операції.',
        'Відрізніть дозвіл активного зумера від частоти його внутрішнього тону.',
      ],
    },
    tasks: { en: steps.en.map(({ text }) => text), ua: steps.ua.map(({ text }) => text) },
    questions: {
      en: [
        'Why does TEST not sound an alarm while ARM=0?',
        'Would a passive buzzer produce a sustained tone from the same constant 1? Explain.',
      ],
      ua: [
        'Чому TEST не вмикає тривогу при ARM=0?',
        'Чи створить пасивний зумер сталий тон від тієї самої постійної 1? Поясніть.',
      ],
    },
    deliverables: {
      en: [
        'Your circuit, recorded switch sequence and observations.',
        'An eight-row truth table and an explanation of active versus passive control.',
      ],
      ua: [
        'Власна схема, запис перемикань і спостереження.',
        'Таблиця істинності з восьми рядків та пояснення активного й пасивного керування.',
      ],
    },
  },
  actionPreset: [
    { at: 0.2, node: 'arm', key: 'value', value: 1 },
    { at: 0.4, node: 'door', key: 'value', value: 1 },
    { at: 0.8, node: 'door', key: 'value', value: 0 },
    { at: 1, node: 'test', key: 'value', value: 1 },
    { at: 1.4, node: 'arm', key: 'value', value: 0 },
    { at: 1.6, node: 'test', key: 'value', value: 0 },
  ],
  actionProbes: [
    { node: 'permission', port: 'out', side: 'outputs' },
    { node: 'lamp', port: 'in', side: 'inputs' },
    { node: 'buzzer', port: 'in', side: 'inputs' },
  ],
};
