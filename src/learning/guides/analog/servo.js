// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'Four RC-servo channels decode the high duration of actual digital control pulses into angles.',
    'Чотири RC-сервоканали перетворюють тривалість високого рівня справжніх цифрових імпульсів на кути.',
  ],
  steps: [
    [
      'Set MinPulse=1000 µs, CenterPulse=1500 µs, MaxPulse=2000 µs, Range=180° and SignalTimeout=0.1 s before applying commands.',
      'Перед поданням команд задайте MinPulse=1000 мкс, CenterPulse=1500 мкс, MaxPulse=2000 мкс, Range=180° та SignalTimeout=0.1 с.',
    ],
    [
      'Connect a PWM generator PWM output to S1. DUTY is an analog ratio and cannot drive the digital servo input.',
      'Підключіть вихід PWM ШІМ-генератора до S1. DUTY є аналоговою часткою та не підключається до цифрового входу серво.',
    ],
    [
      'Use Frequency=50 Hz and Duty=0.075: each 20 ms period contains a 1500 µs high pulse.',
      'Задайте Frequency=50 Гц і Duty=0.075: кожний період 20 мс містить високий імпульс 1500 мкс.',
    ],
    [
      'Run the simulation until a complete pulse arrives. Set Duty=0.05 for −90°, 0.075 for 0°, and 0.1 for +90° with default calibration.',
      'Запустіть симуляцію й дочекайтеся повного імпульсу. За типової калібровки Duty=0.05 дає −90°, 0.075 — 0°, а 0.1 — +90°.',
    ],
  ],
  experiment: [
    'Change Frequency from 50 to 100 Hz and Duty from 0.075 to 0.15. Both commands have a 1500 µs high duration and must give the same centered angle.',
    'Змініть Frequency з 50 на 100 Гц, а Duty з 0.075 на 0.15. Обидві команди мають високий рівень 1500 мкс і дають однаковий нульовий кут.',
  ],
  expected: [
    'Minimum/center/maximum pulse widths of 1000/1500/2000 µs map to −90°/0°/+90°. A position is valid only after a complete in-range pulse. Signal loss longer than Signal timeout produces X.',
    'Мінімальна/центральна/максимальна ширина 1000/1500/2000 мкс відповідає −90°/0°/+90°. Положення достовірне лише після повного імпульсу в межах калібровки. Втрата сигналу довше Signal timeout дає X.',
  ],
  pitfalls: [
    [
      'Angle depends on high-pulse duration, not duty alone: pulse width (µs) = Duty / Frequency × 1,000,000. If frequency changes while duty stays fixed, the commanded angle changes.',
      'Кут залежить від тривалості високого імпульсу, а не лише заповнення: ширина (мкс) = Duty / Frequency × 1 000 000. Зміна частоти при сталому Duty змінює команду кута.',
    ],
    [
      'Unwired, conflicting, constant-high/low or out-of-range commands are not a valid centered position: the readout shows X until a valid pulse is decoded. A previously valid position is held only until Signal timeout.',
      'Непідключений, конфліктний, постійний високий/низький або позамежний сигнал не означає нульового кута: показано X до декодування правильного імпульсу. Попередній достовірний кут утримується лише до Signal timeout.',
    ],
    [
      'Calibration must satisfy 0 < Minimum pulse < Center pulse < Maximum pulse. Range is total angular travel; 180 means ±90°. Torque, inertia and mechanical transit time are not modeled.',
      'Калібровка має відповідати 0 < Minimum pulse < Center pulse < Maximum pulse. Range є повним ходом; 180 означає ±90°. Момент, інерція та час механічного переміщення не моделюються.',
    ],
  ],
  inputs: Object.fromEntries(
    [1, 2, 3, 4].map((index) => [
      `s${index}`,
      [
        `S${index}: digital RC control pulses for channel ${index}; a full valid high pulse is required.`,
        `S${index}: цифрові RC-імпульси каналу ${index}; потрібний повний правильний високий імпульс.`,
      ],
    ]),
  ),
  outputs: Object.fromEntries(
    [1, 2, 3, 4].map((index) => [
      `a${index}`,
      [
        `A${index}: channel ${index} angle in degrees, or X while its command is unknown or missing.`,
        `A${index}: кут каналу ${index} у градусах або X, коли команда невизначена чи відсутня.`,
      ],
    ]),
  ),
  examples: ['pwm-servos'],
};
