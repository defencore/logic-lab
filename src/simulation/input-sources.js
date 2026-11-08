import { KEYPAD_MAX_MASK } from '../components/keypad.js';

export const SOURCE_PARAMETERS = Object.freeze({
  switch: { value: [0, 1, true] },
  button: { value: [0, 1, true] },
  keypad: { keys: [0, KEYPAD_MAX_MASK, true] },
  hotkey: { value: [0, 1, true] },
  bus_input: { value: [0, 255, true] },
  clock: { frequency: [0, 1000], duty: [0, 1] },
  pwm: { frequency: [0, 1000], duty: [0, 1] },
  am: { frequency: [0, 1000], carrier: [0, 1000], depth: [0, 1], amplitude: [0, 1000] },
  fm: { frequency: [0, 1000], carrier: [0, 1000], depth: [0, 1], amplitude: [0, 1000] },
});
