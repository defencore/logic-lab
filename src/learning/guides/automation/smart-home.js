// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Automate a house and yard using logic for climate, occupancy lighting, authorized access and water-saving irrigation. The simulated environment supplies periodic daylight, visitors and rain.',
    'Автоматизуйте будинок і подвір’я логікою клімату, світла за присутністю, дозволеного доступу та ощадного поливу. Модельне довкілля дає періодичні день, відвідувачів і дощ.',
  ],
  steps: [
    [
      'Start with initialTemperature=20 °C, ambientTemperature=12 °C, initialWater=70% and dayLength=60 seconds. Observe the house, sliding gate, water tank and visitor in 3D.',
      'Почніть з initialTemperature=20 °C, ambientTemperature=12 °C, initialWater=70% та dayLength=60 секунд. У 3D спостерігайте будинок, відсувні ворота, бак і відвідувача.',
    ],
    [
      'Gate HEATER with COLD and FAN with HOT. Combine DARK AND MOTION for OUTDOOR LIGHT; an occupancy permission can also control INDOOR LIGHT.',
      'Дозволяйте HEATER за COLD, FAN за HOT. Поєднайте DARK І MOTION для OUTDOOR LIGHT; дозвіл присутності також може керувати INDOOR LIGHT.',
    ],
    [
      'Use MOTION AND authorization for GATE, and NOT authorization for ALARM ARM. Permit SPRINKLER only when NOT RAIN AND NOT TANK LOW. Compare ENERGY and WATER for guarded and unconditional operation.',
      'За MOTION І авторизацією керуйте GATE, за NOT авторизацією — ALARM ARM. Дозволяйте SPRINKLER лише за NOT RAIN І NOT TANK LOW. Порівняйте ENERGY та WATER за захищеної й постійної роботи.',
    ],
  ],
  experiment: [
    'Deny visitor authorization before a motion window and compare gate travel with the current alarm. Then start at initialWater=0 and deliberately bypass the irrigation guard to record a dry-pump fault; restore the level and reset.',
    'Забороніть доступ перед вікном руху та порівняйте переміщення воріт із поточною тривогою. Потім задайте initialWater=0 та навмисно обійдіть захист поливу для несправності сухого насоса; відновіть запас і скиньте.',
  ],
  expected: [
    'The sliding gate takes time to open; GATE OPEN confirms full travel. Rain replenishes the tank, guarded sprinklers stop during rain or low water, and ENERGY accumulates actual actuator use in kWh. Lighting and climate react to circuit outputs.',
    'Відкриття відсувних воріт потребує часу; GATE OPEN підтверджує повний хід. Дощ поповнює бак, захищений полив зупиняється за дощу чи браку води, ENERGY накопичує роботу механізмів у кВт·год. Світло й клімат реагують на схему.',
  ],
  pitfalls: [
    [
      'MOTION, RAIN and DARK are deterministic simulated sensors, not real camera or weather services. A security alarm clears when its current condition ends; a dry-pump fault is remembered until RESET. A gate command does not instantly mean GATE OPEN=1.',
      'MOTION, RAIN і DARK — визначені модельні датчики, не камера чи погодний сервіс. Охоронна тривога зникає з поточною умовою; сухий насос запам’ятовується до RESET. Команда воріт не означає миттєве GATE OPEN=1.',
    ],
  ],
  inputs: {
    heater: [
      'HEATER: 1 heats the home and consumes energy.',
      'HEATER: 1 гріє будинок та витрачає енергію.',
    ],
    fan: [
      'FAN: 1 cools the home and consumes energy.',
      'FAN: 1 охолоджує будинок та витрачає енергію.',
    ],
    indoor_light: [
      'INDOOR LIGHT: 1 turns on the house lamps.',
      'INDOOR LIGHT: 1 вмикає лампи в будинку.',
    ],
    outdoor_light: [
      'OUTDOOR LIGHT: 1 turns on the yard lamps.',
      'OUTDOOR LIGHT: 1 вмикає ліхтарі подвір’я.',
    ],
    gate: [
      'GATE: 1 opens the sliding gate, 0 closes it over time.',
      'GATE: 1 відкриває відсувні ворота, 0 поступово закриває.',
    ],
    sprinkler: [
      'SPRINKLER: 1 requests irrigation and draws from the finite water tank.',
      'SPRINKLER: 1 запитує полив та витрачає скінченний запас бака.',
    ],
    alarm_arm: [
      'ALARM ARM: 1 arms motion detection while the gate is not fully open.',
      'ALARM ARM: 1 вмикає виявлення руху, поки ворота не відкриті повністю.',
    ],
    run: [
      'RUN: 1 advances climate, weather and actuators; 0 pauses.',
      'RUN: 1 рухає клімат, погоду та механізми; 0 призупиняє.',
    ],
    reset: [
      'RESET: 1 restores initial water and temperature and clears energy and alarms.',
      'RESET: 1 відновлює початкові воду й температуру, очищає енергію та тривоги.',
    ],
  },
  outputs: {
    cold: ['COLD: 1 below 19 °C, requesting heating.', 'COLD: 1 нижче 19 °C, запит нагрівання.'],
    hot: ['HOT: 1 above 25 °C, requesting the fan.', 'HOT: 1 вище 25 °C, запит вентилятора.'],
    dark: ['DARK: 1 during the night half of dayLength.', 'DARK: 1 у нічній половині dayLength.'],
    motion: [
      'MOTION: periodic simulated visitor requests during day and night.',
      'MOTION: періодичні модельні відвідувачі вдень і вночі.',
    ],
    rain: [
      'RAIN: periodic rainfall that replenishes the water tank.',
      'RAIN: періодичний дощ, що поповнює водяний бак.',
    ],
    tank_low: [
      'TANK LOW: 1 when the tank contains less than 15% water.',
      'TANK LOW: 1 при запасі води в баку нижче 15%.',
    ],
    gate_open: [
      'GATE OPEN: 1 only after the gate has completed its opening travel.',
      'GATE OPEN: 1 лише після завершення повного відкриття воріт.',
    ],
    alarm: [
      'ALARM: current armed motion alert or a latched empty-tank fault.',
      'ALARM: поточна охоронна тривога руху або запам’ятований порожній бак.',
    ],
    temperature: [
      'TEMP: measured indoor temperature in °C.',
      'TEMP: виміряна температура в будинку у °C.',
    ],
    water: [
      'WATER: available irrigation water from 0 to 100%.',
      'WATER: доступна для поливу вода від 0 до 100%.',
    ],
    energy: [
      'ENERGY: cumulative actuator electricity in kWh since reset.',
      'ENERGY: накопичена електроенергія механізмів у кВт·год від скидання.',
    ],
  },
  examples: ['home-climate', 'yard-security'],
};
