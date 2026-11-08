import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'OR combines independent reasons to activate an output, such as two alarm sensors.',
    'АБО об’єднує незалежні причини ввімкнення виходу, наприклад два датчики тривоги.',
  ],
  steps: [
    [
      'Place an OR gate between two switches and an LED.',
      'Розмістіть елемент АБО між двома перемикачами та світлодіодом.',
    ],
    [
      'Wire each switch to a different input, A or B, and Q to the LED.',
      'Під’єднайте кожен перемикач до окремого входу A або B, а Q — до світлодіода.',
    ],
    [
      'Start with both inputs at 0, then activate each sensor separately.',
      'Почніть із двох нулів, потім увімкніть кожен датчик окремо.',
    ],
  ],
  experiment: [
    'Set A=1 and toggle B. Then set A=0 and toggle B again.',
    'Встановіть A=1 і перемикайте B. Потім встановіть A=0 та повторіть.',
  ],
  expected: [
    'Any high input keeps Q high. Only 00 produces 0; 01,10,11 produce 1.',
    'Будь-яка одиниця утримує Q у 1. Лише 00 дає 0; 01,10,11 дають 1.',
  ],
  pitfalls: [
    [
      'OR also outputs 1 when both inputs are 1; use XOR if exactly one condition should count.',
      'АБО дає 1 і при двох одиницях; використовуйте XOR, якщо потрібна рівно одна умова.',
    ],
    [
      'A known 1 dominates a floating input, but both inputs still need explicit wiring in a finished circuit.',
      'Визначена 1 переважає непідключений вхід, але у завершеній схемі слід підключити обидва входи.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    out: [
      'Q=A OR B; high when at least one input is high.',
      'Q=A АБО B; одиниця, якщо хоча б один вхід має одиницю.',
    ],
  },
  examples: ['logic-gates'],
};
