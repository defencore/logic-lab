export default {
  id: 'position-control',
  label: 'Closed-loop position control',
  ua: 'Керування позицією зі зворотним зв’язком',
  category: 'motion',
  level: 'intermediate',
  description:
    'Share one target between direction and arrival sensors to move an axis to a requested position.',
  descriptionUa:
    'Подайте одну ціль на датчики напрямку й досягнення для руху осі до заданої позиції.',
  lesson: {
    en: {
      goal: 'Use measured position and a shared target to select direction and stop within a tolerance.',
      steps: [
        {
          title: 'Move to the first target',
          text: 'The target byte starts at 128, converted to 128 / 255 × 8 ≈ 4.016 mm. Keep the simulation running: the axis starts at 0 and moves toward that target at 2 mm/s. The target voltage is used as a numeric position signal in this teaching circuit.',
          nodes: ['target', 'target-dac', 'axis'],
        },
        {
          title: 'Watch direction and arrival',
          text: 'The Below target sensor drives DIR=1 while position is below the target, otherwise DIR=0. The window sensor turns on within ±0.03 mm; NOT then disables the axis. Target reached lights and the clean STEP clock keeps running.',
          nodes: ['direction-sensor', 'target-sensor', 'not-target', 'allow', 'target-led'],
        },
        {
          title: 'Request a lower position',
          text: 'Select Target byte and change Value to 64 (about 2.008 mm). Both sensors receive the new target together. The axis reverses and stops near 2 mm. Then try Value=192 (about 6.024 mm).',
          nodes: ['target', 'axis', 'target-sensor'],
        },
        {
          title: 'Pause motion and inspect tolerance',
          text: 'Set Motion enable=0 while changing the target: position holds. Set it back to 1 to resume on fresh STEP edges. The 0.03 mm tolerance is larger than half a 0.04 mm step, so the axis can reach the target window instead of oscillating across it.',
          nodes: ['run', 'target-sensor', 'axis'],
        },
      ],
      expected:
        'The axis stops within 0.03 mm of each valid target and reverses automatically for a lower target. A common target signal keeps direction and arrival decisions consistent.',
    },
    ua: {
      goal: 'За виміряною позицією та спільною ціллю обирайте напрямок і зупиняйтеся в заданому допуску.',
      steps: [
        {
          title: 'Рухайтеся до першої цілі',
          text: 'Цільовий байт 128 перетворюється на 128 / 255 × 8 ≈ 4.016 мм. В активній симуляції вісь рухається від 0 до цілі зі швидкістю 2 мм/с. Напруга ЦАП тут використовується як числовий сигнал позиції.',
          nodes: ['target', 'target-dac', 'axis'],
        },
        {
          title: 'Спостерігайте напрямок і досягнення',
          text: 'Датчик Below target задає DIR=1 нижче цілі, інакше DIR=0. Віконний датчик вмикається в межах ±0.03 мм; NOT вимикає рух. Target reached світиться, а чистий такт STEP продовжується.',
          nodes: ['direction-sensor', 'target-sensor', 'not-target', 'allow', 'target-led'],
        },
        {
          title: 'Задайте нижчу позицію',
          text: 'Оберіть Target byte і змініть Значення на 64 (близько 2.008 мм). Обидва датчики одночасно отримають нову ціль. Вісь змінить напрямок і зупиниться біля 2 мм. Потім спробуйте 192 (близько 6.024 мм).',
          nodes: ['target', 'axis', 'target-sensor'],
        },
        {
          title: 'Зупиніть рух і перевірте допуск',
          text: 'При Motion enable=0 зміна цілі не рухає вісь. Поверніть 1 для руху за новими фронтами STEP. Допуск 0.03 мм більший за половину кроку 0.04 мм, тому вісь потрапляє у вікно, а не коливається навколо нього.',
          nodes: ['run', 'target-sensor', 'axis'],
        },
      ],
      expected:
        'Вісь зупиняється в межах 0.03 мм від цілі й автоматично змінює напрямок для нижчої цілі. Спільний цільовий сигнал узгоджує напрямок і рішення про досягнення.',
    },
  },
  lab: {
    duration: 35,
    questions: {
      en: [
        'Why must the direction and arrival sensors use the same target?',
        'Why is a target window needed when travel occurs in discrete steps?',
        'What happens if the tolerance is smaller than half a full step?',
        'How does Motion enable differ from changing the target?',
      ],
      ua: [
        'Чому датчики напрямку й досягнення мають використовувати одну ціль?',
        'Навіщо потрібне вікно цілі при дискретних кроках?',
        'Що станеться при допуску, меншому за половину кроку?',
        'Чим Motion enable відрізняється від зміни цілі?',
      ],
    },
    deliverables: {
      en: [
        'A saved closed-loop position circuit.',
        'A target/settled-position/error table for target bytes 64, 128 and 192.',
        'A trace demonstrating reversal and a disabled-motion interval.',
      ],
      ua: [
        'Збережена схема позиційного зворотного зв’язку.',
        'Таблиця цілі, фактичної позиції й похибки для байтів 64, 128 та 192.',
        'Графік зі зміною напрямку та інтервалом вимкненого руху.',
      ],
    },
    objectives: {
      en: [
        'Use measured position and a shared target to select direction and stop within a tolerance.',
        'Measure the relationship between control signals and observed axis motion.',
      ],
      ua: [
        'За виміряною позицією та спільною ціллю обирайте напрямок і зупиняйтеся в заданому допуску.',
        'Виміряйте зв’язок керувальних сигналів зі спостереженим рухом осі.',
      ],
    },
    tasks: {
      en: [
        'The target byte starts at 128, converted to 128 / 255 × 8 ≈ 4.016 mm. Keep the simulation running: the axis starts at 0 and moves toward that target at 2 mm/s. The target voltage is used as a numeric position signal in this teaching circuit.',
        'The Below target sensor drives DIR=1 while position is below the target, otherwise DIR=0. The window sensor turns on within ±0.03 mm; NOT then disables the axis. Target reached lights and the clean STEP clock keeps running.',
        'Select Target byte and change Value to 64 (about 2.008 mm). Both sensors receive the new target together. The axis reverses and stops near 2 mm. Then try Value=192 (about 6.024 mm).',
        'Set Motion enable=0 while changing the target: position holds. Set it back to 1 to resume on fresh STEP edges. The 0.03 mm tolerance is larger than half a 0.04 mm step, so the axis can reach the target window instead of oscillating across it.',
      ],
      ua: [
        'Цільовий байт 128 перетворюється на 128 / 255 × 8 ≈ 4.016 мм. В активній симуляції вісь рухається від 0 до цілі зі швидкістю 2 мм/с. Напруга ЦАП тут використовується як числовий сигнал позиції.',
        'Датчик Below target задає DIR=1 нижче цілі, інакше DIR=0. Віконний датчик вмикається в межах ±0.03 мм; NOT вимикає рух. Target reached світиться, а чистий такт STEP продовжується.',
        'Оберіть Target byte і змініть Значення на 64 (близько 2.008 мм). Обидва датчики одночасно отримають нову ціль. Вісь змінить напрямок і зупиниться біля 2 мм. Потім спробуйте 192 (близько 6.024 мм).',
        'При Motion enable=0 зміна цілі не рухає вісь. Поверніть 1 для руху за новими фронтами STEP. Допуск 0.03 мм більший за половину кроку 0.04 мм, тому вісь потрапляє у вікно, а не коливається навколо нього.',
      ],
    },
  },
  circuitPath: 'examples/position-control/circuit.json',
  labPath: 'examples/position-control/README.md',
};
