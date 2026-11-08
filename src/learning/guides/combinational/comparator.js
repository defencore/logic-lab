// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The comparator reports whether one unsigned byte is greater than, equal to, or less than another.',
    'Компаратор показує, чи один беззнаковий байт більший, рівний або менший за інший.',
  ],
  steps: [
    [
      'Wire Byte value outputs D0…D7 separately to A0…A7 and B0…B7.',
      'Окремо з’єднайте виходи D0…D7 джерел байта з A0…A7 та B0…B7.',
    ],
    ['Attach three LEDs to >, = and <.', 'Приєднайте три світлодіоди до >, = та <.'],
    [
      'Set A=10,B=20, then make A equal to and greater than B.',
      'Задайте A=10,B=20, потім зробіть A рівним і більшим за B.',
    ],
  ],
  experiment: [
    'Compare 255 with 1 and consider how unsigned comparison differs from signed arithmetic.',
    'Порівняйте 255 з 1 та подумайте, чим беззнакове порівняння відрізняється від знакового.',
  ],
  expected: [
    'Exactly one result is high for known inputs. 255 is greater than 1 in this model.',
    'Для визначених входів рівно один результат має 1. У цій моделі 255 більше за 1.',
  ],
  pitfalls: [
    [
      'Bytes are unsigned 0–255; the most significant bit is not a sign bit here.',
      'Байти беззнакові, 0–255; старший біт тут не є знаком.',
    ],
    [
      'An unknown byte makes all three comparison results unknown rather than asserting equality.',
      'Невідомий байт робить усі три результати невідомими замість підтвердження рівності.',
    ],
  ],
  inputs: {
    a: ['First unsigned 8-bit number.', 'Перше беззнакове 8-бітне число.'],
    b: ['Second unsigned 8-bit number.', 'Друге беззнакове 8-бітне число.'],
  },
  outputs: {
    gt: ['High only when A>B.', 'Одиниця лише при A>B.'],
    eq: ['High only when A=B.', 'Одиниця лише при A=B.'],
    lt: ['High only when A<B.', 'Одиниця лише при A<B.'],
  },
  examples: ['adc-dac', 'alu'],
};
