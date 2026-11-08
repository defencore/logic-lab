export default {
  id: 'greenhouse-climate',
  label: 'Greenhouse: climate and growth',
  ua: 'Теплиця: клімат і ріст',
  category: 'automation',
  level: 'intermediate',
  description:
    'Maintain a plant-growing climate with mutually exclusive temperature requests and inspect delayed damage after a heater fault.',
  descriptionUa:
    'Підтримуйте клімат росту взаємно узгодженими температурними запитами та дослідіть відкладену шкоду несправного нагрівача.',
  lesson: {
    en: {
      goal: 'Maintain a plant-growing climate with mutually exclusive temperature requests and inspect delayed damage after a heater fault.',
      steps: [
        {
          title: 'Observe a full greenhouse day',
          text: 'Open the greenhouse in 3D. Cold below 18°C requests heating; Hot above 28°C requests ventilation. Dry requests irrigation, while Dark turns on grow lights. Watch Temperature, Moisture, Growth and Health for a complete day instead of judging the plants from one frame.',
          nodes: ['world', 'heat-safe', 'vent'],
        },
        {
          title: 'Explain the interlocks',
          text: 'Keep Unsafe heater stuck on=0 and inspect Cold AND not hot. Write the conditions under which heat and ventilation can run. Follow the output wires back to the same greenhouse sensors and explain why a manual source alone cannot know the current temperature.',
          nodes: ['not-hot', 'heat-safe', 'no-fault', 'vent'],
        },
        {
          title: 'Inspect gradual overheating',
          text: 'Turn Unsafe heater stuck on=1. Heat remains commanded and ventilation is denied, so temperature rises before Health falls and plants wilt. Restore the switch to 0; surviving plants can recover. Pulse Reset process to compare another fault from the original temperature and moisture.',
          nodes: ['unsafe-heat', 'heat', 'world', 'reset'],
        },
      ],
      expected:
        'Feedback keeps temperature and moisture in useful bands while plants grow. A failed heat command changes temperature and then plant health; a correct heater request cannot be inferred from elapsed time alone.',
    },
    ua: {
      goal: 'Підтримуйте клімат росту взаємно узгодженими температурними запитами та дослідіть відкладену шкоду несправного нагрівача.',
      steps: [
        {
          title: 'Спостерігайте повну добу',
          text: 'Відкрийте теплицю в 3D. Cold нижче 18°C просить нагрів, Hot вище 28°C — вентиляцію. Dry просить полив, Dark вмикає лампи. Стежте за Temperature, Moisture, Growth та Health повну добу замість оцінки за одним кадром.',
          nodes: ['world', 'heat-safe', 'vent'],
        },
        {
          title: 'Поясніть взаємні блокування',
          text: 'Лишіть Unsafe heater stuck on=0 і перевірте Cold І not hot. Запишіть умови нагріву й вентиляції. Простежте дроти до датчиків тієї самої теплиці та поясніть, чому ручне джерело не знає поточної температури.',
          nodes: ['not-hot', 'heat-safe', 'no-fault', 'vent'],
        },
        {
          title: 'Дослідіть поступовий перегрів',
          text: 'Увімкніть Unsafe heater stuck on=1. Нагрів триває, вентиляція заблокована, тому спочатку росте температура, потім падає Health і рослини в’януть. Вимкніть несправність; живі рослини відновлюються. Reset process повертає початкові температуру й вологість для наступного досліду.',
          nodes: ['unsafe-heat', 'heat', 'world', 'reset'],
        },
      ],
      expected:
        'Зворотний зв’язок утримує корисні смуги температури й вологи, поки рослини ростуть. Залиплий нагрів спершу змінює температуру, далі здоров’я; правильну команду не можна визначити лише за часом.',
    },
  },
  circuitPath: 'examples/greenhouse-climate/circuit.json',
  labPath: 'examples/greenhouse-climate/README.md',
  lab: {
    duration: 35,
    objectives: {
      en: [
        'Maintain a plant-growing climate with mutually exclusive temperature requests and inspect delayed damage after a heater fault.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Підтримуйте клімат росту взаємно узгодженими температурними запитами та дослідіть відкладену шкоду несправного нагрівача.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Open the greenhouse in 3D. Cold below 18°C requests heating; Hot above 28°C requests ventilation. Dry requests irrigation, while Dark turns on grow lights. Watch Temperature, Moisture, Growth and Health for a complete day instead of judging the plants from one frame.',
        'Keep Unsafe heater stuck on=0 and inspect Cold AND not hot. Write the conditions under which heat and ventilation can run. Follow the output wires back to the same greenhouse sensors and explain why a manual source alone cannot know the current temperature.',
        'Turn Unsafe heater stuck on=1. Heat remains commanded and ventilation is denied, so temperature rises before Health falls and plants wilt. Restore the switch to 0; surviving plants can recover. Pulse Reset process to compare another fault from the original temperature and moisture.',
      ],
      ua: [
        'Відкрийте теплицю в 3D. Cold нижче 18°C просить нагрів, Hot вище 28°C — вентиляцію. Dry просить полив, Dark вмикає лампи. Стежте за Temperature, Moisture, Growth та Health повну добу замість оцінки за одним кадром.',
        'Лишіть Unsafe heater stuck on=0 і перевірте Cold І not hot. Запишіть умови нагріву й вентиляції. Простежте дроти до датчиків тієї самої теплиці та поясніть, чому ручне джерело не знає поточної температури.',
        'Увімкніть Unsafe heater stuck on=1. Нагрів триває, вентиляція заблокована, тому спочатку росте температура, потім падає Health і рослини в’януть. Вимкніть несправність; живі рослини відновлюються. Reset process повертає початкові температуру й вологість для наступного досліду.',
      ],
    },
    questions: {
      en: [
        'Why are Cold and Hot allowed to be zero together?',
        'How does daylight affect temperature and artificial lighting?',
        'Which trace distinguishes an actuator fault from an insufficient light schedule?',
      ],
      ua: [
        'Чому Cold і Hot можуть одночасно бути нулями?',
        'Як день впливає на температуру та штучне світло?',
        'Який графік відрізнить несправність механізму від недостатнього освітлення?',
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
