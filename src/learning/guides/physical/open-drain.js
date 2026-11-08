// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An open-drain output can pull a shared line low or release it, enabling wired-AND logic with a pull-up.',
    'Вихід із відкритим стоком може стягувати спільну лінію до нуля або відпускати її, утворюючи монтажне І з підтяжкою.',
  ],
  steps: [
    [
      'Connect a switch to D and connect Q to an LED input.',
      'Підключіть перемикач до D, а Q — до входу світлодіода.',
    ],
    [
      'Connect a Pull-up output to that same LED input to define the released state.',
      'Підключіть вихід підтяжки до живлення до того самого входу світлодіода для визначення відпущеного стану.',
    ],
    [
      'For wired-AND, add a second open drain with its own switch and connect its Q to the shared input.',
      'Для монтажного І додайте другий відкритий стік зі своїм перемикачем і підключіть його Q до спільного входу.',
    ],
  ],
  experiment: [
    'Set both data switches to 1, then lower either one to 0.',
    'Встановіть обидва перемикачі даних у 1, потім опустіть будь-який у 0.',
  ],
  expected: [
    'Both released outputs let the pull-up produce 1. Any D=0 sinks the whole shared net to 0.',
    'Два відпущені виходи дозволяють підтяжці дати 1. Будь-який D=0 стягує всю спільну мережу до 0.',
  ],
  pitfalls: [
    [
      'D=1 does not actively drive 1: the output is Z. Without the pull-up, the released line floats.',
      'D=1 не задає активну 1: вихід має Z. Без підтяжки відпущена лінія не визначена.',
    ],
    [
      'Do not substitute strong VCC for the pull-up; it conflicts with an asserted low and produces X.',
      'Не замінюйте підтяжку сильним VCC: він конфліктує з активним нулем і дає X.',
    ],
  ],
  inputs: {
    in: [
      'D: 0 turns on the low-side driver; 1 releases it.',
      'D: 0 вмикає стягування до нуля; 1 відпускає вихід.',
    ],
  },
  outputs: {
    out: [
      'Q: strong 0 or high-impedance Z, never a strong 1.',
      'Q: сильний 0 або високий імпеданс Z, ніколи сильна 1.',
    ],
  },
  examples: ['wired-and'],
};
