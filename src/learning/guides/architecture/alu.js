// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The 8-bit ALU selects an arithmetic or bitwise operation on two bytes using a three-bit operation code.',
    '8-бітний АЛП обирає арифметичну або побітову операцію над двома байтами за трьохбітним кодом.',
  ],
  steps: [
    [
      'Wire two eight-line sources to A0…A7 and B0…B7 and three ADDR lines to OP0…OP2.',
      'Підключіть по вісім окремих ліній до A0…A7 і B0…B7 та три лінії ADDR до OP0…OP2.',
    ],
    [
      'Observe Y0…Y7 separately and connect LEDs to C and Z; the component readout shows the byte.',
      'Спостерігайте Y0…Y7 окремо та підключіть світлодіоди до C і Z; індикатор компонента показує байт.',
    ],
    [
      'Try OP 0 add, 1 subtract, 2 AND, 3 OR, 4 XOR, 5 left shift, 6 right shift, 7 NOT A.',
      'Спробуйте OP: 0 додавання, 1 віднімання, 2 І, 3 АБО, 4 XOR, 5 зсув уліво, 6 вправо, 7 НЕ A.',
    ],
  ],
  experiment: [
    'Set A=250,B=10,OP=0; then change to A=10,B=10,OP=1.',
    'Задайте A=250,B=10,OP=0; потім змініть на A=10,B=10,OP=1.',
  ],
  expected: [
    '250+10 gives Y=4,C=1 because the byte wraps. 10−10 gives Y=0,Z=1.',
    '250+10 дає Y=4,C=1 через переповнення байта. 10−10 дає Y=0,Z=1.',
  ],
  pitfalls: [
    [
      'Operations use unsigned eight-bit values. For shifts, only B’s lowest three bits set the count, so shifting by 8 acts like 0.',
      'Операції використовують беззнакові восьмибітні значення. Зсув задають три молодші біти B, тому 8 означає зсув на 0.',
    ],
    [
      'C reflects a raw result outside the byte range, including a negative subtraction result; these are simplified flags, not a full CPU flag register.',
      'C відображає результат поза діапазоном байта, зокрема від’ємне віднімання; це спрощені прапорці, а не повний регістр стану процесора.',
    ],
  ],
  inputs: {
    a: [
      'A: first unsigned byte; OP=7 inverts this operand.',
      'A: перший беззнаковий байт; OP=7 інвертує його.',
    ],
    b: [
      'B: second unsigned byte or the low-three-bit shift count.',
      'B: другий беззнаковий байт або кількість зсувів у трьох молодших бітах.',
    ],
    op: ['OP: three-bit operation selector 0–7.', 'OP: трьохбітний вибір операції 0–7.'],
  },
  outputs: {
    out: ['Y: low eight bits of the result.', 'Y: вісім молодших бітів результату.'],
    carry: [
      'C: out-of-byte-range flag for the raw computation.',
      'C: прапорець виходу початкового результату за межі байта.',
    ],
    zero: [
      'Z: 1 when the resulting byte equals zero.',
      'Z: 1, коли результуючий байт дорівнює нулю.',
    ],
  },
  examples: ['alu'],
};
