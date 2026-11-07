export default {
  id: 'printer-homing',
  label: 'Printer axis homing',
  ua: 'Пошук нуля осі принтера',
  category: 'motion',
  level: 'intermediate',
  description:
    'Move toward an endstop, stop automatically at home, and reverse away from the switch.',
  descriptionUa:
    'Рухайтеся до кінцевика, автоматично зупиніться в нулі та від’їдьте у зворотному напрямку.',
  lesson: {
    en: {
      goal: 'Build an automatic homing interlock from a position endstop and logic gates.',
      steps: [
        {
          title: 'Approach the minimum',
          text: 'Keep the simulation running. Direction starts at 0, so the 100 Hz clock moves the axis from 5 mm toward 0 mm at 4 mm/s. Reset the simulation if it has already reached home before you inspect it.',
          nodes: ['axis', 'clock', 'direction'],
        },
        {
          title: 'Trace the automatic stop',
          text: 'At Position=0 the minimum endstop becomes 1, its NOT becomes 0, and Motion enable becomes 0 because Direction=0. The clock still pulses, but the axis stays at 0 and Home reached lights. STEP is never cut by the feedback loop.',
          nodes: ['home', 'not-home', 'allow', 'home-led'],
        },
        {
          title: 'Reverse away from home',
          text: 'Set Direction=1. The OR gate permits positive movement even while the endstop is pressed, so the next new STEP edges move the axis away. Then Direction=0 starts another homing approach.',
          nodes: ['direction', 'allow', 'axis'],
        },
        {
          title: 'Restart the cycle',
          text: 'Pause before measuring a repeat cycle. Set Reset=1 and then 0 to return to the 5 mm initial position, set Direction=0, and resume. Compare the approximately 1.25 s travel time with distance divided by speed.',
          nodes: ['reset', 'axis', 'home'],
        },
      ],
      expected:
        'Homing stops at 0 mm automatically; reverse direction releases the axis without bypassing the endstop manually. The interlock gates ENABLE, while STEP remains a clean clock.',
    },
    ua: {
      goal: 'Побудуйте автоматичне зупинення в нулі з кінцевиком і логічними елементами.',
      steps: [
        {
          title: 'Наблизьтеся до мінімуму',
          text: 'Залиште симуляцію активною. Direction=0 і такт 100 Гц рухають вісь із 5 мм до 0 мм зі швидкістю 4 мм/с. Скиньте симуляцію, якщо вона вже дісталася нуля до огляду.',
          nodes: ['axis', 'clock', 'direction'],
        },
        {
          title: 'Простежте автоматичну зупинку',
          text: 'При Position=0 кінцевик дає 1, його NOT — 0, а дозвіл руху стає 0 при Direction=0. Такт продовжується, але вісь стоїть у 0 та Home reached світиться. Зворотний зв’язок не обрізає STEP.',
          nodes: ['home', 'not-home', 'allow', 'home-led'],
        },
        {
          title: 'Від’їдьте від нуля',
          text: 'Задайте Direction=1. OR дозволяє додатний рух навіть при натиснутому кінцевику, тому нові фронти STEP відводять вісь. Direction=0 знову запускає наближення до нуля.',
          nodes: ['direction', 'allow', 'axis'],
        },
        {
          title: 'Повторіть цикл',
          text: 'Для вимірювання повторного циклу спершу поставте паузу. Перемкніть Reset в 1 та 0 для повернення до 5 мм, задайте Direction=0 й продовжте. Порівняйте час близько 1.25 с із відстанню, поділеною на швидкість.',
          nodes: ['reset', 'axis', 'home'],
        },
      ],
      expected:
        'Пошук нуля автоматично зупиняється в 0 мм; зворотний напрямок звільняє вісь без ручного обходу кінцевика. Блокування керує ENABLE, а STEP залишається чистим тактом.',
    },
  },
  lab: {
    duration: 30,
    questions: {
      en: [
        'Why is ENABLE gated instead of cutting STEP with the endstop signal?',
        'Why does OR with DIR allow escape from a pressed minimum endstop?',
        'What homing time follows from 5 mm, 100 Hz and 0.04 mm/step?',
      ],
      ua: [
        'Чому блокування керує ENABLE, а не обрізає STEP кінцевиком?',
        'Чому OR із DIR дозволяє виїхати з натиснутого нижнього кінцевика?',
        'Який час пошуку нуля випливає з 5 мм, 100 Гц та 0.04 мм/крок?',
      ],
    },
    deliverables: {
      en: [
        'A saved homing circuit.',
        'A position trace showing approach, automatic stop, reverse escape and a repeated cycle.',
        'A short truth table for endstop, DIR and ENABLE.',
      ],
      ua: [
        'Збережена схема пошуку нуля.',
        'Графік позиції з наближенням, зупинкою, зворотним рухом і повторним циклом.',
        'Коротка таблиця кінцевика, DIR та ENABLE.',
      ],
    },
    objectives: {
      en: [
        'Build an automatic homing interlock from a position endstop and logic gates.',
        'Measure the relationship between control signals and observed axis motion.',
      ],
      ua: [
        'Побудуйте автоматичне зупинення в нулі з кінцевиком і логічними елементами.',
        'Виміряйте зв’язок керувальних сигналів зі спостереженим рухом осі.',
      ],
    },
    tasks: {
      en: [
        'Keep the simulation running. Direction starts at 0, so the 100 Hz clock moves the axis from 5 mm toward 0 mm at 4 mm/s. Reset the simulation if it has already reached home before you inspect it.',
        'At Position=0 the minimum endstop becomes 1, its NOT becomes 0, and Motion enable becomes 0 because Direction=0. The clock still pulses, but the axis stays at 0 and Home reached lights. STEP is never cut by the feedback loop.',
        'Set Direction=1. The OR gate permits positive movement even while the endstop is pressed, so the next new STEP edges move the axis away. Then Direction=0 starts another homing approach.',
        'Pause before measuring a repeat cycle. Set Reset=1 and then 0 to return to the 5 mm initial position, set Direction=0, and resume. Compare the approximately 1.25 s travel time with distance divided by speed.',
      ],
      ua: [
        'Залиште симуляцію активною. Direction=0 і такт 100 Гц рухають вісь із 5 мм до 0 мм зі швидкістю 4 мм/с. Скиньте симуляцію, якщо вона вже дісталася нуля до огляду.',
        'При Position=0 кінцевик дає 1, його NOT — 0, а дозвіл руху стає 0 при Direction=0. Такт продовжується, але вісь стоїть у 0 та Home reached світиться. Зворотний зв’язок не обрізає STEP.',
        'Задайте Direction=1. OR дозволяє додатний рух навіть при натиснутому кінцевику, тому нові фронти STEP відводять вісь. Direction=0 знову запускає наближення до нуля.',
        'Для вимірювання повторного циклу спершу поставте паузу. Перемкніть Reset в 1 та 0 для повернення до 5 мм, задайте Direction=0 й продовжте. Порівняйте час близько 1.25 с із відстанню, поділеною на швидкість.',
      ],
    },
  },
  circuitPath: 'examples/printer-homing/circuit.json',
  labPath: 'examples/printer-homing/README.md',
};
