// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A 2:1 multiplexer chooses one complete byte from two data sources using a single select bit.',
    'Мультиплексор 2:1 обирає цілий байт одного з двох джерел за одним керувальним бітом.',
  ],
  steps: [
    [
      'Wire two Byte value sources D0…D7 to A0…A7 and B0…B7, using values 12 and 200.',
      'Окремо підключіть D0…D7 двох джерел байта до A0…A7 і B0…B7 зі значеннями 12 та 200.',
    ],
    [
      'Connect a switch to S; wire Y0…Y7 to separate LEDs or the corresponding receiver inputs.',
      'Підключіть перемикач до S, а Y0…Y7 — до окремих світлодіодів або відповідних входів приймача.',
    ],
    [
      'Toggle S while watching the output value.',
      'Перемикайте S та спостерігайте вихідне значення.',
    ],
  ],
  experiment: [
    'Keep S=0 and change B; then set S=1 without changing either data connection.',
    'Залиште S=0 і змініть B; потім встановіть S=1, не змінюючи дротів даних.',
  ],
  expected: [
    'S=0 selects A and S=1 selects B. Changes on the unselected input do not affect Y.',
    'S=0 обирає A, S=1 обирає B. Зміни необраного входу не впливають на Y.',
  ],
  pitfalls: [
    [
      'A, B and Y each have eight independent lines; S is one bit. Keep matching bit numbers together.',
      'A, B та Y мають по вісім окремих ліній; S — один біт. З’єднуйте біти з однаковими номерами.',
    ],
    [
      'A floating S makes the result uncertain unless both input values already match.',
      'Непідключений S робить результат невизначеним, крім випадку однакових значень обох входів.',
    ],
  ],
  inputs: {
    a: ['The byte selected when S=0.', 'Байт, обраний при S=0.'],
    b: ['The byte selected when S=1.', 'Байт, обраний при S=1.'],
    sel: ['S: one-bit selection control.', 'S: однобітний сигнал вибору.'],
  },
  outputs: {
    out: ['Y: the selected unsigned 8-bit value.', 'Y: обране беззнакове 8-бітне значення.'],
  },
  examples: ['bus-mux'],
};
