import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'NAND is an AND gate followed by inversion. It is a universal building block for digital logic.',
    'І-НЕ — це елемент І з інверсією виходу. Це універсальний блок цифрової логіки.',
  ],
  steps: [
    [
      'Connect two switches to NAND inputs A and B.',
      'Підключіть два перемикачі до входів A і B елемента І-НЕ.',
    ],
    [
      'Attach an LED to Q and compare its light with an AND gate fed by the same switches.',
      'Підключіть світлодіод до Q та порівняйте його з елементом І на тих самих перемикачах.',
    ],
    [
      'Set both switches to 1, then return either one to 0.',
      'Встановіть обидва перемикачі в 1, потім поверніть будь-який у 0.',
    ],
  ],
  experiment: [
    'Connect one switch output to both A and B, turning NAND into an inverter.',
    'Підключіть один перемикач одночасно до A і B: І-НЕ стане інвертором.',
  ],
  expected: [
    'NAND outputs 1,1,1,0 for 00,01,10,11. With joined inputs, Q is the inverse of the switch.',
    'І-НЕ дає 1,1,1,0 для 00,01,10,11. При об’єднаних входах Q є інверсією перемикача.',
  ],
  pitfalls: [
    [
      'The inversion belongs to the output, not to each input separately.',
      'Інвертується результат на виході, а не кожен вхід окремо.',
    ],
    [
      'Connecting NAND gates in feedback can create memory; a combinational loop without a stable state may produce X.',
      'Зворотний зв’язок між І-НЕ може утворити пам’ять; комбінаційний цикл без сталого стану може дати X.',
    ],
  ],
  inputs: gatePins,
  outputs: { out: ['Q=NOT(A AND B).', 'Q=НЕ(A І B).'] },
  examples: ['logic-gates'],
};
