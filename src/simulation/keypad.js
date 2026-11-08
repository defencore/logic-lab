import { KEYPAD_COLUMNS, KEYPAD_KEYS, keypadParameterError } from '../components/keypad.js';

/** Ideal isolation: pressed keys feed only their column, with a built-in low idle level. */
export function evaluateKeypad(parameters, inputs) {
  const invalid = keypadParameterError(parameters);
  return Object.fromEntries(
    Array.from({ length: KEYPAD_COLUMNS }, (_, column) => {
      if (invalid) return [`col${column}`, 'X'];
      const rows = KEYPAD_KEYS.filter(
        (key) => key.column === column && (parameters.keys & key.mask) !== 0,
      ).map((key) => inputs[`row${key.row}`]);
      const value = rows.includes(1) ? 1 : rows.every((level) => level === 0) ? 0 : 'X';
      return [`col${column}`, value];
    }),
  );
}
