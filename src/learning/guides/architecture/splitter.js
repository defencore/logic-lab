// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A line breakout routes eight individual data inputs to numbered outputs without changing their values.',
    'Розгалужувач ліній передає вісім окремих входів даних на пронумеровані виходи без зміни значень.',
  ],
  steps: [
    [
      'Connect the eight source lines separately to D0…D7.',
      'Окремо підключіть вісім ліній джерела до D0…D7.',
    ],
    [
      'Wire outputs 0–7 to separate LEDs, keeping their bit numbers visible.',
      'Підключіть виходи 0–7 до окремих світлодіодів зі збереженням номерів бітів.',
    ],
    [
      'Set the source byte to 165 and read the individual outputs.',
      'Задайте джерелу байт 165 та прочитайте окремі виходи.',
    ],
  ],
  experiment: [
    'Wire counter Q0…Q7 to D0…D7; compare how often outputs 0,1,2 toggle.',
    'З’єднайте Q0…Q7 лічильника з D0…D7 та порівняйте частоту виходів 0,1,2.',
  ],
  expected: [
    '165=128+32+4+1, so bits 7,5,2,0 are high. Each higher counter bit toggles half as often as the previous one.',
    '165=128+32+4+1, тому біти 7,5,2,0 мають 1. Кожен старший біт лічильника перемикається вдвічі рідше.',
  ],
  pitfalls: [
    [
      'Bit 0 is the least significant bit even if the visual pin order runs top to bottom.',
      'Біт 0 — молодший незалежно від того, як контакти розташовані згори донизу.',
    ],
    [
      'Splitting preserves data; it does not select just one bit or convert the byte to decimal digits.',
      'Розгалуження зберігає дані; воно не обирає лише один біт і не перетворює байт у десяткові цифри.',
    ],
  ],
  inputs: {
    in: [
      'D: eight independently wired input bits, kept in numbered order.',
      'D: вісім окремо підключених вхідних бітів зі збереженням номерів.',
    ],
  },
  outputs: Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [
      `b${index}`,
      [
        `Bit ${index}: weight ${2 ** index}; (D >> ${index}) AND 1.`,
        `Біт ${index}: вага ${2 ** index}; (D >> ${index}) І 1.`,
      ],
    ]),
  ),
  examples: ['counter', 'bus-mux'],
};
