import { resetPin, clockPin, qPins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The D flip-flop stores a data bit at a rising clock edge and keeps it unchanged between edges.',
    'D-тригер зберігає біт даних за додатним фронтом такту та утримує його між фронтами.',
  ],
  steps: [
    [
      'Connect a data switch to D and a manual clock switch, initially 0, to CLK.',
      'Підключіть перемикач даних до D та ручний тактовий перемикач, спочатку 0, до CLK.',
    ],
    [
      'Connect reset to Ground or a switch at 0, and attach an LED to Q.',
      'Підключіть скидання до Землі або перемикача в 0 та світлодіод до Q.',
    ],
    [
      'Choose D, raise CLK from 0 to 1, then change D while CLK stays high.',
      'Оберіть D, підніміть CLK з 0 до 1, потім змініть D, утримуючи CLK у 1.',
    ],
  ],
  experiment: [
    'Change D several times without a new rising edge; finally lower CLK and raise it again.',
    'Кілька разів змініть D без нового додатного фронту; наприкінці опустіть CLK і знову підніміть.',
  ],
  expected: [
    'Q holds the previously captured value until the next 0→1 edge. RST=1 clears Q immediately.',
    'Q утримує раніше записане значення до наступного фронту 0→1. RST=1 одразу скидає Q.',
  ],
  pitfalls: [
    [
      'CLK=1 is a level, not a continuing command to copy D. This is an edge-triggered flip-flop.',
      'CLK=1 — рівень, а не постійна команда копіювати D. Це тригер із запуском за фронтом.',
    ],
    [
      'Initial chooses startup state; reset the simulation after changing it. A reset signal overrides clock capture.',
      'Initial задає початковий стан; після зміни скиньте симуляцію. Сигнал скидання має пріоритет над записом.',
    ],
  ],
  inputs: {
    d: [
      'The bit sampled on the rising clock edge.',
      'Біт, що зчитується за додатним фронтом такту.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: qPins,
  examples: ['d-memory'],
};
