import { getDefinition } from '../components/catalog/index.js';
import {
  SCENARIO_INPUT_DEFAULTS,
  isScenarioType,
  scenarioParameterError,
} from '../scenes/models/scenarios/index.js';
import { unknown, number, active } from './signals.js';
import { initialState, motionParameters } from './models.js';
import { settleEvents } from './settling.js';
import { servoParameterError } from './servo.js';
import { advanceState } from './state.js';
import { compileCircuit } from './network.js';
import { captureAudio, createAudioRuntime } from './audio.js';

const HISTORY_CAPACITY = 256;
const optionalInputs = {
  ...Object.fromEntries(
    Object.entries(SCENARIO_INPUT_DEFAULTS).map(([type, defaults]) => [
      type,
      Object.keys(defaults),
    ]),
  ),
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
  eeprom: ['cs', 'oe', 'we'],
  hc595: ['mr', 'oe'],
  lcd1602: ['d'],
  rom: ['cs', 'oe'],
};

export function createRuntime() {
  return {
    time: 0,
    ...createAudioRuntime(),
    outputs: Object.create(null),
    inputs: Object.create(null),
    signals: { inputs: Object.create(null), outputs: Object.create(null) },
    wireValues: Object.create(null),
    state: Object.create(null),
    modelTypes: Object.create(null),
    history: Object.create(null),
    historyTimes: [],
    diagnostics: [],
    steps: 0,
    sampleInterval: 0,
    sampleElapsed: 0,
    lastSampleTime: 0,
  };
}
function appendHistory(runtime, id, value) {
  const history = (runtime.history[id] ??= []);
  history.push(unknown(value) ? null : value);
  if (history.length > HISTORY_CAPACITY) history.splice(0, history.length - HISTORY_CAPACITY);
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
  runtime.sampleElapsed += dt;
  const sampleDue =
    dt > 0 && (sampleInterval === 0 || runtime.sampleElapsed + 1e-12 >= sampleInterval);
  const { nodes, incoming, validWires } = compileCircuit(project);
  const live = new Set(nodes.map((node) => node.id));
  for (const id of Object.keys(runtime.state))
    if (!live.has(id)) {
      delete runtime.state[id];
      delete runtime.modelTypes[id];
      delete runtime.outputs[id];
      delete runtime.inputs[id];
      delete runtime.signals.inputs[id];
      delete runtime.signals.outputs[id];
      delete runtime.history[id];
    }
  for (const node of nodes) {
    if (runtime.modelTypes[node.id] !== node.type) {
      runtime.state[node.id] = initialState(node);
      runtime.outputs[node.id] = Object.fromEntries(
        getDefinition(node.type).outputs.map((port) => [port.id, 'Z']),
      );
      delete runtime.inputs[node.id];
      delete runtime.signals.inputs[node.id];
      delete runtime.signals.outputs[node.id];
      delete runtime.history[node.id];
      runtime.modelTypes[node.id] = node.type;
    }
    runtime.state[node.id] ??= initialState(node);
    runtime.outputs[node.id] ??= Object.fromEntries(
      getDefinition(node.type).outputs.map((port) => [port.id, 'Z']),
    );
  }
  for (const node of nodes) if (node.type === 'stepper') runtime.state[node.id].motionMoving = 0;
  const firstSettled = settleEvents(nodes, incoming, runtime);
  advanceState(nodes, runtime, incoming, dt);
  const settled = settleEvents(nodes, incoming, runtime);
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
  captureAudio(project, runtime, { settled: firstSettled && settled });
  for (const node of nodes) {
    const definition = getDefinition(node.type);
    if (node.enabled === false) {
      if (sampleDue && (definition.inputs.length || definition.outputs.length))
        appendHistory(runtime, node.id, null);
      continue;
    }
    const scenarioError = isScenarioType(node.type) && scenarioParameterError(node);
    if (scenarioError)
      runtime.diagnostics.push({
        level: 'error',
        code: 'invalid_scenario',
        node: node.id,
        message: `${node.label || definition.label}: ${scenarioError}`,
      });
    for (const port of definition.inputs) {
      const value = runtime.inputs[node.id]?.[port.id];
      if (
        value === 'Z' &&
        (!(optionalInputs[node.type] || []).includes(port.group || port.id) ||
          incoming.has(`${node.id}:${port.id}`))
      )
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
    const servoError =
      node.type === 'servo' && servoParameterError({ ...definition.defaults, ...node.params });
    if (servoError)
      runtime.diagnostics.push({
        level: 'error',
        code: 'invalid_servo',
        node: node.id,
        message: `${node.label || definition.label}: ${servoError}`,
      });
    const outputValues = Object.values(runtime.signals.outputs[node.id] || {});
    const inputValues = Object.values(runtime.signals.inputs[node.id] || {});
    if (sampleDue && (outputValues.length || inputValues.length)) {
      const value =
        node.type === 'scope'
          ? runtime.inputs[node.id].in
          : (outputValues.length ? outputValues : inputValues)[0];
      appendHistory(runtime, node.id, value);
    }
  }
  if (sampleDue) {
    runtime.sampleElapsed = sampleInterval
      ? Math.max(
          0,
          runtime.sampleElapsed -
            Math.floor((runtime.sampleElapsed + 1e-12) / sampleInterval) * sampleInterval,
        )
      : 0;
    runtime.lastSampleTime = runtime.time;
    runtime.historyTimes.push(runtime.time);
    if (runtime.historyTimes.length > HISTORY_CAPACITY)
      runtime.historyTimes.splice(0, runtime.historyTimes.length - HISTORY_CAPACITY);
  }
  return runtime;
}
