import { clockPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A register file keeps eight byte-sized registers, with independent read and write addresses like a small CPU register bank.',
    'Регістровий файл зберігає вісім байтових регістрів із незалежними адресами читання й запису, як банк регістрів процесора.',
  ],
  steps: [
    [
      'Wire three ADDR lines each to RA0…RA2 and WA0…WA2, and eight D lines to DATA0…DATA7.',
      'Підключіть по три лінії ADDR до RA0…RA2 і WA0…WA2 та вісім ліній D до DATA0…DATA7.',
    ],
    [
      'Connect a manual clock to CLK and a switch to WE; start both at 0.',
      'Підключіть ручний такт до CLK та перемикач до WE; почніть з обох у 0.',
    ],
    [
      'Set WA and DATA, raise WE, pulse CLK, then lower WE and select RA for reading.',
      'Задайте WA та DATA, увімкніть WE, подайте імпульс CLK, потім вимкніть WE та оберіть RA для читання.',
    ],
  ],
  experiment: [
    'Write 11 to register 1 and 22 to register 2, then alternate RA without clocking.',
    'Запишіть 11 у регістр 1 та 22 в регістр 2, потім перемикайте RA без такту.',
  ],
  expected: [
    'Q immediately follows the register selected by RA. A write affects only WA at its rising edge.',
    'Q одразу показує регістр за RA. Запис змінює лише WA за додатним фронтом.',
  ],
  pitfalls: [
    [
      'RA and WA have three separate lines for addresses 0–7; connect exactly bits 0, 1 and 2.',
      'RA і WA мають по три окремі лінії для адрес 0–7; підключіть саме біти 0, 1 та 2.',
    ],
    [
      'WE defaults inactive if unwired. Resetting the simulation clears all eight registers; there is no separate reset pin.',
      'Непідключений WE неактивний. Скидання симуляції очищує всі вісім регістрів; окремого входу скидання немає.',
    ],
  ],
  inputs: {
    read: [
      'RA: the three-bit register address to read continuously.',
      'RA: трьохбітна адреса регістра для безперервного читання.',
    ],
    write: [
      'WA: the three-bit destination address sampled during a write.',
      'WA: трьохбітна адреса призначення під час запису.',
    ],
    data: [
      'DATA: eight data bits written together.',
      'DATA: вісім бітів даних для одночасного запису.',
    ],
    clk: clockPin,
    we: [
      'WE: active-high write permission on a rising CLK.',
      'WE: дозвіл запису одиницею за додатним CLK.',
    ],
  },
  outputs: {
    out: [
      'Q: contents of register RA, independent of WA.',
      'Q: вміст регістра RA, незалежно від WA.',
    ],
  },
  examples: ['ram', 'alu'],
};
