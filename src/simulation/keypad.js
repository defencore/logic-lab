import { keypadLayout, keypadParameterError } from '../components/keypad.js';

/** Ideal isolation: pressed keys feed only their column, with a built-in low idle level. */
export function evaluateKeypad(parameters, inputs, type) {
  const invalid = keypadParameterError(parameters, type);
  const { columns, keys } = keypadLayout(type);
  return Object.fromEntries(
    Array.from({ length: columns }, (_, column) => {
      if (invalid) return [`col${column}`, 'X'];
      const rows = keys
        .filter((key) => key.column === column && (parameters.keys & key.mask) !== 0)
        .map((key) => inputs[`row${key.row}`]);
      const value = rows.includes(1) ? 1 : rows.every((level) => level === 0) ? 0 : 'X';
      return [`col${column}`, value];
    }),
  );
}
