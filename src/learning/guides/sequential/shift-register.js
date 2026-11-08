import { resetPin, clockPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A shift register assembles serial bits into a byte by shifting the previous contents left at every rising edge.',
    'Регістр зсуву збирає послідовні біти в байт, зсуваючи попередній вміст уліво за кожним додатним фронтом.',
  ],
  steps: [
    [
      'Use a data switch on SER and a manual clock on CLK; keep RST=0.',
      'Подайте перемикач даних на SER та ручний такт на CLK; тримайте RST=0.',
    ],
    [
      'Connect Q0…Q7 directly to eight LEDs to observe the stored bits.',
      'Підключіть Q0…Q7 безпосередньо до восьми світлодіодів для спостереження бітів.',
    ],
    [
      'Set SER before each rising edge; after the edge return CLK to 0.',
      'Задавайте SER перед кожним додатним фронтом; після нього повертайте CLK у 0.',
    ],
  ],
  experiment: [
    'Starting from zero, shift in 1,0,1,1 on four successive rising edges.',
    'Починаючи з нуля, послідовно введіть 1,0,1,1 за чотирма додатними фронтами.',
  ],
  expected: [
    'The byte progresses 1,2,5,11. New data enters bit 0; the old bit 7 falls out.',
    'Байт набуває значень 1,2,5,11. Нові дані входять у біт 0; старий біт 7 втрачається.',
  ],
  pitfalls: [
    [
      'SOUT repeats the current Q7 stored bit, rather than a separate delayed copy of SER.',
      'SOUT повторює поточний збережений біт Q7, а не окрему затриману копію SER.',
    ],
    [
      'RST clears all bits; Initial selects startup contents after a simulation reset. There is no parallel-load input.',
      'RST очищує всі біти; Initial задає початковий вміст після скидання симуляції. Паралельного завантаження немає.',
    ],
  ],
  inputs: {
    d: [
      'SER: one serial bit inserted into bit 0.',
      'SER: один послідовний біт, що входить у біт 0.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: {
    out: ['Q: all eight stored bits as one byte.', 'Q: усі вісім збережених бітів одним байтом.'],
    serial: [
      'SOUT: the current highest stored bit, equal to Q7.',
      'SOUT: поточний старший збережений біт, тотожний Q7.',
    ],
  },
  examples: ['counter', 'd-memory'],
};
