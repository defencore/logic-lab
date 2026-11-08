import { gatePins } from '../pin-descriptions.js';

// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An AND gate models a permission that requires two conditions at once, such as an armed system and a pressed button.',
    'Елемент І моделює дозвіл за одночасного виконання двох умов, наприклад увімкненого захисту та натиснутої кнопки.',
  ],
  steps: [
    [
      'Add two Toggle switches, an AND gate and an LED.',
      'Додайте два перемикачі, елемент І та світлодіод.',
    ],
    [
      'Connect the switches to A and B; connect Q to the LED input D.',
      'Підключіть перемикачі до A і B, а Q — до входу D світлодіода.',
    ],
    [
      'Try all four input pairs: 00, 01, 10 and 11.',
      'Перевірте всі чотири пари входів: 00, 01, 10 та 11.',
    ],
  ],
  experiment: [
    'Treat A as permission and B as a request. Leave either one at 0 while toggling the other.',
    'Вважайте A дозволом, а B запитом. Залиште один вхід у 0 та перемикайте інший.',
  ],
  expected: [
    'Only A=1 and B=1 light the LED. The output order for 00,01,10,11 is 0,0,0,1.',
    'Світлодіод горить лише при A=1 і B=1. Виходи для 00,01,10,11: 0,0,0,1.',
  ],
  pitfalls: [
    [
      'A disconnected input is floating Z, not an automatic zero. Drive both inputs for a complete truth table.',
      'Непідключений вхід має стан Z, а не автоматичний нуль. Задайте обидва входи для повної таблиці істинності.',
    ],
    [
      'A definite 0 controls AND even if the other input is unknown; this does not fix the floating connection.',
      'Визначений 0 задає вихід І навіть при невідомому іншому вході; це не усуває непідключений контакт.',
    ],
  ],
  inputs: gatePins,
  outputs: { out: ['Q=A AND B, a single digital bit.', 'Q=A І B, один цифровий біт.'] },
  examples: ['logic-gates', 'half-adder'],
};
