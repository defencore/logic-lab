import { resetPin, clockPin, qPins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A JK flip-flop can hold, reset, set or toggle its stored bit on each rising clock edge.',
    'JK-тригер може зберігати, скидати, встановлювати або інвертувати біт за кожним додатним фронтом.',
  ],
  steps: [
    [
      'Use switches for J and K, a clock for CLK and a low reset signal.',
      'Використайте перемикачі для J і K, тактовий сигнал для CLK та низький рівень скидання.',
    ],
    [
      'Attach LEDs to Q and Q̅; start with J=K=0.',
      'Підключіть світлодіоди до Q і Q̅; почніть із J=K=0.',
    ],
    [
      'Test JK=01,10,11 while advancing the clock one rising edge at a time.',
      'Перевірте JK=01,10,11, просуваючи такт по одному додатному фронту.',
    ],
  ],
  experiment: [
    'Keep J=K=1 and drive CLK with a 2 Hz clock.',
    'Залиште J=K=1 і подайте на CLK тактовий сигнал 2 Гц.',
  ],
  expected: [
    'JK=00 holds, 01 resets, 10 sets, 11 toggles. With 11, Q completes one cycle per two clock periods.',
    'JK=00 зберігає, 01 скидає, 10 встановлює, 11 інвертує. При 11 цикл Q триває два тактові періоди.',
  ],
  pitfalls: [
    [
      'J=K=1 is valid for JK, unlike S=R=1 on an SR latch.',
      'J=K=1 є дозволеним для JK, на відміну від S=R=1 у SR-защіпки.',
    ],
    [
      'Initial is applied when simulation state is initialized; RST=1 clears regardless of J, K or clock.',
      'Initial застосовується під час ініціалізації симуляції; RST=1 скидає незалежно від J, K і такту.',
    ],
  ],
  inputs: {
    j: [
      'J: set request on a rising edge; with K=1 it requests toggling.',
      'J: запит встановлення за фронтом; разом із K=1 задає інверсію.',
    ],
    k: [
      'K: reset request on a rising edge; with J=1 it requests toggling.',
      'K: запит скидання за фронтом; разом із J=1 задає інверсію.',
    ],
    clk: clockPin,
    reset: resetPin,
  },
  outputs: qPins,
  examples: ['d-memory', 'counter'],
};
