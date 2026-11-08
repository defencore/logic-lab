// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A crossroad process moves real simulated cars according to two-axis signal commands, exposing queues and a latched collision for feedback experiments.',
    'Процес перехрестя рухає змодельовані машини за сигналами двох напрямків і показує черги та запам’ятоване зіткнення для дослідів керування.',
  ],
  steps: [
    [
      'Connect mutually exclusive NS_GREEN and EW_GREEN commands and amber clearance phases. Red/amber stops the complete car nose before its stop line and zebra; already admitted vehicles continue through.',
      'Підключіть взаємно виключні NS_GREEN та EW_GREEN і жовті інтервали очищення. Червоний/жовтий зупиняє всю передню частину машини до лінії й зебри; допущені машини продовжують рух.',
    ],
    [
      'Use a counter/decoder for green, amber, opposite green, opposite amber. Set carSpeed=12 meters/second, arrivalInterval=4 seconds and initialCars=2 per axis for the supplied laboratory.',
      'Використайте лічильник і декодер для зеленого, жовтого, протилежного зеленого та жовтого. Для лабораторної задайте carSpeed=12 м/с, arrivalInterval=4 с та initialCars=2 на напрямок.',
    ],
    [
      'Drive RUN=1 and RESET=0, open the junction scene in 3D and observe cars, waiting traffic and PASSED. Pulse RESET after removing a deliberately unsafe override.',
      'Задайте RUN=1 та RESET=0, відкрийте перехрестя в 3D і спостерігайте машини, черги та PASSED. Подавайте RESET після усунення навмисного небезпечного обходу.',
    ],
  ],
  experiment: [
    'Run the four-phase laboratory safely, then reset and force both green directions at the starting phase. The vehicles can physically meet in the conflict area.',
    'Запустіть правильні чотири фази, потім скиньте й увімкніть обидва зелені в початковій фазі. Машини можуть фізично зустрітися в зоні конфлікту.',
  ],
  expected: [
    'Safe phases keep stopped noses behind the zebra, preserve body-length queue gaps and increase PASSED. CRASH latches only when actual vehicle footprints contact, then clears with RESET; simultaneous green alone is not a collision.',
    'Правильні фази тримають передні частини до зебри, зберігають проміжки між кузовами й збільшують PASSED. CRASH запам’ятовується лише при контакті реальних габаритів і скидається RESET; сам одночасний зелений не є зіткненням.',
  ],
  pitfalls: [
    [
      'Exclusive green signals still need enough yellow or all-red clearance for existing cars. Raising carSpeed or shortening phases can invalidate a previously safe timing plan.',
      'Навіть взаємно виключні зелені потребують достатнього жовтого чи всечервоного інтервалу. Зміна carSpeed або скорочення фаз може зіпсувати попередній безпечний цикл.',
    ],
    [
      'RUN=0 pauses this process, not the whole circuit. RESET restores initialCars and clears collision history; remove the unsafe command before releasing it.',
      'RUN=0 зупиняє цей процес, а не всю схему. RESET відновлює initialCars і стирає аварію; усуньте небезпечну команду перед відпусканням.',
    ],
  ],
  inputs: {
    ns_green: [
      'NS_GREEN: grants north/south traffic permission to enter the junction.',
      'NS_GREEN: дозволяє транспортові північ/південь в’їжджати на перехрестя.',
    ],
    ns_yellow: [
      'NS_YELLOW: displays north/south caution and stops new entries.',
      'NS_YELLOW: жовтий північ/південь, який зупиняє нові в’їзди.',
    ],
    ew_green: [
      'EW_GREEN: grants east/west traffic permission; simultaneous opposing greens can cause a collision.',
      'EW_GREEN: дозволяє схід/захід; одночасні зелені напрямків можуть спричинити зіткнення.',
    ],
    ew_yellow: [
      'EW_YELLOW: displays east/west caution and stops new entries.',
      'EW_YELLOW: жовтий схід/захід, який зупиняє нові в’їзди.',
    ],
    run: [
      'RUN: high advances traffic; low holds process positions and arrivals. Unwired defaults high.',
      'RUN: 1 рухає транспорт, 0 утримує позиції та надходження. Без дроту активний.',
    ],
    reset: [
      'RESET: active-high reset of cars, counters and the latched crash.',
      'RESET: активне скидання машин, лічильників і запам’ятованої аварії.',
    ],
  },
  outputs: {
    ns_wait: [
      'NS_WAIT: one-bit flag; 1 means north/south vehicles are queued and waiting.',
      'NS_WAIT: однобітний прапорець; 1 означає чергу машин північ/південь.',
    ],
    ew_wait: [
      'EW_WAIT: one-bit flag; 1 means east/west vehicles are queued and waiting.',
      'EW_WAIT: однобітний прапорець; 1 означає чергу машин схід/захід.',
    ],
    crash: [
      'CRASH: latched collision bit, cleared only by RESET.',
      'CRASH: запам’ятований біт зіткнення до RESET.',
    ],
    passed: [
      'PASSED: eight-bit count of successfully cleared vehicles.',
      'PASSED: восьмибітна кількість машин, що успішно виїхали.',
    ],
  },
  examples: ['traffic-junction', 'traffic-light'],
};
