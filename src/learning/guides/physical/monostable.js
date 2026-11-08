import { resetPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A monostable produces one fixed-duration pulse after a trigger edge, illustrating a simplified 555 one-shot.',
    'Одновібратор створює один імпульс фіксованої тривалості після фронту запуску та ілюструє спрощений одновібратор 555.',
  ],
  steps: [
    [
      'Connect a switch initially at 0 to TRIG, keep RST=0, and attach Q to an LED or scope.',
      'Підключіть перемикач, спочатку 0, до TRIG, тримайте RST=0 та підключіть Q до світлодіода чи осцилографа.',
    ],
    [
      'Set Duration=0.5 seconds and run the simulation.',
      'Задайте Duration=0.5 секунди та запустіть симуляцію.',
    ],
    [
      'Toggle TRIG from 0 to 1, then release it back to 0.',
      'Перемкніть TRIG з 0 у 1, потім поверніть у 0.',
    ],
  ],
  experiment: [
    'Trigger again while the pulse is already active; then trigger once more after it expires.',
    'Повторіть запуск під час активного імпульсу, потім ще раз після його завершення.',
  ],
  expected: [
    'Q stays high for Duration after the first rising trigger. Triggers during that pulse do not extend it; a later fresh edge starts another pulse.',
    'Q має 1 протягом Duration після першого додатного фронту. Запуски під час імпульсу не подовжують його; новий фронт після завершення запускає наступний.',
  ],
  pitfalls: [
    [
      'This teaching block uses a rising trigger and active-high reset; it does not reproduce the pin polarity or analog thresholds of a physical 555.',
      'Цей навчальний блок має запуск додатним фронтом і скидання одиницею; він не відтворює полярності та аналогові пороги реального 555.',
    ],
    [
      'Hold TRIG=1 after expiration and no second pulse starts: first return it to 0. RST=1 cancels the current pulse.',
      'Утримання TRIG=1 після завершення не запускає новий імпульс: спочатку поверніть 0. RST=1 скасовує поточний імпульс.',
    ],
  ],
  inputs: {
    trigger: [
      'TRIG: a 0→1 edge starts a pulse only while idle.',
      'TRIG: фронт 0→1 запускає імпульс лише у стані очікування.',
    ],
    reset: resetPin,
  },
  outputs: {
    out: ['Q: 1 during the timed pulse, otherwise 0.', 'Q: 1 під час заданого імпульсу, інакше 0.'],
  },
  examples: ['monostable'],
};
