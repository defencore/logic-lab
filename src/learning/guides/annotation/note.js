// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A text note explains a circuit’s assumptions, signal names or expected results directly on the canvas.',
    'Текстова нотатка пояснює припущення схеми, назви сигналів чи очікувані результати безпосередньо на полотні.',
  ],
  steps: [
    [
      'Place Text note next to the circuit section it explains.',
      'Розмістіть Текстову нотатку біля частини схеми, яку вона пояснює.',
    ],
    [
      'Edit Text in Properties and choose a readable Color.',
      'Відредагуйте Text у властивостях та оберіть читабельний Color.',
    ],
    [
      'Drag the note away from ports and wires so it stays easy to read.',
      'Перетягніть нотатку подалі від контактів і дротів, щоб її було легко читати.',
    ],
  ],
  experiment: [
    'Write “A=B=1 → Carry=1, Sum=0” beside a half adder, then verify it using the switches.',
    'Напишіть «A=B=1 → Carry=1, Sum=0» біля напівсуматора та перевірте перемикачами.',
  ],
  expected: [
    'The annotation moves with its own position and is saved with the circuit without changing any signal.',
    'Анотація має власне положення, зберігається зі схемою та не змінює сигнали.',
  ],
  pitfalls: [
    [
      'A note has no electrical pins and cannot act as a wire label, signal source or logic expression.',
      'Нотатка не має електричних контактів і не працює як мітка дроту, джерело сигналу чи логічний вираз.',
    ],
  ],
  examples: ['half-adder', 'ram'],
};
