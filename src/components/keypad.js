export const KEYPAD_ROWS = 4;
export const KEYPAD_COLUMNS = 3;
export const KEYPAD_MAX_MASK = 4095;
export const KEYPAD_MODES = Object.freeze(['hold', 'toggle']);
export const KEYPAD_KEYS = Object.freeze(
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((label, index) =>
    Object.freeze({
      index,
      label,
      row: Math.floor(index / KEYPAD_COLUMNS),
      column: index % KEYPAD_COLUMNS,
      mask: 2 ** index,
    }),
  ),
);

/** Keys store the live or recorded contact mask; UI mode never changes electrical evaluation. */
export function keypadParameterError(parameters) {
  if (!KEYPAD_MODES.includes(parameters.mode)) return 'Keypad mode must be hold or toggle.';
  if (
    !Number.isInteger(parameters.keys) ||
    parameters.keys < 0 ||
    parameters.keys > KEYPAD_MAX_MASK
  )
    return 'Keypad keys must be an integer mask from 0 to 4095.';
  return null;
}
