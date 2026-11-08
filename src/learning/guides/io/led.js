// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An LED makes one digital bit visible without changing that signal.',
    'Світлодіод показує один цифровий біт, не змінюючи сигнал.',
  ],
  steps: [
    [
      'Add an LED near the output you want to observe.',
      'Додайте світлодіод біля виходу, який потрібно спостерігати.',
    ],
    [
      'Connect any individual digital output directly to D; each data-bit output can drive an LED.',
      'Підключіть окремий цифровий вихід безпосередньо до D; кожен вихід біта може керувати світлодіодом.',
    ],
    [
      'Set Color in Properties and run or change the source switch.',
      'Задайте Color у властивостях та запустіть симуляцію або змініть перемикач.',
    ],
  ],
  experiment: [
    'Watch the Sum and Carry LEDs of the half-adder example for all input combinations.',
    'Перевірте світлодіоди Sum і Carry в прикладі напівсуматора для всіх комбінацій входів.',
  ],
  expected: [
    'D=1 lights the indicator and D=0 turns it off; its trace records the input bit.',
    'D=1 вмикає індикатор, D=0 вимикає; осцилограма записує вхідний біт.',
  ],
  pitfalls: [
    [
      'A dark LED does not prove a valid zero: inspect the pin for floating Z or conflicting X.',
      'Темний світлодіод не доводить визначений нуль: перевірте контакт на Z або конфлікт X.',
    ],
    [
      'This educational LED has no current or resistor model; Color changes its appearance, not its logic.',
      'Навчальний світлодіод не моделює струм або резистор; Color змінює вигляд, а не логіку.',
    ],
  ],
  inputs: {
    in: ['D: the single digital bit to display.', 'D: один цифровий біт для відображення.'],
  },
  examples: ['half-adder', 'logic-gates', 'counter'],
};
