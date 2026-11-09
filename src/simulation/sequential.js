import { getDefinition } from '../components/catalog/index.js';
import { logic, unknown, number, complement, clamp } from './signals.js';
import {
  control,
  choices,
  consensus,
  bitInputs,
  byteBits,
  mergeBits,
  withBits,
  risingOptions,
  incrementBits,
} from './controls.js';
import { applyReset, RESET_TYPES } from './asynchronous.js';
import { writeMemory } from './memory.js';
import { advanceHc595 } from './hc595.js';
import { advanceLcd1602 } from './lcd1602.js';
import { motionParameters } from './models.js';

const clocked = new Set([
  'd_ff',
  'jk_ff',
  't_ff',
  'register',
  'shift_register',
  'counter',
  'ram',
  'eeprom',
  'register_file',
]);
const chooseState = (edge, hold, capture) =>
  edge.length === 1 ? (edge[0] ? capture : hold) : consensus([hold, capture]);
const chooseBits = (edge, hold, capture) =>
  edge.length === 1 ? (edge[0] ? capture : hold) : mergeBits(hold, capture);

function capture(node, state, inputs, incoming, edges, time) {
  if (!edges.includes(1)) return state;
  if (node.type === 'ram' || node.type === 'eeprom' || node.type === 'register_file')
    return writeMemory(node, state, inputs, incoming, edges, time);
  let next = { ...state };
  if (node.type === 'd_ff') next.q = chooseState(edges, state.q, logic(inputs.d));
  else if (node.type === 'jk_ff') {
    const q = consensus(
      choices(inputs.j).flatMap((j) =>
        choices(inputs.k).map((k) => (j && k ? complement(state.q) : j ? 1 : k ? 0 : state.q)),
      ),
    );
    next.q = chooseState(edges, state.q, q);
  } else if (node.type === 't_ff') {
    const q = consensus(choices(inputs.t).map((t) => (t ? complement(state.q) : state.q)));
    next.q = chooseState(edges, state.q, q);
  } else {
    const hold = state.qBits ?? byteBits(state.q);
    const enable =
      node.type === 'shift_register' ? 1 : control(node, 'enable', inputs, incoming, 1);
    let captured;
    if (node.type === 'shift_register') captured = [logic(inputs.d), ...hold.slice(0, 7)];
    else {
      const value = node.type === 'counter' ? incrementBits(hold) : bitInputs(inputs, 'd');
      captured = enable === 1 ? value : enable === 0 ? hold : mergeBits(hold, value);
    }
    next = withBits(next, chooseBits(edges, hold, captured));
    if (enable !== 0 && control(node, 'reset', inputs, incoming) === 0) {
      const field = node.type === 'shift_register' ? 'lastShift' : 'lastByteChange';
      next[field] = {
        sequence: (state[field]?.sequence || 0) + 1,
        at: time,
        kind:
          node.type === 'shift_register' ? 'shift' : node.type === 'counter' ? 'count' : 'capture',
        definite: edges.length === 1 && enable === 1,
        ...(node.type === 'shift_register' ? { ser: logic(inputs.d) } : {}),
        before: [...hold],
        after: [...next.qBits],
      };
    }
  }
  return RESET_TYPES.has(node.type) ? applyReset(node, next, inputs, incoming) : next;
}

function advanceStepper(node, state, inputs, incoming) {
  const p = { ...getDefinition(node.type).defaults, ...node.params };
  const motion = motionParameters(p);
  const step = logic(inputs.step);
  const connection = (incoming.get(`${node.id}:step`) || [])
    .map((wire) => wire.sourceKey)
    .sort()
    .join('|');
  const enable = control(node, 'enable', inputs, incoming, 1);
  const reset = control(node, 'reset', inputs, incoming);
  const edges = state.stepConnection === connection ? risingOptions(state.lastStep, step) : [0];
  const next = {
    ...state,
    lastStep: step,
    stepConnection: connection,
    motionWasEnabled: node.enabled !== false && enable === 1 && reset === 0,
  };
  if (node.enabled === false) return next;
  if (!motion.valid) return { ...next, position: 'X' };
  let position = unknown(state.position)
    ? 'X'
    : clamp(state.position, motion.minimum, motion.maximum);
  if (edges.includes(1) && enable !== 0) {
    let moved = position;
    if (unknown(enable) || (state.motionWasEnabled && unknown(logic(inputs.dir)))) moved = 'X';
    else if (state.motionWasEnabled && !unknown(position)) {
      const direction = logic(inputs.dir) === 1 ? 1 : -1;
      moved = clamp(position + direction * motion.distance, motion.minimum, motion.maximum);
    }
    position = edges.includes(0) ? consensus([position, moved]) : moved;
    if (!unknown(position))
      next.motionMoving ||= Number(Math.abs(position - state.position) > 1e-12);
  }
  const initial = clamp(number(p.initial), motion.minimum, motion.maximum);
  next.position = reset === 1 ? initial : reset === 0 ? position : consensus([position, initial]);
  return next;
}

function advancePulse(node, state, inputs, incoming, time) {
  const level = logic(inputs.trigger),
    edges = risingOptions(state.lastTrigger, level);
  let next = { ...state, lastTrigger: level };
  if (node.enabled !== false && edges.includes(1) && time >= state.pulseUntil) {
    const p = { ...getDefinition(node.type).defaults, ...node.params };
    next.pulseUntil = time + Math.max(0, number(p.duration, 0.5));
    next.pulseMaybe = edges.includes(0);
  }
  return node.enabled === false ? next : applyReset(node, next, inputs, incoming);
}

/** Each wave samples a shared stable snapshot; a derived clock may trigger a later wave. */
export function advanceSequential(nodes, runtime, incoming) {
  const updates = new Map();
  for (const node of nodes) {
    const state = runtime.state[node.id],
      inputs = runtime.inputs[node.id];
    let next;
    if (node.type === 'stepper') next = advanceStepper(node, state, inputs, incoming);
    else if (node.type === 'hc595')
      next = advanceHc595(node, state, inputs, incoming, runtime.time);
    else if (node.type === 'lcd1602') next = advanceLcd1602(node, state, inputs);
    else if (node.type === 'monostable')
      next = advancePulse(node, state, inputs, incoming, runtime.time);
    else if (clocked.has(node.type)) {
      const clock = logic(inputs.clk),
        edges = state.lastClock === null ? [0] : risingOptions(state.lastClock, clock);
      next =
        node.enabled === false
          ? { ...state }
          : capture(node, state, inputs, incoming, edges, runtime.time);
      next = { ...next, lastClock: clock };
    } else continue;
    if (Object.entries(next).some(([key, value]) => value !== state[key]))
      updates.set(node.id, next);
  }
  for (const [id, state] of updates) runtime.state[id] = state;
  return updates.size > 0;
}
