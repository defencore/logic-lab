export default {
  id: 'yard-security',
  label: 'Smart yard: access, rain and water',
  ua: 'Розумне подвір’я: доступ, дощ і вода',
  category: 'automation',
  level: 'intermediate',
  description:
    'Qualify gate access with authorization and protect irrigation against rain and an empty supply tank.',
  descriptionUa:
    'Дозволяйте ворота лише авторизованому відвідувачу й захищайте полив від дощу та порожнього бака.',
  lesson: {
    en: {
      goal: 'Qualify gate access with authorization and protect irrigation against rain and an empty supply tank.',
      steps: [
        {
          title: 'Admit an authorized visitor',
          text: 'Keep Visitor authorized=1. At the periodic Motion request, the AND gate opens the sliding gate over time; Gate open confirms the completed travel. Outdoor lights need Dark AND Motion. Authorization is a circuit switch, while Motion and Rain come from the simulated environment.',
          nodes: ['authorized', 'gate', 'light', 'world'],
        },
        {
          title: 'Reject unauthorized motion',
          text: 'Set Visitor authorized=0 before the next motion window. Gate is denied and NOT Authorized arms the alarm. Motion now raises Alarm while the gate is closed. Restore authorization and distinguish a current security alarm from a latched empty-tank fault.',
          nodes: ['authorized', 'armed', 'gate', 'alarm'],
        },
        {
          title: 'Protect water and test a bypass',
          text: 'Irrigation requires permission AND NOT Rain AND NOT Tank low. Rain refills the supply tank while stopping guarded irrigation. To test a dry pump quickly, pause, set initialWater=0 in the home inspector, then resume and set Unsafe dry-pump bypass=1. The safe path stays off; the bypass latches a dry-pump alarm. Remove it, restore initialWater=70 and reset.',
          nodes: ['water-permit', 'weather-safe', 'water', 'force-pump', 'pump', 'reset'],
        },
      ],
      expected:
        'Authorized motion opens a real gate; unauthorized motion keeps it closed and triggers security. Guarded irrigation stops during rain or low water; a deliberate bypass can still run an empty pump and record a fault.',
    },
    ua: {
      goal: 'Дозволяйте ворота лише авторизованому відвідувачу й захищайте полив від дощу та порожнього бака.',
      steps: [
        {
          title: 'Пропустіть дозволеного відвідувача',
          text: 'Лишіть Visitor authorized=1. Періодичний Motion через І поступово відкриває ворота; Gate open підтверджує завершений хід. Ліхтарі потребують Dark І Motion. Дозвіл — перемикач схеми, Motion та Rain — модельне довкілля.',
          nodes: ['authorized', 'gate', 'light', 'world'],
        },
        {
          title: 'Відхиліть недозволений рух',
          text: 'Встановіть Visitor authorized=0 перед наступним вікном руху. Ворота заблоковано, NOT Authorized вмикає охорону. Motion піднімає Alarm при закритих воротах. Поверніть дозвіл та відрізніть поточну охоронну тривогу від запам’ятаної несправності порожнього бака.',
          nodes: ['authorized', 'armed', 'gate', 'alarm'],
        },
        {
          title: 'Захистіть воду та перевірте обхід',
          text: 'Полив вимагає дозволу І NOT Rain І NOT Tank low. Дощ поповнює бак і блокує захищений полив. Для швидкого досліду паузою задайте initialWater=0 в інспекторі будинку, продовжте та ввімкніть Unsafe dry-pump bypass=1. Безпечний шлях вимкнений, обхід запам’ятовує тривогу сухого насоса. Приберіть обхід, поверніть initialWater=70 та скиньте.',
          nodes: ['water-permit', 'weather-safe', 'water', 'force-pump', 'pump', 'reset'],
        },
      ],
      expected:
        'Дозволений рух відкриває справжні ворота; недозволений лишає їх закритими та викликає охорону. Захищений полив зупиняється за дощу чи браку води; навмисний обхід може запустити сухий насос і зафіксувати несправність.',
    },
  },
  circuitPath: 'examples/yard-security/circuit.json',
  labPath: 'examples/yard-security/README.md',
  lab: {
    duration: 40,
    objectives: {
      en: [
        'Qualify gate access with authorization and protect irrigation against rain and an empty supply tank.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Дозволяйте ворота лише авторизованому відвідувачу й захищайте полив від дощу та порожнього бака.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Keep Visitor authorized=1. At the periodic Motion request, the AND gate opens the sliding gate over time; Gate open confirms the completed travel. Outdoor lights need Dark AND Motion. Authorization is a circuit switch, while Motion and Rain come from the simulated environment.',
        'Set Visitor authorized=0 before the next motion window. Gate is denied and NOT Authorized arms the alarm. Motion now raises Alarm while the gate is closed. Restore authorization and distinguish a current security alarm from a latched empty-tank fault.',
        'Irrigation requires permission AND NOT Rain AND NOT Tank low. Rain refills the supply tank while stopping guarded irrigation. To test a dry pump quickly, pause, set initialWater=0 in the home inspector, then resume and set Unsafe dry-pump bypass=1. The safe path stays off; the bypass latches a dry-pump alarm. Remove it, restore initialWater=70 and reset.',
      ],
      ua: [
        'Лишіть Visitor authorized=1. Періодичний Motion через І поступово відкриває ворота; Gate open підтверджує завершений хід. Ліхтарі потребують Dark І Motion. Дозвіл — перемикач схеми, Motion та Rain — модельне довкілля.',
        'Встановіть Visitor authorized=0 перед наступним вікном руху. Ворота заблоковано, NOT Authorized вмикає охорону. Motion піднімає Alarm при закритих воротах. Поверніть дозвіл та відрізніть поточну охоронну тривогу від запам’ятаної несправності порожнього бака.',
        'Полив вимагає дозволу І NOT Rain І NOT Tank low. Дощ поповнює бак і блокує захищений полив. Для швидкого досліду паузою задайте initialWater=0 в інспекторі будинку, продовжте та ввімкніть Unsafe dry-pump bypass=1. Безпечний шлях вимкнений, обхід запам’ятовує тривогу сухого насоса. Приберіть обхід, поверніть initialWater=70 та скиньте.',
      ],
    },
    questions: {
      en: [
        'Why is Gate open feedback different from a Gate command?',
        'Which input combinations deny irrigation even when permission=1?',
        'Why should a manual pump bypass be placed before protection in a safer redesign?',
      ],
      ua: [
        'Чому підтвердження Gate open відрізняється від команди Gate?',
        'Які входи блокують полив навіть при дозволі 1?',
        'Чому безпечніше поставити ручний обхід перед захистом насоса?',
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
