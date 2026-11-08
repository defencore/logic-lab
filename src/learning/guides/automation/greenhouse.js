// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Control a greenhouse using temperature, soil moisture and daylight feedback. Plants grow under suitable conditions and lose health when exposed to cold, heat, drought, flooding or prolonged darkness.',
    'Керуйте теплицею за температурою, вологістю ґрунту та денним світлом. Рослини ростуть за належних умов і втрачають здоров’я від холоду, спеки, посухи, затоплення чи тривалої темряви.',
  ],
  steps: [
    [
      'Set initialTemperature=20 °C, ambientTemperature=12 °C, initialMoisture=45% and dayLength=60 seconds. In 3D locate the heater, roof vent, irrigation and growing plants.',
      'Задайте initialTemperature=20 °C, ambientTemperature=12 °C, initialMoisture=45% та dayLength=60 секунд. У 3D знайдіть нагрівач, кватирку, полив і рослини.',
    ],
    [
      'Use COLD for HEATER and HOT for VENT. Add permission switches through AND and block heating during an excessive-heat request.',
      'За COLD керуйте HEATER, за HOT — VENT. Через І додайте дозволи та блокуйте нагрів за запиту надлишкової температури.',
    ],
    [
      'For irrigation, connect DRY to SR set and WET to reset; drive PUMP with Q and a permission. Use DARK for GROW LIGHT, then observe MOISTURE, GROWTH and HEALTH over several days.',
      'Для поливу підключіть DRY до S, WET до R SR-защіпки; керуйте PUMP виходом Q із дозволом. За DARK вмикайте GROW LIGHT, спостерігайте MOISTURE, GROWTH і HEALTH протягом кількох діб.',
    ],
  ],
  experiment: [
    'Compare direct DRY control with SR hysteresis. Force the pump on or deny watering, and record when wet soil or drought starts harming plants. Restore control and reset for a fresh trial.',
    'Порівняйте пряме керування DRY з гістерезисом SR. Примусово ввімкніть насос або забороніть полив та запишіть початок шкоди від перезволоження чи посухи. Відновіть керування та скиньте для нового досліду.',
  ],
  expected: [
    'A working circuit keeps soil within its chosen band and temperature suitable for growth. The roof vent moves, water spray follows the pump, grow lights illuminate, and plant size and leaf condition follow GROWTH and HEALTH.',
    'Правильна схема тримає вологість у заданому діапазоні та придатну для росту температуру. Кватирка рухається, полив відповідає насосу, лампи світять, а розмір рослин і стан листя відповідають GROWTH та HEALTH.',
  ],
  pitfalls: [
    [
      'DRY and WET are different thresholds, so both are normally 0 inside the middle band. Use a latch to remember whether irrigation is filling that band. Alarm history persists until RESET even when plant health recovers.',
      'DRY та WET мають різні пороги, тому всередині діапазону обидва зазвичай 0. Защіпка запам’ятовує, чи триває наповнення. Історія тривоги лишається до RESET навіть після відновлення здоров’я.',
    ],
  ],
  inputs: {
    heater: ['HEATER: 1 warms the greenhouse air.', 'HEATER: 1 нагріває повітря теплиці.'],
    vent: [
      'VENT: 1 opens ventilation and increases heat exchange with outside air. It cools only when outside is cooler, can warm a colder greenhouse, and increases drying.',
      'VENT: 1 відкриває вентиляцію та посилює теплообмін із зовнішнім повітрям. Охолоджує лише за прохолоднішого довкілля, може нагрівати холоднішу теплицю та посилює висихання.',
    ],
    pump: ['PUMP: 1 continuously irrigates the soil.', 'PUMP: 1 безперервно поливає ґрунт.'],
    grow_light: [
      'GROW LIGHT: 1 supplies artificial light when daylight is absent.',
      'GROW LIGHT: 1 додає штучне світло за відсутності денного.',
    ],
    run: [
      'RUN: 1 advances climate and plant life, 0 pauses; defaults high.',
      'RUN: 1 рухає клімат і життя рослин, 0 призупиняє; типово 1.',
    ],
    reset: [
      'RESET: 1 restores initial temperature, moisture, growth and health.',
      'RESET: 1 відновлює початкові температуру, вологість, ріст і здоров’я.',
    ],
  },
  outputs: {
    cold: ['COLD: 1 below 18 °C; request heating.', 'COLD: 1 нижче 18 °C; запит нагрівання.'],
    hot: ['HOT: 1 above 28 °C; request ventilation.', 'HOT: 1 вище 28 °C; запит вентиляції.'],
    dry: ['DRY: 1 below 35% soil moisture.', 'DRY: 1 при вологості ґрунту нижче 35%.'],
    wet: ['WET: 1 above 75% soil moisture.', 'WET: 1 при вологості ґрунту вище 75%.'],
    dark: ['DARK: 1 during the night half of dayLength.', 'DARK: 1 у нічній половині dayLength.'],
    day: ['DAY: 1 during the daylight half of dayLength.', 'DAY: 1 у денній половині dayLength.'],
    alarm: [
      'ALARM: latched record of plant health falling below 60%.',
      'ALARM: запам’ятоване падіння здоров’я рослин нижче 60%.',
    ],
    temperature: [
      'TEMP: measured greenhouse air temperature in °C.',
      'TEMP: виміряна температура повітря теплиці у °C.',
    ],
    moisture: [
      'MOISTURE: soil moisture from 0 to 100%.',
      'MOISTURE: вологість ґрунту від 0 до 100%.',
    ],
    growth: [
      'GROWTH: accumulated plant growth from 0 to 100%.',
      'GROWTH: накопичений ріст рослин від 0 до 100%.',
    ],
    health: [
      'HEALTH: current plant health from 0 to 100%.',
      'HEALTH: поточне здоров’я рослин від 0 до 100%.',
    ],
  },
  examples: ['greenhouse-climate', 'greenhouse-irrigation'],
};
