export default {
  id: 'monostable',
  label: 'One trigger, one pulse',
  ua: 'Один запуск — один імпульс',
  category: 'physical',
  level: 'beginner',
  description: 'Trigger a 0.5-second pulse and see why holding the trigger does not extend it.',
  descriptionUa: 'Запустіть імпульс 0.5 с і перевірте, чому утримання входу не подовжує його.',
  lesson: {
    en: {
      goal: 'Turn an input edge into a pulse of a known duration.',
      steps: [
        {
          title: 'Start time, then trigger',
          text: 'Keep the simulation running; press Run only if paused. Click Trigger from 0 to 1. Pulse output lights immediately for 0.5 seconds.',
          nodes: ['trigger', 'timer', 'pulse'],
        },
        {
          title: 'Hold and re-arm',
          text: 'Keep Trigger at 1: the pulse still ends. Return Trigger to 0 and then to 1 to create another pulse. Extra rising edges during an active pulse are ignored.',
          nodes: ['trigger', 'timer', 'trace'],
        },
        {
          title: 'Change duration and cancel',
          text: 'Select the timer and set Pulse duration to 1 second, then trigger again. Reset=1 cancels an active pulse immediately; return Reset=0 before the next experiment.',
          nodes: ['timer', 'reset'],
        },
      ],
      expected:
        'One rising trigger produces one fixed-duration pulse. Pausing freezes time; Reset can end a pulse early.',
    },
    ua: {
      goal: 'Перетворіть фронт входу на імпульс заданої тривалості.',
      steps: [
        {
          title: 'Запустіть час та імпульс',
          text: 'Залиште симуляцію активною; натисніть Запуск лише після паузи. Перемкніть Trigger з 0 в 1. Pulse output одразу засвітиться на 0.5 секунди.',
          nodes: ['trigger', 'timer', 'pulse'],
        },
        {
          title: 'Утримуйте й підготуйте знову',
          text: 'Тримайте Trigger=1: імпульс усе одно завершиться. Поверніть Trigger в 0 і знову в 1 для нового імпульсу. Фронти під час активного імпульсу ігноруються.',
          nodes: ['trigger', 'timer', 'trace'],
        },
        {
          title: 'Змініть тривалість і скасуйте',
          text: 'Оберіть таймер, задайте Тривалість імпульсу 1 с та запустіть знову. Reset=1 негайно скасовує активний імпульс; поверніть Reset=0 перед наступним дослідом.',
          nodes: ['timer', 'reset'],
        },
      ],
      expected:
        'Один додатний фронт створює один імпульс заданої тривалості. Пауза зупиняє час; Reset може завершити імпульс раніше.',
    },
  },
  circuitPath: 'examples/monostable/circuit.json',
  labPath: 'examples/monostable/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Turn an input edge into a pulse of a known duration.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Перетворіть фронт входу на імпульс заданої тривалості.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Keep the simulation running; press Run only if paused. Click Trigger from 0 to 1. Pulse output lights immediately for 0.5 seconds.',
        'Keep Trigger at 1: the pulse still ends. Return Trigger to 0 and then to 1 to create another pulse. Extra rising edges during an active pulse are ignored.',
        'Select the timer and set Pulse duration to 1 second, then trigger again. Reset=1 cancels an active pulse immediately; return Reset=0 before the next experiment.',
      ],
      ua: [
        'Залиште симуляцію активною; натисніть Запуск лише після паузи. Перемкніть Trigger з 0 в 1. Pulse output одразу засвітиться на 0.5 секунди.',
        'Тримайте Trigger=1: імпульс усе одно завершиться. Поверніть Trigger в 0 і знову в 1 для нового імпульсу. Фронти під час активного імпульсу ігноруються.',
        'Оберіть таймер, задайте Тривалість імпульсу 1 с та запустіть знову. Reset=1 негайно скасовує активний імпульс; поверніть Reset=0 перед наступним дослідом.',
      ],
    },
    questions: {
      en: [
        'Why does holding Trigger high not keep the pulse active?',
        'What does a trigger edge during an active pulse do?',
        'How does Pause differ from Reset?',
      ],
      ua: [
        'Чому утримання Trigger=1 не подовжує імпульс?',
        'Що робить фронт Trigger під час активного імпульсу?',
        'Чим Пауза відрізняється від Reset?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'Pulse traces for durations 0.5 s and 1 s, including one reset-shortened pulse.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Осцилограми імпульсів 0.5 с і 1 с, зокрема імпульсу, скороченого Reset.',
      ],
    },
  },
};
