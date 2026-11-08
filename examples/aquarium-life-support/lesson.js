export default {
  id: 'aquarium-life-support',
  label: 'Aquarium: life-support interlocks',
  ua: 'Акваріум: життєзабезпечення',
  category: 'automation',
  level: 'intermediate',
  description:
    'Keep fish alive with temperature, oxygen and water-quality feedback; compare a denied actuator with a stuck relay.',
  descriptionUa:
    'Підтримуйте життя рибок за температурою, киснем і чистотою; порівняйте відсутність дозволу та залипле реле.',
  lesson: {
    en: {
      goal: 'Keep fish alive with temperature, oxygen and water-quality feedback; compare a denied actuator with a stuck relay.',
      steps: [
        {
          title: 'Observe independent feedback loops',
          text: 'Leave Air pump permitted=1 and Unsafe stuck heater=0. Open the aquarium in 3D and observe Temperature, Oxygen, Cleanliness, Health and Alive across a full 60-second day. Cold starts heating, Hot starts cooling, Low oxygen requests air and Dirty requests filtration.',
          nodes: ['world', 'heat', 'cool', 'air'],
        },
        {
          title: 'Deny the oxygen request',
          text: 'Set Air pump permitted=0. The AND gate prevents the pump even when Low oxygen=1. Watch oxygen fall first, then health. Restore permission before all fish die; surviving fish can recover, but dead fish stay belly-up with X eyes until Reset process.',
          nodes: ['air-permit', 'air', 'world'],
        },
        {
          title: 'Compare a stuck heater and recover',
          text: 'Pulse Reset process after restoring air. Turn Unsafe stuck heater=1: it forces heat and denies automatic cooling. Temperature must rise before health deteriorates. Turn the fault off, then pulse Reset process; confirm Alive returns to fishCount and Health to its initial value.',
          nodes: ['unsafe-heat', 'heat-ok', 'heat', 'reset'],
        },
      ],
      expected:
        'With feedback and permission enabled, all four fish survive repeated days. Denied air or forced heat changes a measured condition before harming fish; removing a fault cannot revive an already dead fish without reset.',
    },
    ua: {
      goal: 'Підтримуйте життя рибок за температурою, киснем і чистотою; порівняйте відсутність дозволу та залипле реле.',
      steps: [
        {
          title: 'Спостерігайте незалежні контури',
          text: 'Лишіть Air pump permitted=1 і Unsafe stuck heater=0. У 3D спостерігайте Temperature, Oxygen, Cleanliness, Health та Alive протягом 60-секундної доби. Cold вмикає нагрів, Hot — охолодження, Low oxygen — повітря, Dirty — фільтр.',
          nodes: ['world', 'heat', 'cool', 'air'],
        },
        {
          title: 'Заблокуйте запит кисню',
          text: 'Встановіть Air pump permitted=0. І блокує помпу навіть при Low oxygen=1. Спершу падає кисень, далі здоров’я. Поверніть дозвіл до загибелі всіх рибок; живі відновлюються, мертві лишаються догори черевом з X до Reset process.',
          nodes: ['air-permit', 'air', 'world'],
        },
        {
          title: 'Порівняйте залиплий нагрівач і відновіть',
          text: 'Після дозволу повітря подайте імпульс Reset process. Unsafe stuck heater=1 примусово гріє й вимикає автоматичне охолодження. До падіння здоров’я має зрости температура. Приберіть несправність, подайте Reset process і перевірте Alive=fishCount та початкове Health.',
          nodes: ['unsafe-heat', 'heat-ok', 'heat', 'reset'],
        },
      ],
      expected:
        'За правильного керування й дозволів усі чотири рибки переживають багато діб. Відсутність повітря чи примусовий нагрів спершу змінюють вимірювану умову; усунення несправності не оживляє загиблих без скидання.',
    },
  },
  circuitPath: 'examples/aquarium-life-support/circuit.json',
  labPath: 'examples/aquarium-life-support/README.md',
  lab: {
    duration: 35,
    objectives: {
      en: [
        'Keep fish alive with temperature, oxygen and water-quality feedback; compare a denied actuator with a stuck relay.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Підтримуйте життя рибок за температурою, киснем і чистотою; порівняйте відсутність дозволу та залипле реле.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Leave Air pump permitted=1 and Unsafe stuck heater=0. Open the aquarium in 3D and observe Temperature, Oxygen, Cleanliness, Health and Alive across a full 60-second day. Cold starts heating, Hot starts cooling, Low oxygen requests air and Dirty requests filtration.',
        'Set Air pump permitted=0. The AND gate prevents the pump even when Low oxygen=1. Watch oxygen fall first, then health. Restore permission before all fish die; surviving fish can recover, but dead fish stay belly-up with X eyes until Reset process.',
        'Pulse Reset process after restoring air. Turn Unsafe stuck heater=1: it forces heat and denies automatic cooling. Temperature must rise before health deteriorates. Turn the fault off, then pulse Reset process; confirm Alive returns to fishCount and Health to its initial value.',
      ],
      ua: [
        'Лишіть Air pump permitted=1 і Unsafe stuck heater=0. У 3D спостерігайте Temperature, Oxygen, Cleanliness, Health та Alive протягом 60-секундної доби. Cold вмикає нагрів, Hot — охолодження, Low oxygen — повітря, Dirty — фільтр.',
        'Встановіть Air pump permitted=0. І блокує помпу навіть при Low oxygen=1. Спершу падає кисень, далі здоров’я. Поверніть дозвіл до загибелі всіх рибок; живі відновлюються, мертві лишаються догори черевом з X до Reset process.',
        'Після дозволу повітря подайте імпульс Reset process. Unsafe stuck heater=1 примусово гріє й вимикає автоматичне охолодження. До падіння здоров’я має зрости температура. Приберіть несправність, подайте Reset process і перевірте Alive=fishCount та початкове Health.',
      ],
    },
    questions: {
      en: [
        'Why can Low oxygen be high while the air pump is off?',
        'How does a stuck relay differ from an incorrect sensor threshold?',
        'Which measurements predict harm before Alive decreases?',
      ],
      ua: [
        'Чому Low oxygen може бути 1 при вимкненій помпі?',
        'Чим залипле реле відрізняється від неправильного порогу датчика?',
        'Які вимірювання попереджають про шкоду до зменшення Alive?',
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
