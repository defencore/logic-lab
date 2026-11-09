import { control, equalBits, mergeBits, risingOptions } from './controls.js';
import { logic, packBits } from './signals.js';

const emptyByte = () => Array(8).fill(0);

export function initialHc595State() {
  return {
    shiftBits: emptyByte(),
    qBits: emptyByte(),
    lastShiftClock: null,
    lastStorageClock: null,
  };
}

export function clearHc595(node, state, inputs, incoming) {
  const reset = control(node, 'mr', inputs, incoming, 1);
  if (reset === 1) return state;
  const zero = emptyByte();
  const shiftBits = reset === 0 ? zero : mergeBits(state.shiftBits, zero);
  return equalBits(shiftBits, state.shiftBits) ? state : { ...state, shiftBits };
}

export function advanceHc595(node, state, inputs, incoming, time) {
  const shiftClock = logic(inputs.srclk);
  const storageClock = logic(inputs.rclk);
  const next = { ...state, lastShiftClock: shiftClock, lastStorageClock: storageClock };
  if (node.enabled === false) return next;

  const storageEdge =
    state.lastStorageClock === null ? [0] : risingOptions(state.lastStorageClock, storageClock);
  if (storageEdge.includes(1)) {
    // A simultaneous SRCLK edge shifts after the storage register samples the old byte.
    const qBits = storageEdge.includes(0)
      ? mergeBits(state.qBits, state.shiftBits)
      : state.shiftBits;
    next.qBits = qBits;
    next.lastByteChange = {
      before: state.qBits,
      after: qBits,
      sequence: (state.lastByteChange?.sequence ?? 0) + 1,
      at: time,
      kind: 'latch',
      definite: storageEdge.length === 1,
    };
  }

  const shiftEdge =
    state.lastShiftClock === null ? [0] : risingOptions(state.lastShiftClock, shiftClock);
  const reset = control(node, 'mr', inputs, incoming, 1);
  if (shiftEdge.includes(1) && reset !== 0) {
    const shifted = [logic(inputs.ser), ...state.shiftBits.slice(0, 7)];
    const candidates = [shifted];
    if (shiftEdge.includes(0)) candidates.push(state.shiftBits);
    if (reset !== 1) candidates.push(emptyByte());
    next.shiftBits = mergeBits(...candidates);
  }
  return next;
}

export function hc595OutputBits(node, state, inputs, incoming) {
  const outputEnable = control(node, 'oe', inputs, incoming);
  if (outputEnable === 0) return state.qBits;
  return Array(8).fill(outputEnable === 1 ? 'Z' : 'X');
}

export function evaluateHc595(node, state, inputs, incoming) {
  return {
    out: packBits(hc595OutputBits(node, state, inputs, incoming)),
    serial: state.shiftBits[7],
  };
}
