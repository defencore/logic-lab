// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The 8:3 encoder converts the position of one asserted input bit into its three-bit index.',
    'Шифратор 8:3 перетворює позицію одного активного вхідного біта на його трьохбітний номер.',
  ],
  steps: [
    [
      'Wire Byte value lines D0…D7 to the matching D0…D7 inputs.',
      'З’єднайте лінії D0…D7 джерела байта з відповідними входами D0…D7.',
    ],
    [
      'Observe CODE0…CODE2 with separate LEDs and attach another LED to V.',
      'Підключіть окремі світлодіоди до CODE0…CODE2 та ще один до V.',
    ],
    [
      'Use one-hot values 1,2,4,8,16,32,64,128.',
      'Використовуйте значення з одним активним бітом: 1,2,4,8,16,32,64,128.',
    ],
  ],
  experiment: [
    'Compare source values 8 and 12; the latter asserts two input bits.',
    'Порівняйте значення джерела 8 та 12; друге активує два вхідні біти.',
  ],
  expected: [
    'Input 8 gives CODE=3,V=1. Input 0 gives CODE=0,V=0. Input 12 is ambiguous and gives X.',
    'Вхід 8 дає CODE=3,V=1. Вхід 0 дає CODE=0,V=0. Вхід 12 неоднозначний і дає X.',
  ],
  pitfalls: [
    [
      'The encoder expects a bit mask, not the decimal number to be copied. Bit 3 has mask value 8.',
      'Шифратор очікує бітову маску, а не число для копіювання. Біт 3 має маску 8.',
    ],
    [
      'Use Priority encoder when several requests may be active together.',
      'Коли одночасно можливі кілька запитів, використовуйте пріоритетний шифратор.',
    ],
  ],
  inputs: {
    in: [
      'D: eight one-hot request bits packed in a byte.',
      'D: вісім бітів запиту в байті, лише один має бути активним.',
    ],
  },
  outputs: {
    out: ['CODE: index 0–7 of the only active bit.', 'CODE: номер 0–7 єдиного активного біта.'],
    valid: [
      'V: 1 for one active bit, 0 for no bits, X for multiple bits.',
      'V: 1 для одного активного біта, 0 для жодного, X для кількох.',
    ],
  },
  examples: ['bus-mux', 'alu'],
};
