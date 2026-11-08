import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'NOR detects that neither condition is present. Like NAND, it can construct any Boolean function.',
    'АБО-НЕ виявляє відсутність обох умов. Як І-НЕ, він може утворити будь-яку булеву функцію.',
  ],
  steps: [
    [
      'Wire two switches into NOR inputs A and B.',
      'Підключіть два перемикачі до входів A і B елемента АБО-НЕ.',
    ],
    [
      'Connect Q to an LED representing “no alarm”.',
      'Підключіть Q до світлодіода, що означає «тривоги немає».',
    ],
    ['Begin at 00; change either input to 1.', 'Почніть із 00; змініть будь-який вхід на 1.'],
  ],
  experiment: [
    'Join both NOR inputs to one switch and compare Q with a NOT gate on that switch.',
    'Приєднайте обидва входи АБО-НЕ до одного перемикача та порівняйте Q з інвертором.',
  ],
  expected: [
    'Only 00 produces 1. The complete output sequence is 1,0,0,0.',
    'Лише 00 дає 1. Повна послідовність виходів: 1,0,0,0.',
  ],
  pitfalls: [
    [
      'An asserted input forces NOR low; an unconnected input alone does not mean “no alarm”.',
      'Одиниця на вході примусово дає нуль; непідключений вхід не означає «тривоги немає».',
    ],
    [
      'A pair of cross-coupled NOR gates is a latch, but use the SR latch block first to learn its forbidden state.',
      'Пара перехресно з’єднаних АБО-НЕ є защіпкою; спочатку вивчіть її заборонений стан на блоці SR.',
    ],
  ],
  inputs: gatePins,
  outputs: { out: ['Q=NOT(A OR B).', 'Q=НЕ(A АБО B).'] },
  examples: ['logic-gates', 'd-memory'],
};
