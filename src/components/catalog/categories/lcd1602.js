import { component } from '../definition.js';
import { bit, word } from '../pins.js';

export const LCD1602 = [
  component(
    'lcd1602',
    'LCD 1602 · Parallel text',
    'LCD 1602 · Паралельний текст',
    'io',
    'LCD',
    [bit('rs', 'RS'), bit('rw', 'R/W'), bit('e', 'E'), word('d', 'D')],
    [],
    {},
    'A 16×2 character display with HD44780-style 4-bit and 8-bit writes. Tie R/W to logic 0.',
    'Знаковий дисплей 16×2 із 4- та 8-бітним записом за протоколом HD44780. Під’єднайте R/W до логічного 0.',
  ),
];
