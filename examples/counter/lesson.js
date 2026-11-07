export default {
  id: 'counter',
  label: 'Binary counter',
  ua: 'Двійковий лічильник',
  category: 'sequential',
  level: 'beginner',
  description: 'Watch eight real bit lamps count; pause, enable and reset the counter.',
  descriptionUa: 'Спостерігайте вісім бітових індикаторів; зупиняйте, дозволяйте й скидайте лічбу.',
  lesson: {
    en: {
      goal: 'Read a byte as eight weighted binary bits.',
      steps: [
        {
          title: 'Start the clock',
          text: 'Keep the simulation running; press Run only if paused. The 2 Hz clock creates two rising edges per simulated second. Select the counter to watch its numeric Q value.',
          nodes: ['clock', 'counter', 'bits'],
        },
        {
          title: 'Read the lamps',
          text: 'Bit 0 has weight 1, bit 1 weight 2, bit 2 weight 4. For count 5, only the lamps with weights 1 and 4 are on. The splitter exposes each bit.',
          nodes: ['bit0', 'bit1', 'bit2', 'bit3'],
        },
        {
          title: 'Hold and clear',
          text: 'Set Enable=0: the clock keeps running but the stored count holds. Set Reset=1 to clear all bits; return Reset=0 and Enable=1 to resume.',
          nodes: ['enable', 'reset', 'counter'],
        },
      ],
      expected:
        'The byte counts 0…255, then wraps to 0. The lamps show bit values, not seven-segment masks.',
    },
    ua: {
      goal: 'Навчіться читати байт як вісім двійкових бітів із вагами.',
      steps: [
        {
          title: 'Запустіть такт',
          text: 'Залиште симуляцію активною; натисніть Запуск лише після паузи. Такт 2 Гц створює два додатні фронти за секунду симуляції. Оберіть лічильник і спостерігайте числове Q.',
          nodes: ['clock', 'counter', 'bits'],
        },
        {
          title: 'Прочитайте індикатори',
          text: 'Біт 0 має вагу 1, біт 1 — 2, біт 2 — 4. Для числа 5 світяться лише ваги 1 та 4. Розгалужувач показує кожен біт.',
          nodes: ['bit0', 'bit1', 'bit2', 'bit3'],
        },
        {
          title: 'Зупиніть і очистіть',
          text: 'Enable=0 зупиняє лічбу, хоча такт працює. Reset=1 очищає всі біти; поверніть Reset=0 та Enable=1 для продовження.',
          nodes: ['enable', 'reset', 'counter'],
        },
      ],
      expected: 'Байт лічить від 0 до 255 і повертається в 0. Індикатори показують біти числа.',
    },
  },
  circuitPath: 'examples/counter/circuit.json',
  labPath: 'examples/counter/README.md',
  lab: {
    duration: 20,
    objectives: {
      en: [
        'Read a byte as eight weighted binary bits.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Навчіться читати байт як вісім двійкових бітів із вагами.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Keep the simulation running; press Run only if paused. The 2 Hz clock creates two rising edges per simulated second. Select the counter to watch its numeric Q value.',
        'Bit 0 has weight 1, bit 1 weight 2, bit 2 weight 4. For count 5, only the lamps with weights 1 and 4 are on. The splitter exposes each bit.',
        'Set Enable=0: the clock keeps running but the stored count holds. Set Reset=1 to clear all bits; return Reset=0 and Enable=1 to resume.',
      ],
      ua: [
        'Залиште симуляцію активною; натисніть Запуск лише після паузи. Такт 2 Гц створює два додатні фронти за секунду симуляції. Оберіть лічильник і спостерігайте числове Q.',
        'Біт 0 має вагу 1, біт 1 — 2, біт 2 — 4. Для числа 5 світяться лише ваги 1 та 4. Розгалужувач показує кожен біт.',
        'Enable=0 зупиняє лічбу, хоча такт працює. Reset=1 очищає всі біти; поверніть Reset=0 та Enable=1 для продовження.',
      ],
    },
    questions: {
      en: [
        'What decimal value is represented by lit weights 1, 4 and 8?',
        'Why does the counter stop when Enable is low although the clock still runs?',
        'What happens after 255?',
      ],
      ua: [
        'Яке число представляють увімкнені ваги 1, 4 та 8?',
        'Чому Enable=0 зупиняє лічильник, хоча такт працює?',
        'Що станеться після 255?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'Observed lamp patterns for counts 0 through 7 and an explanation of Enable versus Reset.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Спостережені індикатори для чисел 0–7 і пояснення різниці Enable та Reset.',
      ],
    },
  },
};
