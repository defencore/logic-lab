// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A Schmitt trigger converts an analog level to a stable bit using different rising and falling thresholds.',
    'Тригер Шмітта перетворює аналоговий рівень на стійкий біт із різними порогами підйому й спаду.',
  ],
  steps: [
    [
      'Connect Byte value → DAC → Schmitt V and connect Q to an LED.',
      'З’єднайте Значення байта → ЦАП → V тригера Шмітта та Q зі світлодіодом.',
    ],
    [
      'Set DAC Vcc=5 and Schmitt Low=1.5 V, High=3.5 V.',
      'Задайте Vcc ЦАП=5 та пороги Шмітта Low=1.5 В, High=3.5 В.',
    ],
    [
      'Start below 1.5 V, rise above 3.5 V, then return to a middle voltage.',
      'Почніть нижче 1.5 В, підніміться вище 3.5 В, потім поверніться до середньої напруги.',
    ],
  ],
  experiment: [
    'Set source codes 0→128→220→128→20 and note the output at both visits to 128.',
    'Задавайте коди 0→128→220→128→20 та порівняйте вихід під час обох відвідувань 128.',
  ],
  expected: [
    'Q follows 0,0,1,1,0. The middle voltage retains whichever state was established by the last crossed threshold.',
    'Q набуває 0,0,1,1,0. Середня напруга зберігає стан, заданий останнім перетнутим порогом.',
  ],
  pitfalls: [
    [
      'The gap between Low and High is hysteresis, not an unknown region. It deliberately remembers the previous bit.',
      'Проміжок між Low і High — гістерезис, а не невизначена зона. Він навмисно зберігає попередній біт.',
    ],
    [
      'This model starts low and has ideal switching without analog noise or propagation delay.',
      'Модель починає з нуля та перемикається ідеально, без аналогового шуму й затримки поширення.',
    ],
  ],
  inputs: {
    in: [
      'V: analog voltage compared against Low and High.',
      'V: аналогова напруга для порівняння з Low та High.',
    ],
  },
  outputs: {
    out: [
      'Q: becomes 1 at or above High, 0 at or below Low, and holds between them.',
      'Q: стає 1 при High або вище, 0 при Low або нижче, і зберігається між порогами.',
    ],
  },
  examples: ['schmitt'],
};
