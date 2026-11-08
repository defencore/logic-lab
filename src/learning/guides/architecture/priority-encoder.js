// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A priority encoder chooses the highest-numbered active request when several bits are asserted together.',
    'Пріоритетний шифратор обирає активний запит із найбільшим номером, коли одночасно встановлено кілька бітів.',
  ],
  steps: [
    [
      'Wire Byte value D0…D7 separately to D0…D7.',
      'З’єднайте лінії D0…D7 джерела байта з відповідними входами D0…D7.',
    ],
    [
      'Observe CODE0…CODE2 with separate LEDs and attach another LED to V.',
      'Підключіть окремі світлодіоди до CODE0…CODE2 та ще один до V.',
    ],
    ['Try input masks 1,8,12,128 and 255.', 'Спробуйте вхідні маски 1,8,12,128 та 255.'],
  ],
  experiment: [
    'Start with D=12, which contains requests 2 and 3; remove bit 3 by changing D to 4.',
    'Почніть із D=12 із запитами 2 і 3; приберіть біт 3, змінивши D на 4.',
  ],
  expected: [
    'D=12 gives CODE=3; D=4 gives CODE=2. Any nonzero mask gives V=1; zero gives V=0.',
    'D=12 дає CODE=3; D=4 дає CODE=2. Будь-яка ненульова маска дає V=1; нуль дає V=0.',
  ],
  pitfalls: [
    [
      'Priority belongs to the bit index, not the number of requests. Bit 7 outranks every lower bit.',
      'Пріоритет задає номер біта, а не кількість запитів. Біт 7 важливіший за будь-який молодший.',
    ],
    [
      'CODE=0 can mean bit 0 is active or no request exists; check V to distinguish them.',
      'CODE=0 може означати активний біт 0 або відсутність запитів; розрізняйте їх за V.',
    ],
  ],
  inputs: {
    in: [
      'D: eight active-high request bits packed into a byte.',
      'D: вісім запитів, активних одиницею та упакованих у байт.',
    ],
  },
  outputs: {
    out: [
      'CODE: three-bit index of the highest asserted input.',
      'CODE: трьохбітний номер найстаршого активного входу.',
    ],
    valid: [
      'V: 1 if any known request is active, otherwise 0.',
      'V: 1, якщо є хоча б один визначений активний запит, інакше 0.',
    ],
  },
  examples: ['alu', 'bus-mux'],
};
