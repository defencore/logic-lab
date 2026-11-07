export default {
  id: 'd-memory',
  label: 'One-bit memory',
  ua: 'Однобітна пам’ять',
  category: 'sequential',
  level: 'beginner',
  description: 'Use a manual clock to store a bit and learn what a rising edge means.',
  descriptionUa: 'Запам’ятайте біт ручним тактом і дослідіть додатний фронт.',
  lesson: {
    en: {
      goal: 'Separate the current data input from a stored output.',
      steps: [
        {
          title: 'Change data without a clock',
          text: 'Leave Manual clock at 0 and set Data D to 1. Stored Q remains 0: changing data alone does not write the memory.',
          nodes: ['data', 'memory', 'q'],
        },
        {
          title: 'Capture a rising edge',
          text: 'Click Manual clock from 0 to 1. Q becomes 1 and Inverted Q becomes 0. Now set Data D back to 0; Q still remembers 1.',
          nodes: ['clock', 'memory', 'q', 'nq'],
        },
        {
          title: 'Write again, then reset',
          text: 'Set Manual clock to 0 and back to 1 to store the new 0. Reset=1 clears Q immediately, with no clock edge. Return Reset to 0 afterward.',
          nodes: ['clock', 'reset', 'q'],
        },
      ],
      expected:
        'Q changes on 0→1 clock transitions or an active reset; a steady high clock does not continuously copy D.',
    },
    ua: {
      goal: 'Відрізніть поточний вхід від збереженого виходу.',
      steps: [
        {
          title: 'Змініть дані без такту',
          text: 'Залиште Manual clock=0 та встановіть Data D=1. Stored Q залишається 0: сама зміна даних не записує пам’ять.',
          nodes: ['data', 'memory', 'q'],
        },
        {
          title: 'Захопіть додатний фронт',
          text: 'Перемкніть Manual clock з 0 в 1. Q стане 1, Inverted Q — 0. Поверніть Data D в 0: Q усе ще пам’ятає 1.',
          nodes: ['clock', 'memory', 'q', 'nq'],
        },
        {
          title: 'Запишіть знову й скиньте',
          text: 'Перемкніть Manual clock в 0 і знову в 1, щоб записати новий 0. Reset=1 негайно очищає Q без такту. Потім поверніть Reset в 0.',
          nodes: ['clock', 'reset', 'q'],
        },
      ],
      expected:
        'Q змінюється за переходом такту 0→1 або при скиданні; постійна одиниця такту не копіює D безперервно.',
    },
  },
  circuitPath: 'examples/d-memory/circuit.json',
  labPath: 'examples/d-memory/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Separate the current data input from a stored output.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Відрізніть поточний вхід від збереженого виходу.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Leave Manual clock at 0 and set Data D to 1. Stored Q remains 0: changing data alone does not write the memory.',
        'Click Manual clock from 0 to 1. Q becomes 1 and Inverted Q becomes 0. Now set Data D back to 0; Q still remembers 1.',
        'Set Manual clock to 0 and back to 1 to store the new 0. Reset=1 clears Q immediately, with no clock edge. Return Reset to 0 afterward.',
      ],
      ua: [
        'Залиште Manual clock=0 та встановіть Data D=1. Stored Q залишається 0: сама зміна даних не записує пам’ять.',
        'Перемкніть Manual clock з 0 в 1. Q стане 1, Inverted Q — 0. Поверніть Data D в 0: Q усе ще пам’ятає 1.',
        'Перемкніть Manual clock в 0 і знову в 1, щоб записати новий 0. Reset=1 негайно очищає Q без такту. Потім поверніть Reset в 0.',
      ],
    },
    questions: {
      en: [
        'Does a steady high clock continuously copy D?',
        'Which change can clear Q without a clock edge?',
        'What happens when D changes between rising edges?',
      ],
      ua: [
        'Чи копіює постійна одиниця такту D безперервно?',
        'Яка зміна очищає Q без тактового фронту?',
        'Що відбувається при зміні D між додатними фронтами?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A chronological table of D, CLK, Reset and Q covering capture, hold and reset.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Послідовна таблиця D, CLK, Reset та Q для запису, зберігання й скидання.',
      ],
    },
  },
};
