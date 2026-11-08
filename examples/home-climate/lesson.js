export default {
  id: 'home-climate',
  label: 'Smart home: comfort and energy',
  ua: 'Розумний будинок: комфорт та енергія',
  category: 'automation',
  level: 'beginner',
  description:
    'Combine temperature demand with a user permission and compare scheduled indoor lighting with motion-qualified outdoor lighting.',
  descriptionUa:
    'Поєднайте температурний запит із дозволом користувача та порівняйте нічне освітлення кімнат і світло подвір’я за рухом.',
  lesson: {
    en: {
      goal: 'Combine temperature demand with a user permission and compare scheduled indoor lighting with motion-qualified outdoor lighting.',
      steps: [
        {
          title: 'Separate request and permission',
          text: 'Keep Climate enabled=1 and Manual all lights=0. Cold below 19°C starts heat, while Hot above 25°C starts the fan. Set Climate enabled=0: a sensor may still request action, but AND prevents both climate actuators. Temperature then drifts toward ambientTemperature. The fan exchanges heat with outside air; it cannot cool below ambientTemperature and may warm a colder house.',
          nodes: ['comfort', 'heat', 'fan', 'world'],
        },
        {
          title: 'Compare two lighting policies',
          text: 'The home clock produces day/night and two motion windows each 60-second day. Indoor Light follows Dark; Outdoor Light requires Dark AND Motion. Record all four input combinations for the outdoor AND gate and compare visible windows and path lights.',
          nodes: ['lights', 'path', 'world'],
        },
        {
          title: 'Measure the cost of an override',
          text: 'Run one full day and record Energy. Reset process, set Manual all lights=1 and run the same duration. Compare Energy at equal simulated times, not equal camera views. Restore manual lights=0 and Climate enabled=1 after the experiment.',
          nodes: ['force-lights', 'lights', 'reset', 'world'],
        },
      ],
      expected:
        'Temperature requests require permission. Outdoor lights operate only during dark motion, and a full-day indoor-light override consumes more modeled energy than the normal night schedule.',
    },
    ua: {
      goal: 'Поєднайте температурний запит із дозволом користувача та порівняйте нічне освітлення кімнат і світло подвір’я за рухом.',
      steps: [
        {
          title: 'Відокремте запит від дозволу',
          text: 'Лишіть Climate enabled=1 і Manual all lights=0. Cold нижче 19°C запускає нагрів, Hot вище 25°C — вентилятор. Climate enabled=0 через І блокує механізми навіть за активного датчика. Температура наближається до ambientTemperature. Вентилятор обмінюється теплом із зовнішнім повітрям, не охолоджує нижче ambientTemperature та може нагрівати холодніший будинок.',
          nodes: ['comfort', 'heat', 'fan', 'world'],
        },
        {
          title: 'Порівняйте дві політики освітлення',
          text: 'Годинник будинку створює день/ніч і два вікна руху за 60-секундну добу. Світло кімнат повторює Dark, подвір’я вимагає Dark І Motion. Запишіть чотири комбінації входів І та порівняйте вікна й ліхтарі.',
          nodes: ['lights', 'path', 'world'],
        },
        {
          title: 'Виміряйте ціну обходу',
          text: 'Проженіть добу та запишіть Energy. Подайте Reset process, увімкніть Manual all lights=1 і повторіть таку саму тривалість. Порівнюйте Energy при однаковому модельному часі, а не ракурсі. Після досліду поверніть manual lights=0 та Climate enabled=1.',
          nodes: ['force-lights', 'lights', 'reset', 'world'],
        },
      ],
      expected:
        'Температурні запити вимагають дозволу. Ліхтарі працюють лише за нічного руху, а постійне освітлення кімнат за повну добу витрачає більше модельної енергії, ніж звичайний нічний розклад.',
    },
  },
  circuitPath: 'examples/home-climate/circuit.json',
  labPath: 'examples/home-climate/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Combine temperature demand with a user permission and compare scheduled indoor lighting with motion-qualified outdoor lighting.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Поєднайте температурний запит із дозволом користувача та порівняйте нічне освітлення кімнат і світло подвір’я за рухом.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Keep Climate enabled=1 and Manual all lights=0. Cold below 19°C starts heat, while Hot above 25°C starts the fan. Set Climate enabled=0: a sensor may still request action, but AND prevents both climate actuators. Temperature then drifts toward ambientTemperature. The fan exchanges heat with outside air; it cannot cool below ambientTemperature and may warm a colder house.',
        'The home clock produces day/night and two motion windows each 60-second day. Indoor Light follows Dark; Outdoor Light requires Dark AND Motion. Record all four input combinations for the outdoor AND gate and compare visible windows and path lights.',
        'Run one full day and record Energy. Reset process, set Manual all lights=1 and run the same duration. Compare Energy at equal simulated times, not equal camera views. Restore manual lights=0 and Climate enabled=1 after the experiment.',
      ],
      ua: [
        'Лишіть Climate enabled=1 і Manual all lights=0. Cold нижче 19°C запускає нагрів, Hot вище 25°C — вентилятор. Climate enabled=0 через І блокує механізми навіть за активного датчика. Температура наближається до ambientTemperature. Вентилятор обмінюється теплом із зовнішнім повітрям, не охолоджує нижче ambientTemperature та може нагрівати холодніший будинок.',
        'Годинник будинку створює день/ніч і два вікна руху за 60-секундну добу. Світло кімнат повторює Dark, подвір’я вимагає Dark І Motion. Запишіть чотири комбінації входів І та порівняйте вікна й ліхтарі.',
        'Проженіть добу та запишіть Energy. Подайте Reset process, увімкніть Manual all lights=1 і повторіть таку саму тривалість. Порівнюйте Energy при однаковому модельному часі, а не ракурсі. Після досліду поверніть manual lights=0 та Climate enabled=1.',
      ],
    },
    questions: {
      en: [
        'Why is an enabled climate system sometimes idle?',
        'What distinguishes indoor OR logic from outdoor AND logic?',
        'Why must energy trials start from reset and use equal durations?',
      ],
      ua: [
        'Чому дозволене кліматичне керування іноді неактивне?',
        'Чим відрізняються АБО для кімнат та І для подвір’я?',
        'Чому енергодосліди потребують скидання й однакових тривалостей?',
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
