import { getDefinition } from '../components/catalog/index.js';
import { number, unknown } from './signals.js';
import { control, choices, consensus, mergeBits, equalBits, withBits } from './controls.js';
import { clearHc595 } from './hc595.js';

export const RESET_TYPES = new Set([
  'd_ff',
  'jk_ff',
  't_ff',
  'register',
  'shift_register',
  'counter',
  'monostable',
]);

export function applyReset(node, state, inputs, incoming) {
  const reset = control(node, 'reset', inputs, incoming);
  if (reset === 0) return state;
  if (node.type === 'monostable')
    return reset === 1
      ? { ...state, pulseUntil: -1, pulseMaybe: false }
      : { ...state, pulseMaybe: state.pulseUntil >= 0 || state.pulseMaybe };
  if (state.qBits) {
    const field = node.type === 'shift_register' ? 'lastShift' : 'lastByteChange';
    return withBits(
      state[field] ? { ...state, [field]: null } : state,
      reset === 1 ? Array(8).fill(0) : mergeBits(state.qBits, Array(8).fill(0)),
    );
  }
  return { ...state, q: reset === 1 ? 0 : consensus([state.q, 0]) };
}

/** Commit only stable control levels; evaluate() must never mutate a latch. */
export function advanceAsynchronous(nodes, runtime, incoming) {
  let changed = false;
  const updates = new Map();
  for (const node of nodes) {
    if (node.enabled === false) continue;
    const state = runtime.state[node.id],
      inputs = runtime.inputs[node.id];
    let next = state;
    if (node.type === 'sr_latch') {
      const q = consensus(
        choices(inputs.s).flatMap((s) =>
          choices(inputs.r).map((r) => (s && r ? 'X' : s ? 1 : r ? 0 : state.q)),
        ),
      );
      next = { ...state, q };
    } else if (node.type === 'schmitt') {
      const p = { ...getDefinition(node.type).defaults, ...node.params };
      const low = Math.min(number(p.low, 1.5), number(p.high, 3.5));
      const high = Math.max(number(p.low, 1.5), number(p.high, 3.5));
      const value = inputs.in;
      next = { ...state, q: unknown(value) ? 'X' : value >= high ? 1 : value <= low ? 0 : state.q };
    } else if (node.type === 'hc595') next = clearHc595(node, state, inputs, incoming);
    else if (RESET_TYPES.has(node.type)) next = applyReset(node, state, inputs, incoming);
    const differs =
      next.q !== state.q ||
      next.pulseUntil !== state.pulseUntil ||
      next.pulseMaybe !== state.pulseMaybe ||
      next.lastShift !== state.lastShift ||
      next.lastByteChange !== state.lastByteChange ||
      next.shiftBits !== state.shiftBits ||
      (next.qBits && !equalBits(next.qBits, state.qBits));
    if (differs) {
      updates.set(node.id, next);
      changed = true;
    }
  }
  for (const [id, state] of updates) runtime.state[id] = state;
  return changed;
}
