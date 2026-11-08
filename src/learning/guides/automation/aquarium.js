// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Build a complete fish life-support controller from logic gates. Temperature, oxygen, food and water quality change continuously; sustained unsafe conditions reduce health and can kill individual fish.',
    'Побудуйте керування життям рибок із логічних елементів. Температура, кисень, корм і чистота змінюються безперервно; тривалі небезпечні умови погіршують здоров’я та можуть убити окремих рибок.',
  ],
  steps: [
    [
      'Start with initialTemperature=24 °C, ambientTemperature=18 °C, initialOxygen=70, initialFood=45, initialCleanliness=80, fishCount=4 and dayLength=60 seconds. Open 3D to watch fish, bubbles, feeding and the thermometer.',
      'Почніть з initialTemperature=24 °C, ambientTemperature=18 °C, initialOxygen=70, initialFood=45, initialCleanliness=80, fishCount=4 і dayLength=60 секунд. Відкрийте 3D та спостерігайте рибок, бульбашки, корм і термометр.',
    ],
    [
      'Connect COLD to HEATER, HOT to COOLER, LOW OXYGEN to AERATOR and DIRTY to FILTER. Qualify each request with a permission switch through AND; use NOT HOT to block unnecessary heating.',
      'Підключіть COLD до HEATER, HOT до COOLER, LOW OXYGEN до AERATOR та DIRTY до FILTER. Через І додайте до запитів перемикачі дозволу; NOT HOT може блокувати зайве нагрівання.',
    ],
    [
      'Use HUNGRY to permit bounded feeding and DAY to schedule LIGHT. RUN=1 advances the ecosystem; pulse RESET and return it to 0 to restore the configured fish and initial quantities.',
      'За HUNGRY дозволяйте обмежену годівлю, за DAY плануйте LIGHT. RUN=1 запускає екосистему; імпульс RESET із поверненням у 0 відновлює заданих рибок і початкові показники.',
    ],
  ],
  experiment: [
    'Deny aerator permission or force the heater or feeder on. Record the changing measurement, declining HEALTH, alarm and ALIVE. Restore safe control before death, then compare with a full RESET after death.',
    'Заблокуйте помпу або примусово ввімкніть нагрівач чи годівницю. Запишіть зміну вимірювання, падіння HEALTH, тривогу й ALIVE. Поверніть безпечне керування до загибелі, потім порівняйте зі скиданням RESET після загибелі.',
  ],
  expected: [
    'Healthy fish swim. Low temperature, excess heat, low oxygen, excess food, starvation, dirt or uninterrupted light cause cumulative harm. Dead fish turn belly-up, show X eyes and float to the surface; surviving fish can recover.',
    'Здорові рибки плавають. Холод, перегрів, брак кисню, надмір корму, голод, бруд чи постійне світло поступово шкодять. Загиблі рибки перевертаються черевом догори, мають очі X та спливають; живі можуть одужати.',
  ],
  pitfalls: [
    [
      'This is an accelerated educational ecosystem: one complete dayLength includes day and night. ALARM remembers damage after health drops below 60; correcting a signal does not revive dead fish or clear that history without RESET.',
      'Це прискорена навчальна екосистема: dayLength охоплює день і ніч. ALARM запам’ятовує шкоду при здоров’ї нижче 60; виправлення сигналу не оживляє загиблих і не очищає історію без RESET.',
    ],
    [
      'FEED is a level-driven actuator, not a one-portion button. Holding it high overfeeds fish; combine HUNGRY with a clock or one-shot. A sensor request and the actual actuator command can differ when permission is denied.',
      'FEED працює весь час одиниці, а не видає одну порцію за натискання. Постійна 1 перегодовує; поєднайте HUNGRY з генератором або одновібратором. Запит датчика й команда механізму можуть відрізнятися через відсутність дозволу.',
    ],
  ],
  inputs: {
    heater: [
      'HEATER: 1 heats water; use COLD and a permission interlock.',
      'HEATER: 1 нагріває воду; використовуйте COLD та дозвіл.',
    ],
    cooler: [
      'COOLER: 1 cools water; use HOT to stop excess heat.',
      'COOLER: 1 охолоджує воду; HOT допомагає прибрати перегрів.',
    ],
    aerator: [
      'AERATOR: 1 runs the oxygen pump and produces visible bubbles.',
      'AERATOR: 1 вмикає кисневу помпу та видимі бульбашки.',
    ],
    feed: [
      'FEED: 1 continuously adds food; pulse it or stop at HUNGRY=0.',
      'FEED: 1 безперервно додає корм; подавайте імпульси або зупиняйте при HUNGRY=0.',
    ],
    light: [
      'LIGHT: 1 lights the aquarium; fish need dark resting periods.',
      'LIGHT: 1 освітлює акваріум; рибкам потрібні темні періоди відпочинку.',
    ],
    filter: [
      'FILTER: 1 cleans the water and rotates the visible filter.',
      'FILTER: 1 очищує воду та обертає видимий фільтр.',
    ],
    water_change: [
      'WATER CHANGE: 1 replenishes oxygen and cleans the water.',
      'WATER CHANGE: 1 поповнює кисень та очищує воду.',
    ],
    run: [
      'RUN: 1 advances time and biology, 0 pauses; unwired defaults to 1.',
      'RUN: 1 рухає час і біологію, 0 призупиняє; без дроту діє 1.',
    ],
    reset: [
      'RESET: high restores configured levels, fish health, life and alarm history.',
      'RESET: 1 відновлює задані рівні, здоров’я, життя рибок та історію тривог.',
    ],
  },
  outputs: {
    cold: ['COLD: 1 below 22 °C, a request for heating.', 'COLD: 1 нижче 22 °C, запит нагрівання.'],
    hot: ['HOT: 1 above 28 °C, a request for cooling.', 'HOT: 1 вище 28 °C, запит охолодження.'],
    low_oxygen: [
      'LOW OXYGEN: 1 below 55% oxygen, a request for air.',
      'LOW OXYGEN: 1 при кисні нижче 55%, запит повітря.',
    ],
    hungry: [
      'HUNGRY: 1 when FOOD is below 35%, a feeding request.',
      'HUNGRY: 1 при FOOD нижче 35%, запит годівлі.',
    ],
    dirty: [
      'DIRTY: 1 below 45% cleanliness; request filtration or fresh water.',
      'DIRTY: 1 при чистоті нижче 45%; потрібен фільтр або свіжа вода.',
    ],
    day: [
      'DAY: 1 in the first half of the simulated dayLength cycle.',
      'DAY: 1 у першій половині модельного циклу dayLength.',
    ],
    alarm: [
      'ALARM: latched record of serious health loss or fish death.',
      'ALARM: запам’ятований значний спад здоров’я або загибель рибок.',
    ],
    alive: [
      'ALIVE: eight-bit count of living fish, from 0 to fishCount.',
      'ALIVE: восьмибітна кількість живих рибок від 0 до fishCount.',
    ],
    temperature: [
      'TEMP: measured water temperature in degrees Celsius.',
      'TEMP: виміряна температура води у градусах Цельсія.',
    ],
    oxygen: [
      'OXYGEN: current oxygen level from 0 to 100%.',
      'OXYGEN: поточний рівень кисню від 0 до 100%.',
    ],
    food: [
      'FOOD: current available food from 0 to 100%; excess is harmful.',
      'FOOD: поточний доступний корм від 0 до 100%; надлишок шкодить.',
    ],
    cleanliness: [
      'CLEANLINESS: water quality from 0 to 100%; higher is cleaner.',
      'CLEANLINESS: якість води від 0 до 100%; більше означає чистіше.',
    ],
    health: [
      'HEALTH: average fish health, including zero health of dead fish.',
      'HEALTH: середнє здоров’я рибок із урахуванням нуля в загиблих.',
    ],
  },
  examples: ['aquarium-life-support', 'aquarium-feeding', 'aquarium-lighting'],
};
