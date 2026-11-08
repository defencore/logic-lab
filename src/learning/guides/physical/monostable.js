import { resetPin } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A digital one-shot produces one fixed-duration pulse after a rising trigger edge.',
    'Цифровий одновібратор створює один імпульс фіксованої тривалості після додатного фронту запуску.',
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
      'This ideal digital timer uses a rising trigger and active-high reset. Duration is configured directly; analog RC charging and voltage thresholds are not modeled.',
      'Цей ідеальний цифровий таймер запускається додатним фронтом і скидається одиницею. Тривалість задається безпосередньо; заряд RC-кола й аналогові пороги напруги не моделюються.',
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
