import { getDefinition } from '../catalog.js';
import { SCENARIO_TYPES, isScenarioType, advanceScenario } from '../scenarios.js';
import { motionParameters, modulationInput } from './models.js';
import {
  TAU,
  unknown,
  logic,
  clamp,
  number,
  complement,
  valueOr,
  active,
  packBits,
} from './signals.js';

const sequential = new Set([
  'sr_latch',
  'd_ff',
  'jk_ff',
  't_ff',
  'register',
  'shift_register',
  'counter',
  'ram',
  'register_file',
  'monostable',
  'servo',
]);
const dynamicTypes = new Set([...sequential, 'stepper', 'fm', ...SCENARIO_TYPES]);

export function advanceState(nodes, runtime, incoming, dt) {
  const updates = new Map();
  for (const node of nodes) {
    if (!dynamicTypes.has(node.type)) continue;
    const i = runtime.signals.inputs[node.id],
      s = runtime.state[node.id];
    const p = { ...getDefinition(node.type).defaults, ...node.params };
    const next = { ...s };
    if (isScenarioType(node.type)) {
      if (node.enabled !== false)
        updates.set(node.id, { ...s, scenario: advanceScenario(node, s.scenario, i, dt) });
      continue;
    }
    if (node.type === 'stepper') {
      const motion = motionParameters(p);
      const step = logic(i.step);
      const connection = (incoming.get(`${node.id}:step`) || [])
        .map((wire) => wire.sourceKey)
        .sort()
        .join('|');
      const enable = incoming.has(`${node.id}:enable`) ? logic(i.enable) : 1;
      const reset = incoming.has(`${node.id}:reset`) ? logic(i.reset) : 0;
      const rising = step === 1 && s.lastStep === 0 && s.stepConnection === connection;
      next.lastStep = step;
      next.stepConnection = connection;
      next.motionWasEnabled = node.enabled !== false && enable === 1 && reset === 0;
      next.motionMoving = 0;
      if (node.enabled !== false) {
        if (motion.valid && !unknown(s.position))
          next.position = clamp(s.position, motion.minimum, motion.maximum);
        if (!motion.valid || unknown(reset)) next.position = 'X';
        else if (reset === 1)
          next.position = clamp(number(p.initial), motion.minimum, motion.maximum);
        else if (rising && enable !== 0) {
          if (unknown(enable) || (s.motionWasEnabled && unknown(logic(i.dir)))) next.position = 'X';
          else if (s.motionWasEnabled && !unknown(s.position)) {
            const direction = logic(i.dir) === 1 ? 1 : -1;
            // Commit position once before sensor feedback is settled for the new location.
            next.position = clamp(
              s.position + direction * motion.distance,
              motion.minimum,
              motion.maximum,
            );
            next.motionMoving = Number(Math.abs(next.position - s.position) > 1e-12);
          }
        }
      }
      updates.set(node.id, next);
      continue;
    }
    if (node.enabled === false) {
      // Disabled sequential components hold state while observing control levels,
      // so reactivation cannot replay an edge that happened while disconnected.
      if (sequential.has(node.type)) {
        next.lastClock = logic(valueOr(i.clk, 0));
        next.lastTrigger = logic(valueOr(i.trigger, 0));
        updates.set(node.id, next);
      }
      continue;
    }
    if (sequential.has(node.type)) {
      const clock = logic(valueOr(i.clk, 0));
      const rising = clock === 1 && s.lastClock === 0;
      next.lastClock = clock;
      const reset = active(i.reset);
      switch (node.type) {
        case 'sr_latch': {
          const set = logic(i.s),
            resetInput = logic(i.r);
          if (set === 1 && resetInput === 1) next.q = 'X';
          else if (set === 1 && resetInput === 0) next.q = 1;
          else if (set === 0 && resetInput === 1) next.q = 0;
          else if (set !== 0 || resetInput !== 0) next.q = 'X';
          break;
        }
        case 'd_ff':
          if (reset) next.q = 0;
          else if (rising) next.q = logic(i.d);
          break;
        case 'jk_ff':
          if (reset) next.q = 0;
          else if (rising) {
            const j = logic(i.j),
              k = logic(i.k);
            if (j === 1 && k === 1) next.q = complement(s.q);
            else if (j === 1 && k === 0) next.q = 1;
            else if (j === 0 && k === 1) next.q = 0;
            else if (j !== 0 || k !== 0) next.q = 'X';
          }
          break;
        case 't_ff':
          if (reset) next.q = 0;
          else if (rising && logic(i.t) === 1) next.q = complement(s.q);
          else if (rising && logic(i.t) !== 0) next.q = 'X';
          break;
        case 'register':
          if (reset) {
            next.q = 0;
            next.qBits = Array(8).fill(0);
          } else if (rising && active(i.enable, 1)) {
            next.qBits = Array.from({ length: 8 }, (_, bit) =>
              logic(runtime.inputs[node.id][`d${bit}`]),
            );
            next.q = packBits(next.qBits);
          }
          break;
        case 'counter':
          if (reset) next.q = 0;
          else if (rising && active(i.enable, 1)) next.q = unknown(s.q) ? 'X' : (s.q + 1) & 255;
          break;
        case 'shift_register':
          if (reset) {
            next.q = 0;
            next.qBits = Array(8).fill(0);
          } else if (rising) {
            next.qBits = [logic(i.d), ...s.qBits.slice(0, 7)];
            next.q = packBits(next.qBits);
          }
          break;
        case 'ram':
          if (rising && active(i.cs, 1) && active(i.we) && !unknown(i.address)) {
            next.memory = [...s.memory];
            next.memoryBits = [...s.memoryBits];
            const data = Array.from({ length: 8 }, (_, bit) =>
              logic(runtime.inputs[node.id][`data${bit}`]),
            );
            next.memoryBits[i.address & 15] = data;
            next.memory[i.address & 15] = packBits(data);
          }
          break;
        case 'register_file':
          if (rising && active(i.we) && !unknown(i.write)) {
            next.memory = [...s.memory];
            next.memoryBits = [...s.memoryBits];
            const data = Array.from({ length: 8 }, (_, bit) =>
              logic(runtime.inputs[node.id][`data${bit}`]),
            );
            next.memoryBits[i.write & 7] = data;
            next.memory[i.write & 7] = packBits(data);
          }
          break;
        case 'monostable': {
          const trigger = logic(valueOr(i.trigger, 0));
          if (reset) next.pulseUntil = -1;
          else if (trigger === 1 && s.lastTrigger === 0 && runtime.time >= s.pulseUntil)
            next.pulseUntil = runtime.time + Math.max(0, number(p.duration, 0.5));
          next.lastTrigger = trigger;
          break;
        }
        case 'servo': {
          next.servoEdges = s.servoEdges.map((edge) => ({ ...edge }));
          next.angles = s.angles.map((angle, index) => {
            const value = i[`s${index + 1}`];
            if (unknown(value)) return value === 'Z' ? 0 : 'X';
            const sources = incoming.get(`${node.id}:s${index + 1}`) || [];
            const isDigital = sources.some(
              (wire) =>
                !getDefinition(wire.sourceType)?.outputs.find((port) => port.id === wire.from.port)
                  ?.analog,
            );
            let duty = value;
            if (isDigital) {
              const edge = next.servoEdges[index];
              const level = logic(value);
              if (level === 1 && edge.previous === 0) {
                if (edge.rise !== null && runtime.time > edge.rise)
                  edge.duty = clamp(edge.high / (runtime.time - edge.rise), 0, 1);
                edge.previousRise = edge.rise;
                edge.rise = runtime.time;
              }
              if (level === 0 && edge.previous === 1 && edge.rise !== null)
                edge.high = runtime.time - edge.rise;
              edge.previous = level;
              duty = edge.duty;
            }
            const minimum = number(p.minDuty, 0.18),
              maximum = Math.max(minimum + 0.000001, number(p.maxDuty, 0.82));
            return (
              (clamp((duty - minimum) / (maximum - minimum), 0, 1) - 0.5) *
              Math.max(0, number(p.range, 180))
            );
          });
          break;
        }
      }
    }
    if (node.type === 'fm' && i.mod !== 'Z' && !unknown(i.mod)) {
      const modulation = modulationInput(node, i.mod, p, incoming);
      next.fmPhase =
        ((s.fmPhase ?? 0) +
          TAU *
            Math.max(0, number(p.carrier, 8)) *
            (1 + clamp(number(p.depth, 0.6), 0, 1) * modulation) *
            dt) %
        TAU;
    }
    updates.set(node.id, next);
  }
  for (const [id, state] of updates) runtime.state[id] = state;
}
