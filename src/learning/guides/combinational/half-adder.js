import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A half adder adds two individual bits and separates the result into a sum bit and a carry bit.',
    'Напівсуматор додає два окремі біти та розділяє результат на біт суми й біт перенесення.',
  ],
  steps: [
    [
      'Connect two switches to A and B of Half adder.',
      'Підключіть два перемикачі до A і B напівсуматора.',
    ],
    [
      'Attach one LED to Σ and a second LED to C.',
      'Приєднайте один світлодіод до Σ, а другий до C.',
    ],
    [
      'Read the two-bit answer in the order Carry then Sum.',
      'Читайте двобітну відповідь у порядку Carry, потім Sum.',
    ],
  ],
  experiment: [
    'Set A=B=1, then compare this block with the XOR-plus-AND implementation in the half-adder example.',
    'Встановіть A=B=1 та порівняйте блок із реалізацією XOR+І у прикладі напівсуматора.',
  ],
  expected: [
    '0+0 gives 00; 0+1 and 1+0 give 01; 1+1 gives 10. Sum is XOR and Carry is AND.',
    '0+0 дає 00; 0+1 та 1+0 дають 01; 1+1 дає 10. Sum — XOR, Carry — І.',
  ],
  pitfalls: [
    [
      'This block has no carry input; use Full adder when connecting stages of a larger adder.',
      'Блок не має входу перенесення; для послідовного з’єднання розрядів використовуйте повний суматор.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    sum: ['Σ: result bit with weight 1, A XOR B.', 'Σ: біт результату з вагою 1, A XOR B.'],
    carry: ['C: carry bit with weight 2, A AND B.', 'C: біт перенесення з вагою 2, A І B.'],
  },
  examples: ['half-adder', 'full-adder'],
};
