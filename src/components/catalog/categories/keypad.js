import { component } from '../definition.js';
import { bit } from '../pins.js';
import { KEYPAD_ROWS, KEYPAD_COLUMNS } from '../../keypad.js';

export const KEYPAD = [
  component(
    'keypad',
    'Matrix keypad · 3×4',
    'Матрична клавіатура · 3×4',
    'io',
    '123',
    Array.from({ length: KEYPAD_ROWS }, (_, row) => bit(`row${row}`, `R${row + 1}`)),
    Array.from({ length: KEYPAD_COLUMNS }, (_, column) => bit(`col${column}`, `C${column + 1}`)),
    { mode: 'hold', keys: 0 },
    'Drive one of four rows high and read three columns. An ideal diode-isolated active-high teaching matrix; hold or latch keys.',
    'Подайте 1 на один із чотирьох рядків і читайте три стовпці. Навчальна матриця з ідеальною діодною ізоляцією; утримання або фіксація клавіш.',
  ),
];
