import { component } from '../definition.js';
import { bit } from '../pins.js';

export const GATES = [
  ...[
    [
      'and',
      'AND gate',
      'Елемент І',
      '&',
      'High when both inputs are high.',
      'Одиниця, коли обидва входи мають одиницю.',
    ],
    [
      'or',
      'OR gate',
      'Елемент АБО',
      '≥1',
      'High when either input is high.',
      'Одиниця, коли принаймні один вхід має одиницю.',
    ],
    ['nand', 'NAND gate', 'Елемент І-НЕ', '&̅', 'The inverted AND function.', 'Інверсія функції І.'],
    [
      'nor',
      'NOR gate',
      'Елемент АБО-НЕ',
      '≥1̅',
      'The inverted OR function.',
      'Інверсія функції АБО.',
    ],
    [
      'xor',
      'XOR gate',
      'Виключне АБО',
      '=1',
      'High when the inputs differ.',
      'Одиниця, коли входи відрізняються.',
    ],
    [
      'xnor',
      'XNOR gate',
      'Еквівалентність',
      '=̅1',
      'High when the inputs match.',
      'Одиниця, коли входи однакові.',
    ],
  ].map(([type, label, ua, symbol, description, descriptionUa]) =>
    component(
      type,
      label,
      ua,
      'gates',
      symbol,
      [bit('a'), bit('b')],
      [bit('out', 'Q')],
      {},
      description,
      descriptionUa,
    ),
  ),
  component(
    'not',
    'NOT gate',
    'Інвертор',
    'gates',
    '1̅',
    [bit('a')],
    [bit('out', 'Q')],
    {},
    'Inverts a digital signal.',
    'Інвертує цифровий сигнал.',
  ),
];
