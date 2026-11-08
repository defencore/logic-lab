import { component } from '../definition.js';
import { bit } from '../pins.js';
import { KEYPAD_ROWS, KEYPAD_COLUMNS, KEYPAD_DEFAULTS } from '../../keypad.js';

export const KEYPAD = [
  component(
    'keypad',
    'Matrix keypad · 3×4',
    'Матрична клавіатура · 3×4',
    'io',
    '123',
    Array.from({ length: KEYPAD_ROWS }, (_, row) => bit(`row${row}`, `R${row + 1}`)),
    Array.from({ length: KEYPAD_COLUMNS }, (_, column) => bit(`col${column}`, `C${column + 1}`)),
    KEYPAD_DEFAULTS,
    'Drive one of four rows high and read three columns. Queue timed key pulses, hold physical contacts or latch keys in this isolated teaching matrix.',
    'Подайте 1 на один із чотирьох рядків і читайте три стовпці. Ставте імпульси клавіш у чергу, утримуйте контакти або фіксуйте їх у навчальній матриці з ізоляцією.',
  ),
];
