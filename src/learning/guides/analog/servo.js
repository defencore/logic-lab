// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'This four-channel teaching block converts PWM commands into visible control-surface angles.',
    'Цей чотириканальний навчальний блок перетворює команди ШІМ на видимі кути кермових поверхонь.',
  ],
  steps: [
    [
      'Connect PWM generator DUTY outputs to S1–S4; a single command may drive several channels.',
      'Підключіть виходи DUTY ШІМ-генераторів до S1–S4; одна команда може керувати кількома каналами.',
    ],
    [
      'Set MinDuty=0.18, MaxDuty=0.82 and Range=180 degrees.',
      'Задайте MinDuty=0.18, MaxDuty=0.82 та Range=180 градусів.',
    ],
    [
      'Move a source Duty from 0.18 through 0.5 to 0.82 and watch the corresponding surface.',
      'Змінюйте Duty джерела від 0.18 через 0.5 до 0.82 та спостерігайте відповідну поверхню.',
    ],
  ],
  experiment: [
    'Drive S1 and S3 from one PWM source and S2 and S4 from another; move both pairs independently.',
    'Керуйте S1 і S3 одним джерелом ШІМ, а S2 і S4 іншим; рухайте обидві пари незалежно.',
  ],
  expected: [
    'With the default range, duty 0.18 maps to −90°, 0.5 to 0°, and 0.82 to +90°; outside commands clamp at the endpoints.',
    'За типового діапазону duty 0.18 дає −90°, 0.5 — 0°, 0.82 — +90°; інші команди обмежуються крайніми кутами.',
  ],
  pitfalls: [
    [
      'DUTY is the preferred precise input. Digital PWM is measured at sample instants and needs several samples inside the shortest pulse.',
      'DUTY є рекомендованим точним входом. Цифровий ШІМ вимірюється за відліками й потребує кількох відліків у найкоротшому імпульсі.',
    ],
    [
      'Range is total angular travel, so 180 means ±90°. This model has no inertia, current, torque or hardware-controller timing.',
      'Range — повний кут руху, тому 180 означає ±90°. Модель не має інерції, струму, моменту чи часових характеристик реального контролера.',
    ],
  ],
  inputs: Object.fromEntries(
    [1, 2, 3, 4].map((index) => [
      `s${index}`,
      [
        `S${index}: duty ratio or digital PWM for channel ${index}; unwired centers this channel.`,
        `S${index}: частка заповнення чи цифровий ШІМ каналу ${index}; без дроту канал центровано.`,
      ],
    ]),
  ),
  outputs: Object.fromEntries(
    [1, 2, 3, 4].map((index) => [
      `a${index}`,
      [
        `A${index}: channel ${index} angle in degrees, an analog value.`,
        `A${index}: аналогове значення кута каналу ${index} у градусах.`,
      ],
    ]),
  ),
  examples: ['pwm-servos'],
};
