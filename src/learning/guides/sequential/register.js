import { resetPin, clockPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An 8-bit register stores a complete byte at a clock edge, acting as a small parallel memory.',
    '8-бітний регістр зберігає цілий байт за фронтом такту та працює як невелика паралельна пам’ять.',
  ],
  steps: [
    [
      'Wire D0…D7 of a Byte value source to the eight D inputs and a manual clock to CLK.',
      'Окремо з’єднайте D0…D7 джерела байта з вісьмома входами D, а ручний такт — із CLK.',
    ],
    [
      'Connect EN to VCC or a switch at 1; keep RST at 0.',
      'Підключіть EN до VCC або перемикача в 1; тримайте RST у 0.',
    ],
    [
      'Choose a byte and apply a 0→1 clock transition, then change the source value.',
      'Оберіть байт, подайте перехід такту 0→1, потім змініть значення джерела.',
    ],
  ],
  experiment: [
    'Capture 42, change D to 99, set EN=0 and apply more clock edges.',
    'Запишіть 42, змініть D на 99, встановіть EN=0 та подайте ще кілька фронтів.',
  ],
  expected: [
    'Q stays 42 until a rising edge with EN=1; RST=1 immediately makes the stored byte zero.',
    'Q залишається 42 до додатного фронту з EN=1; RST=1 одразу обнуляє збережений байт.',
  ],
  pitfalls: [
    [
      'An unwired EN defaults to 1 and an unwired RST to 0 in this teaching model; explicit controls are clearer.',
      'У цій навчальній моделі непідключений EN означає 1, а RST — 0; явні керувальні сигнали наочніші.',
    ],
    [
      'Initial is an 8-bit startup value, applied after resetting the simulation; changing D alone never writes it.',
      'Initial — 8-бітне початкове значення після скидання симуляції; сама зміна D не записує дані.',
    ],
  ],
  inputs: {
    d: [
      'D: eight parallel data bits captured together.',
      'D: вісім паралельних бітів, що записуються разом.',
    ],
    clk: clockPin,
    enable: [
      'EN: active-high capture enable; defaults to 1 if unwired.',
      'EN: дозвіл запису одиницею; непідключений вхід означає 1.',
    ],
    reset: resetPin,
  },
  outputs: {
    out: ['Q: the stored unsigned byte, 0–255.', 'Q: збережений беззнаковий байт, 0–255.'],
  },
  examples: ['d-memory', 'ram'],
};
