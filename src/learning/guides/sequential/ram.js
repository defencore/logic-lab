import { clockPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'RAM stores 16 independently addressed bytes and permits writing during simulation.',
    'ОЗП зберігає 16 окремо адресованих байтів та дозволяє їх запис під час симуляції.',
  ],
  steps: [
    [
      'Wire BCD0…BCD3 of the address source to ADDR0…ADDR3 and data D0…D7 to DATA0…DATA7.',
      'Окремо підключіть BCD0…BCD3 джерела адреси до ADDR0…ADDR3 та D0…D7 джерела даних до DATA0…DATA7.',
    ],
    [
      'Use switches for CS, OE, WE and a manual CLK. Start CS=1,OE=1,WE=0,CLK=0.',
      'Використайте перемикачі CS, OE, WE та ручний CLK. Почніть із CS=1,OE=1,WE=0,CLK=0.',
    ],
    [
      'Choose address and data, set WE=1 and pulse CLK 0→1. Return WE to 0 to read Q.',
      'Оберіть адресу й дані, задайте WE=1 та імпульс CLK 0→1. Поверніть WE у 0 для читання Q.',
    ],
  ],
  experiment: [
    'Write 37 to address 2 and 99 to address 3, then switch addresses with WE=0.',
    'Запишіть 37 за адресою 2 та 99 за адресою 3, потім перемикайте адреси при WE=0.',
  ],
  expected: [
    'Q follows the stored byte at ADDR while CS=OE=1 and WE=0. Other locations retain their own values.',
    'Q показує байт за ADDR при CS=OE=1 і WE=0. Інші комірки зберігають власні значення.',
  ],
  pitfalls: [
    [
      'Controls are active-high here: this model does not use the active-low bars found on many physical SRAM chips.',
      'Керування тут активне одиницею: модель не використовує інверсні входи багатьох реальних SRAM.',
    ],
    [
      'Q is Z during writes, CS=0 or OE=0. Merely changing DATA with WE=1 does not write without a rising CLK.',
      'Q має Z під час запису, при CS=0 або OE=0. Сама зміна DATA при WE=1 не записує без додатного CLK.',
    ],
    [
      'Unwired CS/OE default to 1 and WE to 0; resetting the simulation clears every RAM byte.',
      'Непідключені CS/OE означають 1, WE — 0; скидання симуляції очищує всі байти ОЗП.',
    ],
  ],
  inputs: {
    address: ['ADDR: four-bit address 0–15.', 'ADDR: чотирибітна адреса 0–15.'],
    data: ['DATA: eight-bit byte to write.', 'DATA: восьмибітний байт для запису.'],
    clk: clockPin,
    cs: [
      'CS: chip select, active-high; default 1 when unwired.',
      'CS: вибір мікросхеми одиницею; без дроту означає 1.',
    ],
    oe: [
      'OE: output enable, active-high; default 1 when unwired.',
      'OE: дозвіл виходу одиницею; без дроту означає 1.',
    ],
    we: [
      'WE: write enable, active-high; default 0. Q releases while WE=1.',
      'WE: дозвіл запису одиницею; типово 0. При WE=1 вихід Q відпущено.',
    ],
  },
  outputs: {
    out: [
      'Q: addressed byte during an enabled read, otherwise high-impedance Z.',
      'Q: адресований байт при дозволеному читанні, інакше високий імпеданс Z.',
    ],
  },
  examples: ['ram'],
};
