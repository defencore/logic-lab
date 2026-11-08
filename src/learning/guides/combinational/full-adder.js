import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A full adder adds A, B and an incoming carry, making it suitable for chaining into a multi-bit adder.',
    'Повний суматор додає A, B і вхід перенесення та підходить для каскадування в багаторозрядний суматор.',
  ],
  steps: [
    ['Connect three switches to A, B and Ci.', 'Підключіть три перемикачі до A, B та Ci.'],
    [
      'Connect Σ and Co to LEDs labeled Sum and Carry.',
      'Підключіть Σ і Co до світлодіодів Sum і Carry.',
    ],
    [
      'Test inputs 111 and then tie Ci to Ground to compare with a half adder.',
      'Перевірте 111, потім підключіть Ci до Землі для порівняння з напівсуматором.',
    ],
  ],
  experiment: [
    'Connect Co of one full adder to Ci of a second one; it becomes the next bit’s incoming carry.',
    'З’єднайте Co першого повного суматора з Ci другого: це буде вхід перенесення наступного розряду.',
  ],
  expected: [
    'A+B+Ci=3 produces Co=1 and Sum=1, binary 11. With Ci=0 it behaves as a half adder.',
    'A+B+Ci=3 дає Co=1 і Sum=1, двійкове 11. При Ci=0 блок працює як напівсуматор.',
  ],
  pitfalls: [
    [
      'Do not leave Ci unwired when you mean zero; connect Ground or a known carry signal.',
      'Не залишайте Ci непідключеним, якщо потрібен нуль; підключіть Землю або визначений сигнал перенесення.',
    ],
    [
      'Co has weight 2 relative to this stage’s Sum; it is not a second copy of the sum bit.',
      'Co має вагу 2 відносно Sum цього розряду; це не копія біта суми.',
    ],
  ],
  inputs: {
    ...gatePins,
    cin: [
      'Ci: one-bit carry from the less significant stage.',
      'Ci: однобітне перенесення з молодшого розряду.',
    ],
  },
  outputs: {
    sum: ['Σ=(A+B+Ci) modulo 2.', 'Σ=(A+B+Ci) за модулем 2.'],
    carry: [
      'Co=1 when at least two of the three inputs are 1.',
      'Co=1, коли принаймні два з трьох входів мають 1.',
    ],
  },
  examples: ['full-adder'],
};
