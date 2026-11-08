import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'XNOR tests equality of two individual bits, useful for a simple match detector.',
    'XNOR перевіряє рівність двох окремих бітів і підходить для простого детектора збігу.',
  ],
  steps: [
    [
      'Place two switches, XNOR and an LED labeled Match.',
      'Розмістіть два перемикачі, XNOR та світлодіод Match.',
    ],
    [
      'Wire the switches into A and B, then Q into the LED.',
      'Підключіть перемикачі до A і B, а Q — до світлодіода.',
    ],
    [
      'Make the switches equal, then make them different.',
      'Задайте однакові стани перемикачів, потім різні.',
    ],
  ],
  experiment: [
    'Fix B at 0 to make Q follow NOT A. Fix B at 1 to make Q follow A.',
    'Зафіксуйте B=0, щоб Q повторював НЕ A. При B=1 вихід Q повторює A.',
  ],
  expected: [
    'XNOR produces 1,0,0,1 for 00,01,10,11, the inverse of XOR.',
    'XNOR дає 1,0,0,1 для 00,01,10,11 — інверсію XOR.',
  ],
  pitfalls: [
    [
      'This block compares one bit; use the 8-bit Comparator for whole unsigned numbers.',
      'Цей блок порівнює один біт; для цілих беззнакових чисел використовуйте 8-бітний компаратор.',
    ],
    [
      'Two floating inputs are not a valid equality match; they produce unknown logic rather than a meaningful 1.',
      'Два непідключені входи не є достовірним збігом; вони дають невідомий стан замість змістовної 1.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    out: ['Q=NOT(A XOR B); high for equal bits.', 'Q=НЕ(A XOR B); одиниця для однакових бітів.'],
  },
  examples: ['logic-gates'],
};
