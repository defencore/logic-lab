import { POTENTIOMETER_RANGE } from '../components/peripheral-inputs.js';
import { keypadLayout } from '../components/keypad.js';

export const SOURCE_PARAMETERS = Object.freeze({
  switch: { value: [0, 1, true] },
  button: { value: [0, 1, true] },
  contact_switch: { value: [0, 1, true] },
  potentiometer: { value: POTENTIOMETER_RANGE },
  keypad: { keys: [0, keypadLayout('keypad').maxMask, true] },
  keypad_4x4: { keys: [0, keypadLayout('keypad_4x4').maxMask, true] },
  hotkey: { value: [0, 1, true] },
  bus_input: { value: [0, 255, true] },
  clock: { frequency: [0, 1000], duty: [0, 1] },
  pwm: { frequency: [0, 1000], duty: [0, 1] },
  am: { frequency: [0, 1000], carrier: [0, 1000], depth: [0, 1], amplitude: [0, 1000] },
  fm: { frequency: [0, 1000], carrier: [0, 1000], depth: [0, 1], amplitude: [0, 1000] },
});
