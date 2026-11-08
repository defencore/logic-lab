export default {
  id: 'aquarium-feeding',
  label: 'Aquarium: timed portions',
  ua: 'Акваріум: порційне годування',
  category: 'automation',
  level: 'intermediate',
  description:
    'Combine a clock, one-shot and hunger interlock so timed feeding cannot become continuous overfeeding.',
  descriptionUa:
    'Поєднайте генератор, одновібратор і захист за голодом, щоб порційне годування не перетворилося на безперервне.',
  lesson: {
    en: {
      goal: 'Combine a clock, one-shot and hunger interlock so timed feeding cannot become continuous overfeeding.',
      steps: [
        {
          title: 'Follow one portion',
          text: 'Leave Unsafe continuous feeding=0. The 0.25 Hz clock triggers a one-second pulse every four seconds. Only Hungry AND portion pulse reaches Feed, so a scheduled pulse is denied when fish have enough food. Observe Food and the falling edges of the actual Feed command.',
          nodes: ['meal-clock', 'portion', 'hungry-portion', 'world'],
        },
        {
          title: 'Change timing while preserving the guard',
          text: 'Change the meal clock to 0.125 Hz, then restore 0.25 Hz. The spacing doubles, while the one-shot still limits each requested portion to one second and Hungry can end it earlier. Compare the minimum food level and explain the required average supply.',
          nodes: ['meal-clock', 'portion', 'hungry-portion'],
        },
        {
          title: 'Observe overfeeding and reset',
          text: 'Turn Unsafe continuous feeding=1. This OR bypasses hunger and pulse duration, so Food rises above its safe band and prolonged overfeeding harms fish. Turn the override off, restore the original clock and pulse Reset process before comparing another design.',
          nodes: ['force-feed', 'feed', 'world', 'reset'],
        },
      ],
      expected:
        'Food is replenished in short, hunger-qualified portions. The original one-second/four-second schedule supplies enough food in this accelerated model; the unsafe override produces sustained excess instead of another timed portion.',
    },
    ua: {
      goal: 'Поєднайте генератор, одновібратор і захист за голодом, щоб порційне годування не перетворилося на безперервне.',
      steps: [
        {
          title: 'Прослідкуйте порцію',
          text: 'Лишіть Unsafe continuous feeding=0. Такт 0.25 Гц запускає секундний імпульс кожні чотири секунди. Лише Hungry І portion pulse надходить на Feed, тому розклад не годує ситих рибок. Спостерігайте Food і спадання реальної команди Feed.',
          nodes: ['meal-clock', 'portion', 'hungry-portion', 'world'],
        },
        {
          title: 'Змініть розклад зі збереженням захисту',
          text: 'Задайте такт 0.125 Гц, потім поверніть 0.25 Гц. Інтервал подвоюється, одновібратор і далі обмежує порцію секундою, а Hungry може завершити її раніше. Порівняйте мінімум Food і поясніть потрібне середнє подавання.',
          nodes: ['meal-clock', 'portion', 'hungry-portion'],
        },
        {
          title: 'Спостерігайте переїдання та скидання',
          text: 'Увімкніть Unsafe continuous feeding=1. АБО обходить голод та тривалість імпульсу, тому Food виходить за безпечну смугу, а тривале переїдання шкодить рибкам. Вимкніть обхід, поверніть такт і подайте Reset process перед іншим дослідом.',
          nodes: ['force-feed', 'feed', 'world', 'reset'],
        },
      ],
      expected:
        'Їжа додається короткими порціями лише за голодом. Початковий розклад секунда на чотири секунди дає достатньо їжі в прискореній моделі; небезпечний обхід створює тривалий надлишок замість нової порції.',
    },
  },
  circuitPath: 'examples/aquarium-feeding/circuit.json',
  labPath: 'examples/aquarium-feeding/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Combine a clock, one-shot and hunger interlock so timed feeding cannot become continuous overfeeding.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Поєднайте генератор, одновібратор і захист за голодом, щоб порційне годування не перетворилося на безперервне.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Leave Unsafe continuous feeding=0. The 0.25 Hz clock triggers a one-second pulse every four seconds. Only Hungry AND portion pulse reaches Feed, so a scheduled pulse is denied when fish have enough food. Observe Food and the falling edges of the actual Feed command.',
        'Change the meal clock to 0.125 Hz, then restore 0.25 Hz. The spacing doubles, while the one-shot still limits each requested portion to one second and Hungry can end it earlier. Compare the minimum food level and explain the required average supply.',
        'Turn Unsafe continuous feeding=1. This OR bypasses hunger and pulse duration, so Food rises above its safe band and prolonged overfeeding harms fish. Turn the override off, restore the original clock and pulse Reset process before comparing another design.',
      ],
      ua: [
        'Лишіть Unsafe continuous feeding=0. Такт 0.25 Гц запускає секундний імпульс кожні чотири секунди. Лише Hungry І portion pulse надходить на Feed, тому розклад не годує ситих рибок. Спостерігайте Food і спадання реальної команди Feed.',
        'Задайте такт 0.125 Гц, потім поверніть 0.25 Гц. Інтервал подвоюється, одновібратор і далі обмежує порцію секундою, а Hungry може завершити її раніше. Порівняйте мінімум Food і поясніть потрібне середнє подавання.',
        'Увімкніть Unsafe continuous feeding=1. АБО обходить голод та тривалість імпульсу, тому Food виходить за безпечну смугу, а тривале переїдання шкодить рибкам. Вимкніть обхід, поверніть такт і подайте Reset process перед іншим дослідом.',
      ],
    },
    questions: {
      en: [
        'Why is a clock alone insufficient protection against overfeeding?',
        'Why can a one-second pulse produce less than one second of actual feeding?',
        'What happens if the average pulse supply becomes lower than consumption?',
      ],
      ua: [
        'Чому одного генератора недостатньо для захисту від переїдання?',
        'Чому секундний імпульс може дати менше секунди справжнього годування?',
        'Що буде, якщо середнє подавання стане меншим за споживання?',
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
