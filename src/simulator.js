import { getDefinition } from './catalog.js';

const TAU = Math.PI * 2;
const unknown = (value) => typeof value !== 'number' || !Number.isFinite(value);
const logic = (value) => (unknown(value) ? 'X' : Number(value !== 0));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const complement = (value) => (unknown(value) ? 'X' : 1 - logic(value));
const valueOr = (value, fallback) => (value === 'Z' || value === undefined ? fallback : value);
const active = (value, fallback = 0) => logic(valueOr(value, fallback)) === 1;
const allKnown = (...values) => values.every((value) => !unknown(value));
const decimalSegments = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
const sequential = new Set([
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
const HISTORY_CAPACITY = 256;
const optionalInputs = {
  clock: [],
  am: ['mod'],
  fm: ['mod'],
  pwm: ['control'],
  servo: ['s1', 's2', 's3', 's4'],
  counter: ['enable', 'reset'],
  register: ['enable', 'reset'],
  d_ff: ['reset'],
  jk_ff: ['reset'],
  t_ff: ['reset'],
  shift_register: ['reset'],
  monostable: ['reset'],
  stepper: ['enable', 'reset'],
  position_sensor: ['target'],
  ram: ['cs', 'oe', 'we'],
  rom: ['cs', 'oe'],
};

export function createRuntime() {
  return {
    time: 0,
    outputs: Object.create(null),
    inputs: Object.create(null),
    wireValues: Object.create(null),
    state: Object.create(null),
    history: Object.create(null),
    diagnostics: [],
    steps: 0,
    sampleInterval: 0,
    lastSampleTime: 0,
  };
}

function motionParameters(p) {
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

function initialState(node) {
  const parameters = { ...getDefinition(node.type)?.defaults, ...node.params };
  const initial = Math.round(number(parameters.initial));
  const motion = node.type === 'stepper' ? motionParameters(parameters) : null;
  return {
    q: ['d_ff', 'jk_ff', 't_ff', 'sr_latch', 'schmitt'].includes(node.type)
      ? Number(initial !== 0)
      : initial & 255,
    lastClock: 0,
    lastTrigger: 0,
    pulseUntil: -1,
    memory: Array(node.type === 'register_file' ? 8 : 16).fill(0),
    angles: [0, 0, 0, 0],
    position: motion?.valid ? clamp(number(parameters.initial), motion.minimum, motion.maximum) : 0,
    lastStep: null,
    stepConnection: null,
    motionWasEnabled: false,
    motionMoving: 0,
    servoEdges: Array.from({ length: 4 }, () => ({
      previous: 0,
      rise: null,
      previousRise: null,
      high: 0,
      duty: 0.5,
    })),
  };
}

/** Resolve strong drivers first; weak pull resistors only apply to a released net. */
function resolveDrivers(drivers) {
  const driven = drivers.filter((driver) => driver.value !== 'Z' && driver.value !== undefined);
  if (!driven.length) return 'Z';
  const strong = driven.filter((driver) => !driver.weak);
  const selected = strong.length ? strong : driven;
  const first = selected[0].value;
  return selected.every((driver) => driver.value === first) ? first : 'X';
}

function readInputs(nodes, incoming, runtime) {
  for (const node of nodes) {
    const definition = getDefinition(node.type);
    const inputs = {};
    for (const port of definition.inputs) {
      const wires = incoming.get(`${node.id}:${port.id}`) || [];
      inputs[port.id] = resolveDrivers(
        wires.map((wire) => ({
          value: runtime.outputs[wire.from.node]?.[wire.from.port] ?? 'Z',
          weak: wire.sourceType === 'pullup' || wire.sourceType === 'pulldown',
        })),
      );
    }
    runtime.inputs[node.id] = inputs;
  }
}

function modulationInput(node, value, p, incoming) {
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

function evaluate(node, runtime, incoming) {
  const definition = getDefinition(node.type);
  if (node.enabled === false)
    return Object.fromEntries(definition.outputs.map((port) => [port.id, 'Z']));
  const p = { ...definition.defaults, ...node.params };
  const i = runtime.inputs[node.id];
  const s = runtime.state[node.id];
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
    case 'switch':
      return out(Number(number(p.value) !== 0));
    case 'bus_input': {
      const value = Math.round(clamp(number(p.value), 0, 255));
      return { out: value, nibble: value & 15, address: value & 7 };
    }
    case 'clock': {
      const phase = (runtime.time * Math.max(0, number(p.frequency, 1))) % 1;
      return out(Number(phase + 1e-10 >= 1 - clamp(number(p.duty, 0.5), 0, 1)));
    }
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
      return out(logic(i.sel) === 0 ? i.a : logic(i.sel) === 1 ? i.b : i.a === i.b ? i.a : 'X');
    case 'demux':
      return logic(i.sel) === 0
        ? { a: i.in, b: 0 }
        : logic(i.sel) === 1
          ? { a: 0, b: i.in }
          : { a: 'X', b: 'X' };
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
      const set = logic(i.s),
        reset = logic(i.r);
      if (set === 1 && reset === 1) s.q = 'X';
      else if (set === 1 && reset === 0) s.q = 1;
      else if (set === 0 && reset === 1) s.q = 0;
      else if (set !== 0 || reset !== 0) s.q = 'X';
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
    case 'rom': {
      if (!active(i.cs, 1) || !active(i.oe, 1) || (node.type === 'ram' && active(i.we)))
        return out('Z');
      if (unknown(i.address)) return out('X');
      const memory =
        node.type === 'rom'
          ? String(p.data)
              .split(/[\s,;]+/)
              .filter(Boolean)
              .map((value) => number(value) & 255)
          : s.memory;
      return out(memory[i.address & 15] ?? 0);
    }
    case 'register_file':
      return out(unknown(i.read) ? 'X' : s.memory[i.read & 7]);
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
          : Number((runtime.time * Math.max(0, number(p.frequency, 105))) % 1 < duty),
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
    case 'tristate':
      return out(logic(i.enable) === 0 ? 'Z' : logic(i.enable) === 1 ? i.in : 'X');
    case 'splitter':
      return Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [
          `b${index}`,
          unknown(i.in) ? i.in : (i.in >> index) & 1,
        ]),
      );
    case 'merger': {
      const bits = Array.from({ length: 8 }, (_, index) => logic(i[`b${index}`]));
      return out(
        bits.some(unknown)
          ? 'X'
          : bits.reduce((value, bitValue, index) => value | (bitValue << index), 0),
      );
    }
    case 'open_drain':
      return out(logic(i.in) === 0 ? 0 : logic(i.in) === 1 ? 'Z' : 'X');
    case 'schmitt': {
      if (unknown(i.in)) return out('X');
      const low = Math.min(number(p.low, 1.5), number(p.high, 3.5));
      const high = Math.max(number(p.low, 1.5), number(p.high, 3.5));
      if (i.in >= high) s.q = 1;
      else if (i.in <= low) s.q = 0;
      return out(s.q);
    }
    case 'monostable':
      return out(Number(runtime.time < s.pulseUntil));
    default:
      return {};
  }
}

function settle(nodes, incoming, runtime) {
  const limit = Math.min(512, Math.max(32, nodes.length * 3));
  for (let iteration = 0; iteration < limit; iteration++) {
    readInputs(nodes, incoming, runtime);
    const updates = new Map();
    let changed = false;
    for (const node of nodes) {
      const output = evaluate(node, runtime, incoming);
      updates.set(node.id, output);
      if (
        Object.entries(output).some(([port, value]) => runtime.outputs[node.id]?.[port] !== value)
      )
        changed = true;
    }
    for (const [id, output] of updates) runtime.outputs[id] = output;
    if (!changed) return true;
  }
  readInputs(nodes, incoming, runtime);
  return false;
}

function advanceState(nodes, runtime, incoming, dt) {
  const updates = new Map();
  for (const node of nodes) {
    const i = runtime.inputs[node.id],
      s = runtime.state[node.id];
    const p = { ...getDefinition(node.type).defaults, ...node.params };
    const next = { ...s };
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
    if (node.enabled === false) continue;
    if (sequential.has(node.type)) {
      const clock = logic(valueOr(i.clk, 0));
      const rising = clock === 1 && s.lastClock === 0;
      next.lastClock = clock;
      const reset = active(i.reset);
      switch (node.type) {
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
          if (reset) next.q = 0;
          else if (rising && active(i.enable, 1)) next.q = unknown(i.d) ? 'X' : i.d & 255;
          break;
        case 'counter':
          if (reset) next.q = 0;
          else if (rising && active(i.enable, 1)) next.q = unknown(s.q) ? 'X' : (s.q + 1) & 255;
          break;
        case 'shift_register':
          if (reset) next.q = 0;
          else if (rising) next.q = allKnown(s.q, i.d) ? ((s.q << 1) | logic(i.d)) & 255 : 'X';
          break;
        case 'ram':
          if (rising && active(i.cs, 1) && active(i.we) && allKnown(i.address, i.data)) {
            next.memory = [...s.memory];
            next.memory[i.address & 15] = i.data & 255;
          }
          break;
        case 'register_file':
          if (rising && active(i.we) && allKnown(i.write, i.data)) {
            next.memory = [...s.memory];
            next.memory[i.write & 7] = i.data & 255;
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

/**
 * Advance time once, settle combinational paths, sample state, then settle again.
 * Edges and pulse widths are measured at physics steps, without propagation
 * delays. The caller must use steps short enough to resolve its fastest pulse.
 * History sampling can run more slowly through runtime.sampleInterval without
 * changing the physics step or skipping clock-edge evaluation.
 */
export function simulate(project, runtime = createRuntime(), dt = 0.01) {
  dt = Math.max(0, number(dt));
  runtime.time += dt;
  runtime.steps++;
  runtime.diagnostics = [];
  const sampleInterval = Math.max(0, number(runtime.sampleInterval));
  const sampleDue =
    dt > 0 &&
    (sampleInterval === 0 ||
      runtime.time - number(runtime.lastSampleTime) + 1e-12 >= sampleInterval);
  const nodes = (project.nodes || []).filter((node) => getDefinition(node.type));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map();
  const parents = new Map();
  const find = (key) => {
    if (!parents.has(key)) parents.set(key, key);
    if (parents.get(key) !== key) parents.set(key, find(parents.get(key)));
    return parents.get(key);
  };
  const validWires = [];
  const live = new Set(nodes.map((node) => node.id));
  for (const id of Object.keys(runtime.state))
    if (!live.has(id)) {
      delete runtime.state[id];
      delete runtime.outputs[id];
      delete runtime.inputs[id];
      delete runtime.history[id];
    }
  for (const node of nodes) {
    runtime.state[node.id] ??= initialState(node);
    runtime.outputs[node.id] ??= Object.fromEntries(
      getDefinition(node.type).outputs.map((port) => [port.id, 'Z']),
    );
  }
  for (const wire of project.wires || []) {
    const source = nodeById.get(wire.from?.node),
      target = nodeById.get(wire.to?.node);
    if (!source || !target) continue;
    const sourcePort = getDefinition(source.type).outputs.find(
      (port) => port.id === wire.from.port,
    );
    const targetPort = getDefinition(target.type).inputs.find((port) => port.id === wire.to.port);
    if (!sourcePort || !targetPort) continue;
    const sourceKey = `out:${source.id}:${sourcePort.id}`;
    const targetKey = `in:${target.id}:${targetPort.id}`;
    parents.set(find(sourceKey), find(targetKey));
    validWires.push({ ...wire, sourceType: source.type, sourceKey, targetKey });
  }
  // A shared output pin electrically joins all of its fan-out wires into one net.
  const driversByNet = new Map();
  for (const wire of validWires) {
    const net = find(wire.sourceKey);
    if (!driversByNet.has(net)) driversByNet.set(net, new Map());
    driversByNet.get(net).set(wire.sourceKey, wire);
  }
  for (const wire of validWires) {
    const key = `${wire.to.node}:${wire.to.port}`;
    incoming.set(key, [...driversByNet.get(find(wire.targetKey)).values()]);
  }
  const firstSettled = settle(nodes, incoming, runtime);
  advanceState(nodes, runtime, incoming, dt);
  const settled = settle(nodes, incoming, runtime);
  runtime.wireValues = Object.assign(
    Object.create(null),
    Object.fromEntries(
      validWires.map((wire) => [wire.id, runtime.inputs[wire.to.node][wire.to.port]]),
    ),
  );
  if (!firstSettled || !settled)
    runtime.diagnostics.push({
      level: 'error',
      code: 'oscillation',
      message: 'The circuit did not settle. Check combinational feedback.',
    });
  for (const node of nodes) {
    const definition = getDefinition(node.type);
    if (node.enabled === false) continue;
    for (const port of definition.inputs) {
      const value = runtime.inputs[node.id]?.[port.id];
      if (value === 'Z' && !(optionalInputs[node.type] || []).includes(port.id))
        runtime.diagnostics.push({
          level: 'warning',
          code: 'floating',
          node: node.id,
          port: port.id,
          message: `${node.label || definition.label}: ${port.label} is floating (Z).`,
        });
      if (value === 'X')
        runtime.diagnostics.push({
          level: 'warning',
          code: 'unknown',
          node: node.id,
          port: port.id,
          message: `${node.label || definition.label}: ${port.label} has an unknown or conflicting signal (X).`,
        });
    }
    if (
      node.type === 'sr_latch' &&
      active(runtime.inputs[node.id].s) &&
      active(runtime.inputs[node.id].r)
    )
      runtime.diagnostics.push({
        level: 'error',
        code: 'invalid_sr',
        node: node.id,
        message: `${node.label || definition.label}: S and R cannot both be high.`,
      });
    if (
      node.type === 'stepper' &&
      !motionParameters({ ...definition.defaults, ...node.params }).valid
    )
      runtime.diagnostics.push({
        level: 'error',
        code: 'invalid_motion',
        node: node.id,
        message: `${node.label || definition.label}: steps per revolution and microsteps must be positive integers, lead must be positive, and Min must not exceed Max.`,
      });
    else if (node.type === 'stepper' && unknown(runtime.state[node.id].position))
      runtime.diagnostics.push({
        level: 'error',
        code: 'motion_unknown',
        node: node.id,
        message: `${node.label || definition.label}: position is unknown after an uncertain control signal. Apply Reset to restore the initial position.`,
      });
    const outputValues = Object.values(runtime.outputs[node.id] || {});
    const inputValues = Object.values(runtime.inputs[node.id] || {});
    if (sampleDue && (outputValues.length || inputValues.length)) {
      const value =
        node.type === 'scope'
          ? runtime.inputs[node.id].in
          : (outputValues.length ? outputValues : inputValues)[0];
      const history = (runtime.history[node.id] ??= []);
      history.push(unknown(value) ? null : value);
      if (history.length > HISTORY_CAPACITY) history.splice(0, history.length - HISTORY_CAPACITY);
    }
  }
  if (sampleDue) runtime.lastSampleTime = runtime.time;
  return runtime;
}
