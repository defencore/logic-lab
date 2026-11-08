// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A water-tank process turns pump and drain commands into a measured level, exposing low/high switches and a remembered overflow for hysteresis control.',
    'Процес резервуара перетворює команди насоса й зливу на рівень і надає нижній/верхній датчики та пам’ять переливу для гістерезисного керування.',
  ],
  steps: [
    [
      'Set capacity=100 liters and initialLevel=35 percent. Connect a drain switch to DRAIN and a controller output to PUMP, then open the tank in 3D.',
      'Задайте capacity=100 літрів та initialLevel=35 відсотків. Підключіть перемикач зливу до DRAIN і вихід керування до PUMP та відкрийте резервуар у 3D.',
    ],
    [
      'Use LOW to set an SR latch and HIGH to reset it. Set lowThreshold=20 and highThreshold=80 percent; the latch holds the pump decision between these thresholds.',
      'LOW встановлює SR, HIGH скидає її. Задайте lowThreshold=20 та highThreshold=80 відсотків; пам’ять утримує рішення насоса між порогами.',
    ],
    [
      'Set pumpRate=12 liters/second and drainRate=4 liters/second. With both active the net inflow is 8 liters/second. RUN advances the process; RESET restores the initial level and clears overflow history.',
      'Задайте pumpRate=12 л/с та drainRate=4 л/с. При обох активних чистий приплив — 8 л/с. RUN запускає процес; RESET повертає початковий рівень і стирає перелив.',
    ],
  ],
  experiment: [
    'Observe an automatic fill/drain cycle, then bypass the latch with a forced pump and close DRAIN. After spilling, remove the override and pulse RESET to recover.',
    'Спостерігайте автоматичний цикл, потім обійдіть пам’ять примусовим насосом і закрийте DRAIN. Після переливу приберіть обхід та подайте RESET.',
  ],
  expected: [
    'The latch keeps the level near the low/high band without chattering at one threshold. An unchecked pump can reach capacity and spill; OVERFLOW remains high until reset even if the pump is later stopped.',
    'Пам’ять утримує рівень поблизу смуги Low/High без перемикань біля одного порогу. Насос без обмеження досягає місткості й переливає; OVERFLOW тримається до скидання навіть після зупинення насоса.',
  ],
  pitfalls: [
    [
      'LEVEL and thresholds are percentages, while capacity is liters and pumpRate/drainRate are liters per second. Doubling capacity changes the percentage rate at the same flow.',
      'LEVEL та пороги — відсотки, capacity — літри, pumpRate/drainRate — літри за секунду. Подвоєння місткості змінює відсоткову швидкість при тому самому потоці.',
    ],
    [
      'LOW and HIGH can both be zero in the middle band; that is why the controller needs memory. Keep lowThreshold below highThreshold and remove a forced-pump command before resetting.',
      'LOW і HIGH можуть одночасно бути нулями посередині; тому потрібна пам’ять. lowThreshold має бути нижчим за highThreshold; приберіть примусовий насос перед скиданням.',
    ],
  ],
  inputs: {
    pump: [
      'PUMP: high adds water at pumpRate while the process runs.',
      'PUMP: 1 додає воду зі швидкістю pumpRate під час роботи.',
    ],
    drain: [
      'DRAIN: high opens the outlet at drainRate; low closes it.',
      'DRAIN: 1 відкриває злив зі швидкістю drainRate, 0 закриває.',
    ],
    run: [
      'RUN: high advances fill/drain physics; low freezes the process. Unwired defaults high.',
      'RUN: 1 запускає наповнення й злив, 0 зупиняє процес. Без дроту активний.',
    ],
    reset: [
      'RESET: restores initialLevel and clears the latched overflow.',
      'RESET: відновлює initialLevel та очищає запам’ятований перелив.',
    ],
  },
  outputs: {
    low: [
      'LOW: level is at or below lowThreshold, a request to begin filling.',
      'LOW: рівень не вищий за lowThreshold, запит початку наповнення.',
    ],
    high: [
      'HIGH: level is at or above highThreshold, a request to stop filling.',
      'HIGH: рівень не нижчий за highThreshold, запит зупинення наповнення.',
    ],
    overflow: [
      'OVERFLOW: latched record of water spilling beyond capacity.',
      'OVERFLOW: запам’ятований факт переливу за місткість.',
    ],
    level: [
      'LEVEL: current fill percentage, bounded between 0 and 100.',
      'LEVEL: поточний відсоток наповнення в межах від 0 до 100.',
    ],
  },
  examples: ['water-tank'],
};
