import { resetPin, clockPin, qPins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The T flip-flop toggles its state on a clock edge when enabled by T, making a divide-by-two stage.',
    'T-тригер інвертує стан за фронтом такту при активному T та утворює подільник частоти на два.',
  ],
  steps: [
    [
      'Connect VCC to T, a 2 Hz clock to CLK and Ground to RST.',
      'Підключіть VCC до T, тактовий сигнал 2 Гц до CLK та Землю до RST.',
    ],
    [
      'Place a scope on Q and optionally another scope on the clock.',
      'Підключіть осцилограф до Q та за потреби ще один до такту.',
    ],
    [
      'Run long enough to see several rising clock edges.',
      'Запустіть симуляцію на кілька додатних фронтів такту.',
    ],
  ],
  experiment: [
    'Replace VCC on T with a switch and set it to 0 while the clock continues.',
    'Замініть VCC на T перемикачем та встановіть 0, не зупиняючи такт.',
  ],
  expected: [
    'With T=1, Q alternates at every rising edge and has half the clock frequency; T=0 holds the current bit.',
    'При T=1 Q змінюється за кожним додатним фронтом і має вдвічі меншу частоту; T=0 утримує поточний біт.',
  ],
  pitfalls: [
    [
      'An unwired T is unknown, not enabled by default; connect it explicitly.',
      'Непідключений T є невідомим, а не автоматично дозволеним; підключіть його явно.',
    ],
    [
      'Use Initial plus a simulation reset for a reproducible starting phase; use RST to clear during a run.',
      'Для повторюваної початкової фази задайте Initial та скиньте симуляцію; RST скидає під час роботи.',
    ],
  ],
  inputs: {
    t: [
      'Toggle enable: 1 toggles on an edge, 0 holds.',
      'Дозвіл інверсії: 1 перемикає за фронтом, 0 зберігає.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: qPins,
  examples: ['counter', 'd-memory'],
};
