export const KEYPAD_ROWS = 4;
export const KEYPAD_COLUMNS = 3;
export const KEYPAD_MAX_MASK = 4095;
export const KEYPAD_MODES = Object.freeze(['pulse', 'hold', 'toggle']);
export const KEYPAD_PULSE_MIN = 0.02;
export const KEYPAD_PULSE_MAX = 10;
export const KEYPAD_DEFAULTS = Object.freeze({ mode: 'pulse', keys: 0, pulseDuration: 0.04 });
function keysFor(labels, columns) {
  return Object.freeze(
    labels.map((label, index) =>
      Object.freeze({
        index,
        label,
        row: Math.floor(index / columns),
        column: index % columns,
        mask: 2 ** index,
      }),
    ),
  );
}
export const KEYPAD_KEYS = keysFor(
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'],
  KEYPAD_COLUMNS,
);
const layouts = new Map([
  ['keypad', { columns: KEYPAD_COLUMNS, keys: KEYPAD_KEYS, maxMask: KEYPAD_MAX_MASK }],
  [
    'keypad_4x4',
    {
      columns: 4,
      keys: keysFor(
        ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'],
        4,
      ),
      maxMask: 65535,
    },
  ],
]);
export const keypadLayout = (type = 'keypad') => layouts.get(type);
export const isKeypad = (type) => layouts.has(type);

/** Keys store the live or recorded contact mask; UI mode never changes electrical evaluation. */
export function keypadParameterError(parameters, type = 'keypad') {
  const { maxMask } = keypadLayout(type);
  if (!KEYPAD_MODES.includes(parameters.mode)) return 'Keypad mode must be pulse, hold or toggle.';
  if (!Number.isInteger(parameters.keys) || parameters.keys < 0 || parameters.keys > maxMask)
    return `Keypad keys must be an integer mask from 0 to ${maxMask}.`;
  const duration =
    parameters.pulseDuration === undefined
      ? KEYPAD_DEFAULTS.pulseDuration
      : parameters.pulseDuration;
  if (
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration < KEYPAD_PULSE_MIN ||
    duration > KEYPAD_PULSE_MAX
  )
    return 'Keypad pulseDuration must be a finite number from 0.02 to 10 simulated seconds.';
  return null;
}
