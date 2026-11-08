// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A clock produces repeating digital edges so counters and registers can run automatically.',
    'Тактовий генератор створює повторювані цифрові фронти для автоматичної роботи лічильників і регістрів.',
  ],
  steps: [
    [
      'Connect CLK to the CLK input of a counter and also to an oscilloscope.',
      'Підключіть CLK до входу CLK лічильника та до осцилографа.',
    ],
    [
      'Set Frequency=2 Hz and Duty=0.5, then run the simulation.',
      'Задайте Frequency=2 Гц та Duty=0.5, потім запустіть симуляцію.',
    ],
    [
      'Observe the counter on each low-to-high transition rather than on both edges.',
      'Спостерігайте зміну лічильника за кожним переходом 0→1, а не за обома фронтами.',
    ],
  ],
  experiment: [
    'Change Frequency from 2 to 4 Hz while keeping Duty=0.5.',
    'Змініть Frequency з 2 на 4 Гц, зберігаючи Duty=0.5.',
  ],
  expected: [
    'The counter advances twice as quickly. One 2 Hz period lasts 0.5 seconds; half of it is high.',
    'Лічильник просувається вдвічі швидше. Один період 2 Гц триває 0.5 с; половина періоду має рівень 1.',
  ],
  pitfalls: [
    [
      'Duty is a fraction from 0 to 1, not a percentage. At 0 or 1 there are no repeating edges.',
      'Duty — частка від 0 до 1, не відсотки. При 0 або 1 повторюваних фронтів немає.',
    ],
    [
      'The simulator samples time. Pulses narrower than the time step can be missed; start at low frequencies.',
      'Симулятор дискретизує час. Імпульси, вужчі за крок часу, можуть бути пропущені; починайте з низьких частот.',
    ],
  ],
  outputs: {
    out: [
      'A one-bit periodic waveform; this model starts in its low interval.',
      'Однобітний періодичний сигнал; ця модель починає з низького інтервалу.',
    ],
  },
  examples: ['counter', 'passive-buzzer-melody', 'buzzer-clock-divider', 'mixed-signals'],
};
