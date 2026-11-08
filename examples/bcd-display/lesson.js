export default {
  id: 'bcd-display',
  label: 'BCD display',
  ua: 'BCD-індикатор',
  category: 'basics',
  level: 'beginner',
  description: 'Decode a four-bit decimal digit into a seven-segment pattern.',
  descriptionUa: 'Перетворіть чотирибітну десяткову цифру на семисегментний рисунок.',
  lesson: {
    en: {
      goal: 'Distinguish a digit code from the wires that light its segments.',
      steps: [
        {
          title: 'Read digit 5',
          text: 'The input value starts at 5. The four BCD lines carry its code separately; the decoder produces the eight-bit segment mask that lights a 5.',
          nodes: ['digit', 'decoder', 'display'],
        },
        {
          title: 'Choose another digit',
          text: 'Select the Digit component header. In Parameters, change Value to 0, then 8, then 9. The display updates immediately without Run.',
          nodes: ['digit', 'display'],
        },
        {
          title: 'Try an invalid BCD digit',
          text: 'Set Value to 10. BCD only defines 0–9, so this decoder blanks the display. Restore a value from 0 to 9.',
          nodes: ['digit', 'decoder'],
        },
      ],
      expected:
        'The decoder output is a segment mask, not the original number; digit 8 activates all seven segments.',
    },
    ua: {
      goal: 'Відрізніть код цифри від дротів її окремих сегментів.',
      steps: [
        {
          title: 'Прочитайте цифру 5',
          text: 'Вхідне значення — 5. Чотири окремі лінії BCD передають код; декодер формує восьмибітну маску сегментів цифри 5.',
          nodes: ['digit', 'decoder', 'display'],
        },
        {
          title: 'Оберіть іншу цифру',
          text: 'Оберіть заголовок Digit. У параметрах змініть Значення на 0, потім 8 і 9. Індикатор оновиться відразу, без Запуску.',
          nodes: ['digit', 'display'],
        },
        {
          title: 'Спробуйте недопустимий BCD',
          text: 'Задайте Значення 10. BCD визначає лише цифри 0–9, тому цей декодер гасить індикатор. Поверніть значення від 0 до 9.',
          nodes: ['digit', 'decoder'],
        },
      ],
      expected:
        'Вихід декодера — маска сегментів, а не початкове число; цифра 8 вмикає всі сім сегментів.',
    },
  },
  circuitPath: 'examples/bcd-display/circuit.json',
  labPath: 'examples/bcd-display/README.md',
  lab: {
    duration: 15,
    objectives: {
      en: [
        'Distinguish a digit code from the wires that light its segments.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Відрізніть код цифри від дротів її окремих сегментів.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'The input value starts at 5. The four BCD lines carry its code separately; the decoder produces the eight-bit segment mask that lights a 5.',
        'Select the Digit component header. In Parameters, change Value to 0, then 8, then 9. The display updates immediately without Run.',
        'Set Value to 10. BCD only defines 0–9, so this decoder blanks the display. Restore a value from 0 to 9.',
      ],
      ua: [
        'Вхідне значення — 5. Чотири окремі лінії BCD передають код; декодер формує восьмибітну маску сегментів цифри 5.',
        'Оберіть заголовок Digit. У параметрах змініть Значення на 0, потім 8 і 9. Індикатор оновиться відразу, без Запуску.',
        'Задайте Значення 10. BCD визначає лише цифри 0–9, тому цей декодер гасить індикатор. Поверніть значення від 0 до 9.',
      ],
    },
    questions: {
      en: [
        'Why does the display need a decoder rather than the digit byte directly?',
        'What does the decoder do with input 10?',
        'Which segment mask makes an 8?',
      ],
      ua: [
        'Чому індикатору потрібен декодер замість прямого коду цифри?',
        'Що декодер робить зі входом 10?',
        'Яка маска сегментів утворює 8?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A table of digit codes 0, 5, 8, 9 and 10 with decoded masks and observed display shapes.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця кодів 0, 5, 8, 9 та 10 з масками й виглядом індикатора.',
      ],
    },
  },
};
