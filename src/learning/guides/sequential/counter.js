import { resetPin, clockPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The binary counter counts rising clock edges as an unsigned eight-bit number.',
    'Двійковий лічильник підраховує додатні фронти такту як беззнакове восьмибітне число.',
  ],
  steps: [
    [
      'Connect a low-frequency clock to CLK and switches to RST and EN.',
      'Підключіть низькочастотний такт до CLK та перемикачі до RST і EN.',
    ],
    [
      'Set RST=0,EN=1 and connect Q to a splitter with eight LEDs.',
      'Задайте RST=0,EN=1 та підключіть Q до розгалужувача з вісьмома світлодіодами.',
    ],
    [
      'Run the simulation and read the LEDs with weights 1,2,4,8,16,32,64,128.',
      'Запустіть симуляцію та читайте світлодіоди з вагами 1,2,4,8,16,32,64,128.',
    ],
  ],
  experiment: [
    'Set Initial=254, reset the simulation and watch the next three rising edges.',
    'Задайте Initial=254, скиньте симуляцію та спостерігайте наступні три додатні фронти.',
  ],
  expected: [
    'The values become 255,0,1. EN=0 pauses counting; RST=1 immediately clears the count.',
    'Значення стануть 255,0,1. EN=0 зупиняє лічбу; RST=1 одразу скидає число.',
  ],
  pitfalls: [
    [
      'It counts only 0→1 transitions, not elapsed frames or both clock edges.',
      'Лічильник рахує лише переходи 0→1, а не кадри чи обидва фронти.',
    ],
    [
      'Unwired EN defaults high and RST low. A raw seven-segment display interprets Q as segments, not a decimal number.',
      'Непідключений EN означає 1, RST — 0. Прямий семисегментний індикатор трактує Q як сегменти, а не десяткове число.',
    ],
  ],
  inputs: {
    clk: clockPin,
    reset: resetPin,
    enable: [
      'EN: 1 counts, 0 holds; an unwired input defaults to 1.',
      'EN: 1 дозволяє лічбу, 0 утримує; непідключений вхід означає 1.',
    ],
  },
  outputs: {
    out: [
      'Q: the count modulo 256, packed into eight bits.',
      'Q: число за модулем 256, упаковане у вісім бітів.',
    ],
  },
  examples: ['counter', 'mixed-signals'],
};
