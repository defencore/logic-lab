import { getDefinition } from '../components/catalog/index.js';
import { hotkeyBindingError } from '../components/catalog/hotkey-bindings.js';
import {
  isScenarioType,
  initialScenarioState,
  evaluateScenario,
} from '../scenes/models/scenarios/index.js';
import { readMemoryBits } from './memory.js';
import { initialServoState } from './servo.js';
import { periodicLevel } from './timing.js';
import { evaluateKeypad } from './keypad.js';
import { TAU, unknown, logic, clamp, number, complement, allKnown, packBits } from './signals.js';

const decimalSegments = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
export function motionParameters(p) {
  const stepsPerRevolution = number(p.stepsPerRevolution, NaN);
  const microsteps = number(p.microsteps, NaN);
  const lead = number(p.lead, NaN);
  const minimum = number(p.min, NaN);
  const maximum = number(p.max, NaN);
  const valid =
    Number.isInteger(stepsPerRevolution) &&
    stepsPerRevolution > 0 &&
    Number.isInteger(microsteps) &&
    microsteps > 0 &&
    lead > 0 &&
    Number.isFinite(lead) &&
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    minimum <= maximum;
  return { valid, lead, minimum, maximum, distance: lead / (stepsPerRevolution * microsteps) };
}

export function initialState(node) {
  if (isScenarioType(node.type)) return { scenario: initialScenarioState(node) };
  const parameters = { ...getDefinition(node.type)?.defaults, ...node.params };
  const initial = Math.round(number(parameters.initial));
  if (['d_ff', 'jk_ff', 't_ff', 'sr_latch', 'schmitt'].includes(node.type))
    return { q: Number(initial !== 0), lastClock: 0 };
  if (['register', 'shift_register'].includes(node.type))
    return {
      q: initial & 255,
      qBits: Array.from({ length: 8 }, (_, bit) => (initial >> bit) & 1),
      lastClock: 0,
    };
  if (node.type === 'counter')
    return {
      q: initial & 255,
      qBits: Array.from({ length: 8 }, (_, bit) => (initial >> bit) & 1),
      lastClock: 0,
    };
  if (node.type === 'ram' || node.type === 'register_file') {
    const size = node.type === 'register_file' ? 8 : 16;
    return {
      memory: Array(size).fill(0),
      memoryBits: Array.from({ length: size }, () => Array(8).fill(0)),
      lastClock: 0,
    };
  }
  if (node.type === 'monostable') return { lastTrigger: 0, pulseUntil: -1, pulseMaybe: false };
  if (node.type === 'servo') return initialServoState();
  if (node.type === 'stepper') {
    const motion = motionParameters(parameters);
    return {
      position: motion.valid
        ? clamp(number(parameters.initial), motion.minimum, motion.maximum)
        : 0,
      lastStep: null,
      stepConnection: null,
      motionWasEnabled: false,
      motionMoving: 0,
    };
  }
  if (node.type === 'fm') return { fmPhase: 0 };
  return {};
}

export function modulationInput(node, value, p, incoming) {
  if (unknown(value)) return 'X';
  const sources = (incoming.get(`${node.id}:mod`) || [])
    .map((wire) =>
      getDefinition(wire.sourceType)?.outputs.find((port) => port.id === wire.from.port),
    )
    .filter(Boolean);
  if (sources.length && sources.every((port) => !port.analog)) {
    const width = Math.max(...sources.map((port) => port.width || 1));
    return clamp((value / (2 ** width - 1)) * 2 - 1, -1, 1);
  }
  return clamp(value / Math.max(number(p.amplitude, 5) / 2, 0.000001) - 1, -1, 1);
}

export function evaluate(node, runtime, incoming) {
  const definition = getDefinition(node.type);
  if (node.enabled === false)
    return Object.fromEntries(definition.signals.outputs.map((port) => [port.id, 'Z']));
  const p = { ...definition.defaults, ...node.params };
  const i = runtime.signals.inputs[node.id];
  const s = runtime.state[node.id];
  if (isScenarioType(node.type)) return evaluateScenario(node, s.scenario, i);
  const a = logic(i.a),
    b = logic(i.b);
  const out = (value) => ({ out: value });
  const qout = () => ({ q: s.q, nq: complement(s.q) });
  switch (node.type) {
    case 'gnd':
    case 'pulldown':
      return out(0);
    case 'vcc':
    case 'pullup':
      return out(1);
    case 'button':
      return out(p.value === 0 || p.value === 1 ? p.value : 'X');
    case 'keypad':
      return evaluateKeypad(p, i);
    case 'switch':
      return out(Number(number(p.value) !== 0));
    case 'hotkey':
      if (
        hotkeyBindingError(p.binding) ||
        !['hold', 'inverted', 'toggle'].includes(p.mode) ||
        ![0, 1].includes(p.value)
      )
        return out('X');
      return out(p.mode === 'inverted' ? 1 - p.value : p.value);
    case 'bus_input': {
      const value = Math.round(clamp(number(p.value), 0, 255));
      return { out: value, nibble: value & 15, address: value & 7 };
    }
    case 'clock':
      return out(
        periodicLevel(
          'clock',
          runtime.time,
          Math.max(0, number(p.frequency, 1)),
          clamp(number(p.duty, 0.5), 0, 1),
        ),
      );
    case 'and':
    case 'nand': {
      const result = a === 0 || b === 0 ? 0 : a === 1 && b === 1 ? 1 : 'X';
      return out(node.type === 'nand' ? complement(result) : result);
    }
    case 'or':
    case 'nor': {
      const result = a === 1 || b === 1 ? 1 : a === 0 && b === 0 ? 0 : 'X';
      return out(node.type === 'nor' ? complement(result) : result);
    }
    case 'xor':
    case 'xnor': {
      const result = allKnown(a, b) ? a ^ b : 'X';
      return out(node.type === 'xnor' ? complement(result) : result);
    }
    case 'not':
      return out(complement(a));
    case 'mux':
    case 'demux':
    case 'tristate':
    case 'splitter':
    case 'merger':
      // These components route individual contacts in outputContacts.
      return {};
    case 'half_adder':
      return allKnown(a, b)
        ? { sum: a ^ b, carry: a & b }
        : { sum: 'X', carry: a === 0 || b === 0 ? 0 : 'X' };
    case 'full_adder': {
      const c = logic(i.cin);
      return allKnown(a, b, c)
        ? { sum: (a + b + c) & 1, carry: Number(a + b + c >= 2) }
        : {
            sum: 'X',
            carry:
              [a, b, c].filter((v) => v === 1).length >= 2
                ? 1
                : [a, b, c].filter((v) => v === 0).length >= 2
                  ? 0
                  : 'X',
          };
    }
    case 'comparator':
      return allKnown(i.a, i.b)
        ? { gt: Number(i.a > i.b), eq: Number(i.a === i.b), lt: Number(i.a < i.b) }
        : { gt: 'X', eq: 'X', lt: 'X' };
    case 'decoder':
      return out(unknown(i.in) ? 'X' : (decimalSegments[i.in] ?? 0));
    case 'encoder':
    case 'priority_encoder': {
      if (unknown(i.in)) return { out: 'X', valid: 'X' };
      const input = i.in & 255;
      if (!input) return { out: 0, valid: 0 };
      if (node.type === 'encoder' && input & (input - 1)) return { out: 'X', valid: 'X' };
      return { out: Math.floor(Math.log2(input)), valid: 1 };
    }
    case 'sr_latch': {
      return qout();
    }
    case 'd_ff':
    case 'jk_ff':
    case 't_ff':
      return qout();
    case 'register':
    case 'counter':
      return out(s.q);
    case 'shift_register':
      return { out: s.q, serial: unknown(s.q) ? 'X' : (s.q >> 7) & 1 };
    case 'ram':
    case 'rom':
    case 'register_file':
      return out(packBits(readMemoryBits(node, runtime.inputs[node.id], incoming, s, p)));
    case 'dac':
      return out(unknown(i.in) ? 'X' : (clamp(i.in, 0, 255) / 255) * Math.max(0, number(p.vcc, 5)));
    case 'adc':
      return out(
        unknown(i.in)
          ? 'X'
          : Math.round(clamp(i.in / Math.max(0.000001, number(p.vcc, 5)), 0, 1) * 255),
      );
    case 'am':
    case 'fm': {
      const frequency = Math.max(0.000001, number(p.frequency, 1));
      const carrier = Math.max(0, number(p.carrier, 8));
      const depth = clamp(number(p.depth, 0.6), 0, 1);
      const amplitude = Math.max(0, number(p.amplitude, 5));
      const modulation =
        i.mod === 'Z'
          ? Math.sin(TAU * frequency * runtime.time)
          : modulationInput(node, i.mod, p, incoming);
      if (unknown(modulation)) return out('X');
      if (node.type === 'am')
        return out(
          (amplitude / 2) *
            (1 + ((1 + depth * modulation) / (1 + depth)) * Math.sin(TAU * carrier * runtime.time)),
        );
      const phase =
        i.mod === 'Z'
          ? TAU * carrier * runtime.time +
            ((depth * carrier) / frequency) * (1 - Math.cos(TAU * frequency * runtime.time))
          : (s.fmPhase ?? 0);
      return out((amplitude / 2) * (1 + Math.sin(phase)));
    }
    case 'pwm': {
      const duty =
        i.control === 'Z'
          ? clamp(number(p.duty, 0.5), 0, 1)
          : unknown(i.control)
            ? 'X'
            : clamp(i.control, 0, 1);
      return {
        out: unknown(duty)
          ? 'X'
          : periodicLevel('pwm', runtime.time, Math.max(0, number(p.frequency, 105)), duty),
        duty,
      };
    }
    case 'servo':
      return Object.fromEntries(s.angles.map((angle, index) => [`a${index + 1}`, angle]));
    case 'stepper': {
      const motion = motionParameters(p);
      if (!motion.valid || unknown(s.position)) return { position: 'X', angle: 'X', moving: 'X' };
      return {
        position: s.position,
        angle: (s.position / motion.lead) * 360,
        moving: s.motionMoving,
      };
    }
    case 'limit_switch': {
      if (unknown(i.position) || !Number.isFinite(Number(p.threshold))) return out('X');
      const pressed =
        p.mode === 'below'
          ? i.position <= Number(p.threshold)
          : p.mode === 'above'
            ? i.position >= Number(p.threshold)
            : null;
      return out(pressed === null ? 'X' : Number(p.normallyClosed ? !pressed : pressed));
    }
    case 'position_sensor': {
      const target = incoming.has(`${node.id}:target`) ? i.target : number(p.threshold, NaN);
      if (unknown(i.position) || unknown(target)) return { position: i.position, out: 'X' };
      const detected =
        p.mode === 'below'
          ? i.position <= target
          : p.mode === 'above'
            ? i.position >= target
            : p.mode === 'window' &&
                Number.isFinite(Number(p.tolerance)) &&
                Number(p.tolerance) >= 0
              ? Math.abs(i.position - target) <= Number(p.tolerance) + 1e-10
              : null;
      return { position: i.position, out: detected === null ? 'X' : Number(detected) };
    }
    case 'alu': {
      if (!allKnown(i.a, i.b, i.op)) return { out: 'X', carry: 'X', zero: 'X' };
      const av = i.a & 255,
        bv = i.b & 255;
      const raw = [
        () => av + bv,
        () => av - bv,
        () => av & bv,
        () => av | bv,
        () => av ^ bv,
        () => av << (bv & 7),
        () => av >>> (bv & 7),
        () => ~av,
      ][i.op & 7]();
      const result = raw & 255;
      return { out: result, carry: Number(raw > 255 || raw < 0), zero: Number(result === 0) };
    }
    case 'open_drain':
      return out(logic(i.in) === 0 ? 0 : logic(i.in) === 1 ? 'Z' : 'X');
    case 'schmitt':
      return out(s.q);
    case 'monostable':
      return out(runtime.time < s.pulseUntil ? (s.pulseMaybe ? 'X' : 1) : 0);
    default:
      return {};
  }
}
