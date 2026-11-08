import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../examples/index.js';
import { getDefinition } from '../../src/components/catalog/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { advanceRuntime } from '../../src/simulation/advance.js';
import { simulationResolution, nextSimulationInterval } from '../../src/simulation/timing.js';
import { FLOOR_ZONE, FLOORS } from '../../src/scenes/models/elevator/config.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
  parseSequence,
  serializeSequence,
} from '../../src/experiments/actions.js';

const node = (id, type, params = {}) => ({ id, type, x: 0, y: 0, params });
const wire = (id, from, port, to, input) => ({
  id,
  from: { node: from, port },
  to: { node: to, port: input },
});
const liftCircuit = (...extra) => ({
  version: 1,
  name: 'Elevator timing',
  nodes: [node('lift', 'elevator', { travelSpeed: 2 }), ...extra],
  wires: [],
});

test('only explicit lift/static-logic combinations receive the larger step; other physics and future models retain their cap', () => {
  const project = liftCircuit();
  assert.equal(simulationResolution(project), 0.005);
  project.nodes[0].params.travelSpeed = 4;
  assert.equal(simulationResolution(project), FLOOR_ZONE / 4);
  project.nodes.push(node('other-lift', 'elevator', { travelSpeed: 3 }));
  assert.equal(simulationResolution(project), FLOOR_ZONE / 4);
  for (const type of [
    'servo',
    'stepper',
    'active_buzzer',
    'passive_buzzer',
    'pwm',
    'adc',
    'limit_switch',
    'traffic_light',
    'traffic_junction',
    'railway',
    'animal_feeder',
    'water_tank',
    'aquarium',
    'greenhouse',
    'smart_home',
    'future-physical-model',
  ]) {
    const mixed = liftCircuit(node('other', type));
    assert.equal(simulationResolution(mixed), 0.0005, type);
    mixed.nodes[1].enabled = false;
    assert.equal(simulationResolution(mixed), 0.005, `${type} disabled`);
  }
  assert.equal(simulationResolution({ nodes: [], wires: [] }), 0.0005);
  assert.equal(simulationResolution({ nodes: [node('d', 'counter')], wires: [] }), 0.0005);
  project.nodes[0].params.travelSpeed = 0;
  assert.equal(simulationResolution(project), 0.0005);
  const analog = liftCircuit(node('wave', 'am', { carrier: 1000, frequency: 0, depth: 0 }));
  assert.ok(simulationResolution(analog) <= 1 / 32000);
});

test('maximum-speed off-grid starts cannot skip any middle floor in either direction', () => {
  for (const target of FLOORS.slice(1, -1))
    for (const direction of ['up', 'down']) {
      const project = liftCircuit(node('outside-zone', 'not'));
      project.nodes[0].params.travelSpeed = 4;
      project.wires = [
        wire('sense', 'lift', `floor${target}`, 'outside-zone', 'a'),
        wire('drive', 'outside-zone', 'out', 'lift', direction),
      ];
      const runtime = createRuntime();
      simulate(project, runtime, 0);
      runtime.state.lift.scenario.position = target + (direction === 'up' ? -0.09763 : 0.09763);
      runtime.time = 0.000137;
      simulate(project, runtime, 0);
      const result = advanceRuntime(project, runtime, 0.1, { maxSteps: 1000 });
      assert.equal(result.reached, true);
      assert.equal(runtime.outputs.lift[`floor${target}`], 1, `${target}/${direction}`);
      assert.equal(runtime.outputs.lift.moving, 0);
      assert.equal(runtime.outputs.lift.fault, 0);
      assert.ok(Math.abs(runtime.outputs.lift.position - target) <= FLOOR_ZONE + 1e-9);
      assert.deepEqual(runtime.diagnostics, []);
    }
});

test('a narrower external position window keeps the original step and still stops an off-grid lift', () => {
  const project = liftCircuit(
    node('window', 'position_sensor', { threshold: 2, mode: 'window', tolerance: 0.001 }),
    node('outside-window', 'not'),
  );
  project.wires = [
    wire('position', 'lift', 'position', 'window', 'position'),
    wire('window-bit', 'window', 'out', 'outside-window', 'a'),
    wire('drive', 'outside-window', 'out', 'lift', 'up'),
  ];
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  runtime.state.lift.scenario.position = 1.90237;
  simulate(project, runtime, 0);
  assert.equal(simulationResolution(project, runtime), 0.0005);
  assert.equal(advanceRuntime(project, runtime, 0.1, { maxSteps: 1000 }).reached, true);
  assert.ok(Math.abs(runtime.outputs.lift.position - 2) <= 0.001 + 1e-9);
  assert.equal(runtime.outputs.lift.moving, 0);
  project.nodes[1].params.tolerance = 0;
  assert.equal(simulationResolution(project, runtime), 0.0005);
});

test('short positive one-shots impose their half-width after the regular minimum clamp; zero stays finite', () => {
  const project = liftCircuit(
    node('trigger', 'button', { value: 0 }),
    node('pulse', 'monostable', { duration: 0.00002 }),
    node('count', 'counter', { initial: 0 }),
  );
  project.wires = [
    wire('trigger-wire', 'trigger', 'out', 'pulse', 'trigger'),
    wire('pulse-wire', 'pulse', 'out', 'count', 'clk'),
  ];
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  assert.equal(simulationResolution(project, runtime), 0.00001);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(runtime.outputs.pulse.out, 1);
  const samples = [];
  const result = advanceRuntime(project, runtime, 0.0001, {
    maxSteps: 1000,
    onStep: (r) => samples.push([r.time, r.outputs.pulse.out]),
  });
  assert.equal(result.reached, true);
  assert.ok(result.steps >= 10);
  assert.equal(samples[0][1], 1);
  assert.ok(samples.some(([at, value]) => Math.abs(at - 0.00002) < 1e-12 && value === 0));
  assert.equal(runtime.state.count.q, 1);
  project.nodes[2].params.duration = 0;
  assert.equal(simulationResolution(project), 0.005);
  assert.ok(nextSimulationInterval(project, runtime, 0.01) > 0);
  project.nodes[2].params.duration = Number.MIN_VALUE;
  assert.equal(simulationResolution(project), 0.0005);
});

test('eligible elevator logic still visits exact narrow periodic edges instead of skipping clock pulses', () => {
  const project = liftCircuit(
    node('clock', 'clock', { frequency: 100, duty: 0.000001 }),
    node('count', 'counter', { initial: 0 }),
  );
  project.wires = [wire('clock-wire', 'clock', 'out', 'count', 'clk')];
  const runtime = createRuntime(),
    rises = [];
  simulate(project, runtime, 0);
  let previous = runtime.outputs.clock.out;
  const result = advanceRuntime(project, runtime, 0.025, {
    maxSteps: 5000,
    onStep: (r) => {
      if (r.outputs.clock.out === 1 && previous === 0) rises.push(r.time);
      previous = r.outputs.clock.out;
    },
  });
  assert.equal(result.reached, true);
  assert.equal(runtime.state.count.q, 2);
  assert.equal(rises.length, 2);
  assert.ok(Math.abs(rises[0] - 0.00999999) < 1e-12);
  assert.ok(Math.abs(rises[1] - 0.01999999) < 1e-12);
});

test('the portable nine-floor preset retains service order, door/SR interlocks and reset with bounded work', (t) => {
  const example = EXAMPLES.find(({ id }) => id === 'elevator-logic'),
    project = createExample('elevator-logic'),
    runtime = createRuntime(),
    order = [];
  simulate(project, runtime, 0);
  let wasOpen = 0;
  const inspect = (r) => {
    const output = r.outputs.plant,
      input = r.inputs.plant;
    assert.equal(output.fault, 0);
    assert.ok(!(input.up && input.down));
    assert.ok(!(input.open && input.close));
    if (output.moving) assert.equal(output.door_closed, 1);
    for (const floor of FLOORS)
      assert.ok(!(r.inputs[`request${floor}`].s && r.inputs[`request${floor}`].r));
    if (output.door_open && !wasOpen)
      order.push(FLOORS.find((floor) => output[`floor${floor}`] === 1));
    wasOpen = output.door_open;
  };
  const moveTo = (at) => {
    const result = advanceRuntime(project, runtime, at - runtime.time, {
      maxSteps: 5000,
      onStep: inspect,
    });
    assert.equal(result.reached, true);
  };
  for (const action of example.actionPreset) {
    moveTo(action.at);
    project.nodes.find(({ id }) => id === action.node).params[action.key] = action.value;
    simulate(project, runtime, 0);
    inspect(runtime);
  }
  moveTo(12.1);
  assert.deepEqual(order, [3, 5, 9, 1]);
  assert.ok(runtime.steps < 2500, `12.1s should not require ${runtime.steps} physics steps`);
  for (const value of [1, 0]) {
    project.nodes.find(({ id }) => id === 'reset').params.value = value;
    simulate(project, runtime, 0);
  }
  assert.equal(runtime.outputs.plant.floor1, 1);
  assert.equal(runtime.outputs.plant.door_closed, 1);
  assert.equal(runtime.outputs.dwell.out, 0);
  assert.ok(FLOORS.every((floor) => runtime.outputs[`request${floor}`].q === 0));
  const sequence = createSequence(example.create(), { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, 12.1);
  const started = performance.now(),
    replay = replaySequence(parseSequence(serializeSequence(sequence)));
  assert.equal(replay.done, true);
  assert.ok(replay.runtime.steps < 2500);
  assert.equal(replay.runtime.outputs.plant.floor1, 1);
  assert.equal(replay.runtime.outputs.plant.door_closed, 1);
  assert.equal(replay.runtime.outputs.plant.fault, 0);
  assert.ok(FLOORS.every((floor) => replay.runtime.outputs[`request${floor}`].q === 0));
  assert.equal(getDefinition('elevator').inputs.length, 6);
  t.diagnostic(
    `Portable lift benchmark: ${replay.runtime.steps} steps, ${(performance.now() - started).toFixed(0)}ms for 12.1s`,
  );
});
