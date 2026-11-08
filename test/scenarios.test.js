import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import { createRuntime, simulate } from '../src/simulator.js';
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../src/scenarios.js';

const node = (type, params = {}) => ({ id: 'scene', type, params, enabled: true, x: 0, y: 0 });
const near = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
function advance(n, state, inputs, duration, step = 0.01) {
  const count = Math.ceil(duration / step);
  for (let index = 0; index < count; index++)
    state = advanceScenario(n, state, inputs, duration / count);
  return state;
}
const positions = (state) =>
  state.cars?.map((car) => car.position) ??
  state.trains?.map((train) => train.position) ?? [state.bowl ?? state.level];

test('scenario definitions expose fixed pins, mechanical units and one shared set of defaults', () => {
  assert.ok(Object.isFrozen(SCENARIO_TYPES));
  for (const type of SCENARIO_TYPES) {
    const definition = getDefinition(type);
    assert.equal(definition.category, 'scenes');
    assert.equal(definition.defaults, SCENARIO_DEFAULTS[type]);
    const n = node(type),
      state = initialScenarioState(n);
    assert.deepEqual(
      Object.keys(evaluateScenario(n, state, {})).sort(),
      definition.outputs.map(({ id }) => id).sort(),
    );
  }
  assert.equal(getDefinition('railway').outputs.find(({ id }) => id === 'speed').unit, 'km/h');
  assert.equal(getDefinition('animal_feeder').outputs.find(({ id }) => id === 'level').unit, 'g');
  assert.equal(getDefinition('water_tank').outputs.find(({ id }) => id === 'level').unit, '%');
});

test('traffic light accepts exactly one lamp and unknown lamp controls remain visibly uncertain', () => {
  const n = node('traffic_light');
  for (let mask = 0; mask < 8; mask++) {
    const inputs = { red: mask & 1, yellow: (mask >> 1) & 1, green: (mask >> 2) & 1 };
    const output = evaluateScenario(n, initialScenarioState(n), inputs);
    assert.equal(output.valid, Number([1, 2, 4].includes(mask)));
    assert.equal(output.go, Number(mask === 4));
  }
  assert.deepEqual(evaluateScenario(n, initialScenarioState(n), {}), { valid: 0, go: 0 });
  const state = advanceScenario(n, initialScenarioState(n), { green: 'X' }, 1);
  assert.equal(state.uncertain, true);
  assert.deepEqual(evaluateScenario(n, state, { green: 'X' }), { valid: 'X', go: 'X' });
});

test('traffic forms real queues and yellow stops new entries while cars already inside clear', () => {
  const n = node('traffic_junction');
  let state = advance(n, initialScenarioState(n), {}, 5);
  assert.equal(evaluateScenario(n, state, {}).ns_wait, 1);
  assert.equal(evaluateScenario(n, state, {}).ew_wait, 1);
  assert.ok(state.cars.every((car) => car.position <= -12 + 1e-8));
  state.cars = [
    { id: 'inside', axis: 'ns', position: -8, stopped: false, crashed: false },
    { id: 'waiting', axis: 'ns', position: -25, stopped: false, crashed: false },
  ];
  state = advance(n, state, { ns_green: 1, ns_yellow: 1 }, 2);
  assert.ok(state.cars.find(({ id }) => id === 'inside').position > 5);
  near(state.cars.find(({ id }) => id === 'waiting').position, -12);
});

test('conflicting releases collide, latch failure, freeze cars, and reset restores the initial scene', () => {
  const n = node('traffic_junction');
  const input = { ns_green: 1, ew_green: 1 };
  let state = advance(n, initialScenarioState(n), input, 4);
  assert.equal(state.crash, true);
  assert.equal(state.failure, 'collision');
  assert.ok(state.cars.some(({ crashed }) => crashed));
  const stopped = positions(state);
  state = advance(n, state, {}, 5);
  assert.deepEqual(positions(state), stopped);
  assert.equal(evaluateScenario(n, state, {}).crash, 1);
  state = advanceScenario(n, state, { reset: 1 }, 0);
  assert.deepEqual(state, initialScenarioState(n));
});

test('mutually exclusive traffic phases with all-red clearance pass cars without collisions', () => {
  const n = node('traffic_junction');
  let state = initialScenarioState(n);
  for (let cycle = 0; cycle < 3; cycle++) {
    state = advance(n, state, { ns_green: 1 }, 3);
    state = advance(n, state, { ns_yellow: 1 }, 2);
    state = advance(n, state, { ew_green: 1 }, 3);
    state = advance(n, state, { ew_yellow: 1 }, 2);
  }
  assert.equal(state.crash, false);
  assert.ok(state.passed > 0);
});

test('red railway signals stop approaching trains before the shared block', () => {
  const n = node('railway');
  const state = advance(n, initialScenarioState(n), {}, 20);
  assert.ok(
    state.trains.every(({ position, stopped }) => Math.abs(position + 16) < 1e-8 && stopped),
  );
  assert.deepEqual(evaluateScenario(n, state, {}), {
    approach_a: 1,
    approach_b: 1,
    occupied: 0,
    fault: 0,
    speed: 0,
    passed: 0,
  });
});

test('occupancy interlocking with a locked turnout dispatches both trains safely', () => {
  const n = node('railway');
  let state = initialScenarioState(n),
    points = 0;
  for (let index = 0; index < 6000; index++) {
    const sensed = evaluateScenario(n, state, {});
    const a = Number(sensed.approach_a && !sensed.occupied);
    const b = Number(sensed.approach_b && !sensed.occupied && !a);
    if (a) points = 0;
    else if (b) points = 1;
    state = advanceScenario(
      n,
      state,
      {
        signal_a: a,
        signal_b: b,
        points,
        barrier: Number(sensed.approach_a || sensed.approach_b || sensed.occupied),
        throttle: 30,
      },
      0.01,
    );
  }
  assert.equal(state.fault, false, state.faults.join(','));
  assert.ok(state.passed >= 2);
});

test('railway faults have actual stopped or derailed trains and remain latched until reset', () => {
  const cases = [
    {
      params: { initialA: -5, initialB: -100 },
      inputs: { signal_a: 1, points: 1, barrier: 1 },
      duration: 1,
      reason: 'wrong_route',
      derailed: true,
    },
    {
      params: { initialA: -5, initialB: -100 },
      inputs: { signal_a: 1, throttle: 80, barrier: 1 },
      duration: 1,
      reason: 'overspeed',
      derailed: true,
    },
    {
      params: { initialA: 5, initialB: -100 },
      inputs: { points: 1, barrier: 1 },
      duration: 0,
      reason: 'points_under_train',
      derailed: true,
    },
    {
      params: { initialA: 11, initialB: -100 },
      inputs: { signal_a: 1, barrier: 0 },
      duration: 0.5,
      reason: 'open_barrier',
      crashed: true,
    },
  ];
  for (const example of cases) {
    const n = node('railway', example.params);
    let state = advanceScenario(n, initialScenarioState(n), example.inputs, example.duration);
    assert.equal(state.failure, example.reason);
    assert.equal(state.trains[0][example.derailed ? 'derailed' : 'crashed'], true);
    const position = state.trains[0].position;
    state = advanceScenario(n, state, { barrier: 1, throttle: 10 }, 2);
    near(state.trains[0].position, position);
    assert.equal(state.failure, example.reason);
    assert.deepEqual(advanceScenario(n, state, { reset: 1 }, 0), initialScenarioState(n));
  }
});

test('opposing trains admitted to the same block physically collide, including after a route error', () => {
  const n = node('railway', { initialA: -2, initialB: -2 });
  let state = advance(
    n,
    initialScenarioState(n),
    { signal_a: 1, signal_b: 1, points: 0, barrier: 1 },
    6,
  );
  assert.ok(state.faults.includes('collision'));
  assert.ok(state.trains.every(({ crashed, stopped }) => crashed && stopped));
  assert.equal(
    state.failure,
    'wrong_route',
    'The first latched cause remains available even when a later collision occurs.',
  );
  const stopped = positions(state);
  state = advance(n, state, { signal_a: 1, signal_b: 1, barrier: 1 }, 3);
  assert.deepEqual(positions(state), stopped);
});

test('feeder conserves grams, counts eaten portions and refills only on a fresh rising edge', () => {
  const n = node('animal_feeder');
  let state = advanceScenario(n, initialScenarioState(n), { dispense: 1 }, 1);
  near(state.hopper, 275);
  near(state.bowl, 31);
  near(state.eaten, 4);
  near(state.hopper + state.bowl + state.eaten + state.spilled, 310);
  state = advanceScenario(n, state, { refill: 1 }, 0);
  near(state.hopper, 500);
  state = advanceScenario(n, state, { dispense: 1, refill: 1 }, 1);
  near(state.hopper, 475);
  state = advanceScenario(n, state, { refill: 1 }, 0);
  near(state.hopper, 475);
  state = advanceScenario(n, state, { refill: 0 }, 0);
  state = advanceScenario(n, state, { refill: 1 }, 0);
  near(state.hopper, 500);
  state = advance(n, state, {}, 10);
  assert.ok(state.fed >= 1);
});

test('hunger feedback safely feeds an animal while continuous dispensing spills and latches its first alarm', () => {
  const n = node('animal_feeder');
  let safe = initialScenarioState(n);
  for (let index = 0; index < 3000; index++) {
    const sensed = evaluateScenario(n, safe, {});
    safe = advanceScenario(n, safe, { dispense: Number(sensed.hungry && !sensed.empty) }, 0.01);
  }
  assert.equal(safe.alarm, false);
  assert.ok(safe.eaten > 100);
  let unsafe = advance(n, initialScenarioState(n), { dispense: 1 }, 8);
  assert.equal(unsafe.alarm, true);
  assert.ok(unsafe.spilled > 0);
  assert.equal(unsafe.failure, 'overfed');
  unsafe = advance(n, unsafe, {}, 40);
  assert.equal(unsafe.alarm, true);
  assert.deepEqual(advanceScenario(n, unsafe, { reset: 1 }, 0), initialScenarioState(n));
});

test('tank integrates liters into percent, detects thresholds and retains its overflow after draining', () => {
  const n = node('water_tank', { capacity: 200, initialLevel: 50 });
  let state = advanceScenario(n, initialScenarioState(n), { pump: 1, drain: 1 }, 5);
  near(state.level, 70);
  state = advanceScenario(n, state, { pump: 1, drain: 0 }, 10);
  assert.equal(state.level, 100);
  assert.equal(state.overflow, true);
  near(state.spilled, 60);
  state = advanceScenario(n, state, { pump: 0, drain: 1 }, 50);
  near(state.level, 0);
  assert.equal(state.overflow, true);
  assert.equal(state.failure, 'overflow');
  assert.deepEqual(advanceScenario(n, state, { reset: 1 }, 0), initialScenarioState(n));
});

test('continuous feeder and tank quantities are independent of physics-step subdivision', () => {
  for (const type of ['animal_feeder', 'water_tank']) {
    const n = node(type),
      inputs = type === 'animal_feeder' ? { dispense: 1 } : { pump: 1, drain: 0 };
    const coarse = advanceScenario(n, initialScenarioState(n), inputs, 14);
    const fine = advance(n, initialScenarioState(n), inputs, 14, 0.005);
    for (const key of type === 'animal_feeder'
      ? ['bowl', 'hopper', 'eaten', 'spilled']
      : ['level', 'spilled'])
      near(coarse[key], fine[key]);
    near(coarse.time, fine.time);
  }
});

test('unknown controls freeze mechanics, expose uncertainty, and recover when controls are defined', () => {
  const cases = {
    traffic_junction: 'ns_green',
    railway: 'signal_a',
    animal_feeder: 'dispense',
    water_tank: 'pump',
  };
  for (const [type, pin] of Object.entries(cases)) {
    const n = node(type),
      original = initialScenarioState(n);
    const frozen = advanceScenario(n, original, { [pin]: 'X' }, 10);
    assert.deepEqual(positions(frozen), positions(original), type);
    assert.equal(frozen.time, 0);
    assert.equal(frozen.uncertain, true);
    assert.ok(Object.values(evaluateScenario(n, frozen, { [pin]: 'X' })).includes('X'));
    assert.equal(advanceScenario(n, frozen, {}, 0.1).uncertain, false);
    assert.equal(advanceScenario({ ...n, enabled: false }, original, {}, 10), original);
  }
});

test('invalid thresholds, rates and initial quantities produce visible errors instead of advancing mechanics', () => {
  const cases = [
    node('traffic_junction', { carSpeed: 0 }),
    node('railway', { speedLimit: -1 }),
    node('animal_feeder', { fullThreshold: 10 }),
    node('animal_feeder', { initialHopper: 1000 }),
    node('water_tank', { lowThreshold: 90, highThreshold: 80 }),
    node('water_tank', { capacity: 0 }),
  ];
  for (const n of cases) {
    assert.ok(scenarioParameterError(n));
    const state = advanceScenario(n, initialScenarioState(n), {}, 1);
    assert.equal(state.failure, 'invalid_parameters');
    assert.equal(state.uncertain, true);
    assert.ok(Object.values(evaluateScenario(n, state, {})).every((value) => value === 'X'));
    const runtime = createRuntime();
    simulate({ nodes: [n], wires: [] }, runtime, 0.01);
    assert.ok(runtime.diagnostics.some(({ code }) => code === 'invalid_scenario'));
  }
});

test('settling never advances scene physics, disabled outputs release, and runtime reset restores all scenes', () => {
  for (const type of SCENARIO_TYPES) {
    const n = node(type),
      project = { nodes: [n], wires: [] },
      runtime = createRuntime();
    simulate(project, runtime, 0.5);
    const saved = structuredClone(runtime.state.scene.scenario);
    for (let iteration = 0; iteration < 50; iteration++) simulate(project, runtime, 0);
    assert.deepEqual(runtime.state.scene.scenario, saved, type);
    n.enabled = false;
    simulate(project, runtime, 1);
    assert.deepEqual(runtime.state.scene.scenario, saved);
    assert.ok(Object.values(runtime.outputs.scene).every((value) => value === 'Z'));
    n.enabled = true;
    const reset = createRuntime();
    simulate(project, reset, 0);
    near(reset.state.scene.scenario.time, 0);
  }
});

test('tank SR feedback starts at a known middle-band level without transient Z poisoning its stored state', () => {
  const tank = node('water_tank');
  const project = {
    nodes: [tank, { id: 'memory', type: 'sr_latch', params: { initial: 0 }, enabled: true }],
    wires: [
      { id: 'low', from: { node: 'scene', port: 'low' }, to: { node: 'memory', port: 's' } },
      { id: 'high', from: { node: 'scene', port: 'high' }, to: { node: 'memory', port: 'r' } },
      { id: 'pump', from: { node: 'memory', port: 'q' }, to: { node: 'scene', port: 'pump' } },
    ],
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  assert.equal(runtime.outputs.memory.q, 0);
  for (let index = 0; index < 10000; index++) simulate(project, runtime, 0.01);
  assert.equal(runtime.outputs.scene.overflow, 0);
  assert.ok(runtime.outputs.scene.level >= 19.9 && runtime.outputs.scene.level <= 80.2);
  assert.equal(runtime.state.scene.scenario.uncertain, false);
});
