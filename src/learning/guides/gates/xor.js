import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'XOR detects different bits and supplies the sum bit in a half adder.',
    'XOR виявляє різні біти та формує біт суми в напівсуматорі.',
  ],
  steps: [
    [
      'Feed switches A and B into an XOR gate.',
      'Подайте сигнали перемикачів A і B на елемент XOR.',
    ],
    [
      'Connect its Q output to an LED labeled Sum.',
      'Підключіть вихід Q до світлодіода з назвою Sum.',
    ],
    ['Check 00,01,10,11 and compare with OR.', 'Перевірте 00,01,10,11 та порівняйте з АБО.'],
  ],
  experiment: [
    'Send the same A and B to an AND gate as well. Use its output as Carry.',
    'Подайте ті самі A і B також на І. Використайте його вихід як Carry.',
  ],
  expected: [
    'XOR gives 0,1,1,0. For 1+1, Sum=0 and Carry=1, which represents binary 10.',
    'XOR дає 0,1,1,0. Для 1+1 маємо Sum=0 і Carry=1, тобто двійкове 10.',
  ],
  pitfalls: [
    [
      'XOR differs from OR at input 11: two asserted inputs cancel in the sum bit.',
      'XOR відрізняється від АБО при 11: дві одиниці взаємно скасовуються в біті суми.',
    ],
    [
      'An unknown operand normally makes the XOR output X; one valid input cannot determine parity alone.',
      'Невідомий аргумент зазвичай дає X на виході XOR; один визначений вхід не визначає парність.',
    ],
  ],
  inputs: gatePins,
  outputs: {
    out: ['Q=A XOR B; high for unequal inputs.', 'Q=A XOR B; одиниця для різних входів.'],
  },
  examples: ['logic-gates', 'half-adder'],
};
