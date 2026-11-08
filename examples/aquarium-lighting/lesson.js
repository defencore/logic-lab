export default {
  id: 'aquarium-lighting',
  label: 'Aquarium: day/night lighting',
  ua: 'Акваріум: день і ніч',
  category: 'automation',
  level: 'beginner',
  description:
    'Build and invert a daily light schedule with XOR, then test why a permanent override removes the resting interval.',
  descriptionUa:
    'Побудуйте та інвертуйте добовий розклад через XOR і перевірте, чому постійний обхід забирає період відпочинку.',
  lesson: {
    en: {
      goal: 'Build and invert a daily light schedule with XOR, then test why a permanent override removes the resting interval.',
      steps: [
        {
          title: 'Compare the four XOR states',
          text: 'With Unsafe light always on=0, observe Day and the Light command. Invert light schedule=0 copies Day; setting it to 1 reverses Day. Across both halves of the 60-second day, record all four Day/Invert input pairs and the resulting light.',
          nodes: ['invert', 'schedule', 'world'],
        },
        {
          title: 'Preserve other life-support loops',
          text: 'Change only the lighting switches. Heating, cooling, air, food and filtration retain their sensor feedback. Compare a schedule change with a global pause: pause freezes fish, sensors and the day phase together, while XOR changes only the lamp command.',
          nodes: ['world', 'schedule', 'run'],
        },
        {
          title: 'Remove the resting interval',
          text: 'Turn Unsafe light always on=1 and let the simulation run beyond 1.5 complete dayLength cycles of continuous light (90 seconds at the starting dayLength=60). Health then declines rather than fish dying instantly. Restore the override to 0 and observe survivors recover; pulse Reset process to start a fresh population.',
          nodes: ['force-light', 'light', 'world', 'reset'],
        },
      ],
      expected:
        'XOR selects the normal or inverted day schedule without changing other actuators. Both alternating schedules provide a dark interval; forced continuous light eventually creates visible stress and can kill fish if left unchecked.',
    },
    ua: {
      goal: 'Побудуйте та інвертуйте добовий розклад через XOR і перевірте, чому постійний обхід забирає період відпочинку.',
      steps: [
        {
          title: 'Порівняйте чотири стани XOR',
          text: 'При Unsafe light always on=0 спостерігайте Day та команду Light. Invert light schedule=0 повторює Day; значення 1 інвертує Day. За обидві половини 60-секундної доби запишіть чотири пари Day/Invert та світло.',
          nodes: ['invert', 'schedule', 'world'],
        },
        {
          title: 'Збережіть інші контури життя',
          text: 'Змінюйте лише перемикачі освітлення. Нагрів, охолодження, повітря, їжа та фільтрація зберігають свої датчики. Порівняйте зміну розкладу з паузою: пауза зупиняє рибок, датчики й добу разом, а XOR змінює тільки лампу.',
          nodes: ['world', 'schedule', 'run'],
        },
        {
          title: 'Приберіть відпочинок',
          text: 'Увімкніть Unsafe light always on=1 довше ніж на 1,5 повного циклу dayLength безперервного світла (90 секунд при початковому dayLength=60). Далі Health зменшується, рибки не гинуть миттєво. Поверніть обхід у 0 для відновлення живих; Reset process починає нову популяцію.',
          nodes: ['force-light', 'light', 'world', 'reset'],
        },
      ],
      expected:
        'XOR обирає звичайний чи інвертований розклад без зміни інших механізмів. Обидва черговані розклади дають темний інтервал; постійне світло згодом спричиняє видимий стрес і може вбити рибок.',
    },
  },
  circuitPath: 'examples/aquarium-lighting/circuit.json',
  labPath: 'examples/aquarium-lighting/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Build and invert a daily light schedule with XOR, then test why a permanent override removes the resting interval.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Побудуйте та інвертуйте добовий розклад через XOR і перевірте, чому постійний обхід забирає період відпочинку.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'With Unsafe light always on=0, observe Day and the Light command. Invert light schedule=0 copies Day; setting it to 1 reverses Day. Across both halves of the 60-second day, record all four Day/Invert input pairs and the resulting light.',
        'Change only the lighting switches. Heating, cooling, air, food and filtration retain their sensor feedback. Compare a schedule change with a global pause: pause freezes fish, sensors and the day phase together, while XOR changes only the lamp command.',
        'Turn Unsafe light always on=1 and let the simulation run beyond 1.5 complete dayLength cycles of continuous light (90 seconds at the starting dayLength=60). Health then declines rather than fish dying instantly. Restore the override to 0 and observe survivors recover; pulse Reset process to start a fresh population.',
      ],
      ua: [
        'При Unsafe light always on=0 спостерігайте Day та команду Light. Invert light schedule=0 повторює Day; значення 1 інвертує Day. За обидві половини 60-секундної доби запишіть чотири пари Day/Invert та світло.',
        'Змінюйте лише перемикачі освітлення. Нагрів, охолодження, повітря, їжа та фільтрація зберігають свої датчики. Порівняйте зміну розкладу з паузою: пауза зупиняє рибок, датчики й добу разом, а XOR змінює тільки лампу.',
        'Увімкніть Unsafe light always on=1 довше ніж на 1,5 повного циклу dayLength безперервного світла (90 секунд при початковому dayLength=60). Далі Health зменшується, рибки не гинуть миттєво. Поверніть обхід у 0 для відновлення живих; Reset process починає нову популяцію.',
      ],
    },
    questions: {
      en: [
        'Which XOR input makes the schedule act like a wire, and which like NOT?',
        'Why does forced light override both schedule choices?',
        'Why should death remain recorded after a faulty command is corrected?',
      ],
      ua: [
        'Який вхід XOR перетворює розклад на дріт, а який — на НЕ?',
        'Чому примусове світло обходить обидва розклади?',
        'Чому смерть лишається зафіксованою після виправлення команди?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your tested circuit.',
        'A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою.',
        'Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.',
      ],
    },
  },
};
