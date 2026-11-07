export default {
  id: 'adc-dac',
  label: 'Digital–analog round trip',
  ua: 'Цифро-аналогове перетворення',
  category: 'mixed',
  level: 'beginner',
  description: 'Convert a byte into voltage and back, then compare the recovered number.',
  descriptionUa: 'Перетворіть байт на напругу й назад та порівняйте відновлене число.',
  lesson: {
    en: {
      goal: 'Connect digital codes to analog voltage using matching converter ranges.',
      steps: [
        {
          title: 'Inspect the round trip',
          text: 'Original byte starts at 128. DAC produces about 2.51 V, ADC recovers 128, and Original = decoded is on.',
          nodes: ['value', 'dac', 'adc', 'equal'],
        },
        {
          title: 'Try the endpoints',
          text: 'Select Original byte and change Value to 0, then 255. The DAC spans 0–5 V; the ADC recovers the same byte. Try intermediate values too.',
          nodes: ['value', 'dac', 'adc', 'compare'],
        },
        {
          title: 'Mismatch the voltage ranges',
          text: 'Restore Value=128, then set the ADC Supply voltage to 2.5 V. Its output saturates at 255 and Original < decoded turns on. Restore ADC supply to 5 V.',
          nodes: ['value', 'adc', 'less'],
        },
      ],
      expected:
        'Matching 5 V converters recover every byte. Different ranges change the code even though the measured voltage is unchanged.',
    },
    ua: {
      goal: 'Пов’яжіть цифрові коди з напругою через однакові діапазони перетворювачів.',
      steps: [
        {
          title: 'Перевірте перетворення',
          text: 'Original byte=128. ЦАП дає близько 2.51 В, АЦП відновлює 128, індикатор Original = decoded світиться.',
          nodes: ['value', 'dac', 'adc', 'equal'],
        },
        {
          title: 'Перевірте межі',
          text: 'Оберіть Original byte і задайте Значення 0, потім 255. ЦАП охоплює 0–5 В; АЦП відновлює той самий байт. Спробуйте проміжні значення.',
          nodes: ['value', 'dac', 'adc', 'compare'],
        },
        {
          title: 'Змініть діапазон АЦП',
          text: 'Поверніть Значення 128 та задайте АЦП Напруга живлення 2.5 В. Його вихід насититься до 255, Original < decoded засвітиться. Поверніть живлення АЦП 5 В.',
          nodes: ['value', 'adc', 'less'],
        },
      ],
      expected:
        'За однакових діапазонів 5 В відновлюється кожен байт. Різні діапазони змінюють код при тій самій напрузі.',
    },
  },
  circuitPath: 'examples/adc-dac/circuit.json',
  labPath: 'examples/adc-dac/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Connect digital codes to analog voltage using matching converter ranges.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Пов’яжіть цифрові коди з напругою через однакові діапазони перетворювачів.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Original byte starts at 128. DAC produces about 2.51 V, ADC recovers 128, and Original = decoded is on.',
        'Select Original byte and change Value to 0, then 255. The DAC spans 0–5 V; the ADC recovers the same byte. Try intermediate values too.',
        'Restore Value=128, then set the ADC Supply voltage to 2.5 V. Its output saturates at 255 and Original < decoded turns on. Restore ADC supply to 5 V.',
      ],
      ua: [
        'Original byte=128. ЦАП дає близько 2.51 В, АЦП відновлює 128, індикатор Original = decoded світиться.',
        'Оберіть Original byte і задайте Значення 0, потім 255. ЦАП охоплює 0–5 В; АЦП відновлює той самий байт. Спробуйте проміжні значення.',
        'Поверніть Значення 128 та задайте АЦП Напруга живлення 2.5 В. Його вихід насититься до 255, Original < decoded засвітиться. Поверніть живлення АЦП 5 В.',
      ],
    },
    questions: {
      en: [
        'What voltage represents code 128 with a 5 V DAC?',
        'Why does the ADC saturate when its range is reduced to 2.5 V?',
        'What does the equality comparator verify?',
      ],
      ua: [
        'Яка напруга відповідає коду 128 при діапазоні ЦАП 5 В?',
        'Чому АЦП насичується при зменшенні діапазону до 2.5 В?',
        'Що перевіряє компаратор рівності?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A conversion table for codes 0, 128 and 255, then the mismatched-range result.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця перетворення кодів 0, 128 та 255 і результат для різних діапазонів.',
      ],
    },
  },
};
