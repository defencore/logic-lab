import { qPins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An SR latch remembers one bit without a clock: Set writes 1, Reset writes 0, and inactive controls hold it.',
    'SR-защіпка зберігає один біт без такту: Set записує 1, Reset — 0, а неактивні входи зберігають стан.',
  ],
  steps: [
    [
      'Connect separate switches to S and R and LEDs to Q and Q̅.',
      'Підключіть окремі перемикачі до S і R та світлодіоди до Q і Q̅.',
    ],
    [
      'Start at S=0,R=0. Set S=1,R=0, then return S to 0.',
      'Почніть із S=0,R=0. Задайте S=1,R=0, потім поверніть S у 0.',
    ],
    [
      'Reset with S=0,R=1, then release R to 0.',
      'Скиньте стан через S=0,R=1, потім поверніть R у 0.',
    ],
  ],
  experiment: [
    'Set Initial=1 and reset the simulation. Compare the initial state with the state retained after releasing S.',
    'Задайте Initial=1 та скиньте симуляцію. Порівняйте початковий стан зі станом після відпускання S.',
  ],
  expected: [
    'Q remains 1 after a Set pulse and remains 0 after a Reset pulse, until the opposite command occurs.',
    'Q залишається 1 після імпульсу Set і 0 після Reset до протилежної команди.',
  ],
  pitfalls: [
    [
      'S=R=1 is forbidden and produces X. Recover with a definite set-only or reset-only command.',
      'S=R=1 заборонено та дає X. Відновіть стан визначеною командою лише Set або лише Reset.',
    ],
    [
      'Unlike D flip-flops, this latch reacts to control levels immediately; it has no clock edge.',
      'На відміну від D-тригера, защіпка реагує на рівні входів одразу; тактового фронту немає.',
    ],
  ],
  inputs: {
    s: [
      'S: active-high Set; use R=0 to write 1.',
      'S: встановлення одиницею; для запису 1 потрібно R=0.',
    ],
    r: [
      'R: active-high Reset; use S=0 to write 0.',
      'R: скидання одиницею; для запису 0 потрібно S=0.',
    ],
  },
  outputs: qPins,
  examples: ['d-memory'],
};
