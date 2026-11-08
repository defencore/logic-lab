import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import { createRuntime, simulate } from '../src/simulator.js';
import {
  JUNCTION,
  RAILWAY,
  ROAD_CROSSING,
  trainFootprint,
  carFootprint,
  overlaps,
  trainReservesSection,
  crossingClear,
  footprintCorners,
  trainCollisionBody,
  carCollisionBody,
  railwayPose,
} from '../src/transport-geometry.js';
import { bodiesOverlap, bodySeparation } from '../src/transport-shapes.js';
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

test('scenario models expose aggregate signals and simulators expose individual contacts', () => {
  assert.ok(Object.isFrozen(SCENARIO_TYPES));
  for (const type of SCENARIO_TYPES) {
    const definition = getDefinition(type);
    assert.ok(['scenes', 'automation'].includes(definition.category));
    assert.equal(definition.defaults, SCENARIO_DEFAULTS[type]);
    const n = node(type),
      state = initialScenarioState(n);
    assert.deepEqual(
      Object.keys(evaluateScenario(n, state, {})).sort(),
      definition.signals.outputs.map(({ id }) => id).sort(),
    );
    const runtime = simulate({ nodes: [n], wires: [] }, createRuntime(), 0);
    assert.deepEqual(
      Object.keys(runtime.outputs.scene).sort(),
      definition.outputs.map(({ id }) => id).sort(),
    );
    assert.ok([...definition.inputs, ...definition.outputs].every(({ width }) => width === 1));
  }
  const aquarium = getDefinition('aquarium');
  assert.equal(aquarium.signals.outputs.find(({ id }) => id === 'alive').width, 8);
  assert.deepEqual(
    aquarium.outputs.filter(({ group }) => group === 'alive').map(({ id, bit }) => [id, bit]),
    Array.from({ length: 8 }, (_, bit) => [`alive${bit}`, bit]),
  );
  const runtime = simulate(
    { nodes: [node('aquarium', { fishCount: 4 })], wires: [] },
    createRuntime(),
    0,
  );
  assert.equal(runtime.signals.outputs.scene.alive, 4);
  assert.equal(runtime.outputs.scene.alive, undefined);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, bit) => runtime.outputs.scene[`alive${bit}`]),
    [0, 0, 1, 0, 0, 0, 0, 0],
  );
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
  assert.ok(state.cars.every((car) => car.position <= JUNCTION.stopPosition + 1e-8));
  state.cars = [
    { id: 'inside', axis: 'ns', position: -20, stopped: false, crashed: false },
    { id: 'waiting', axis: 'ns', position: -40, stopped: false, crashed: false },
  ];
  state = advance(n, state, { ns_green: 1, ns_yellow: 1 }, 2);
  assert.ok(state.cars.find(({ id }) => id === 'inside').position > 0);
  near(state.cars.find(({ id }) => id === 'waiting').position, JUNCTION.stopPosition);
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
    state.trains.every(
      ({ position, stopped }) => Math.abs(position - RAILWAY.stopPosition) < 1e-8 && stopped,
    ),
  );
  assert.deepEqual(evaluateScenario(n, state, {}), {
    approach_a: 1,
    approach_b: 1,
    occupied: 0,
    fault: 0,
    speed: 0,
    passed: 0,
    gate_closed: 0,
    crossing_clear: 1,
    cars_wait: 0,
    points_state: 0,
    exit_points_state: 0,
  });
});

test('occupancy interlocking with a locked turnout dispatches both trains safely', () => {
  const n = node('railway');
  let state = initialScenarioState(n),
    points = 0;
  for (let index = 0; index < 6000; index++) {
    const sensed = evaluateScenario(n, state, {});
    const ready = sensed.gate_closed && sensed.crossing_clear;
    const a = Number(sensed.approach_a && !sensed.occupied && ready);
    const b = Number(sensed.approach_b && !sensed.occupied && !a && ready);
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
      params: { initialA: -48, initialB: -100 },
      inputs: { signal_a: 1, points: 1, barrier: 1 },
      duration: 6,
      reason: 'wrong_route',
      derailed: true,
    },
    {
      params: { initialA: -48, initialB: -100 },
      inputs: { signal_a: 1, throttle: 80, barrier: 1 },
      duration: 4,
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
  assert.ok(overlaps(trainFootprint(state.trains[0]), trainFootprint(state.trains[1])));
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

test('long red-light queues stop full bumpers before the zebra without overlapping the preceding car', () => {
  const n = node('traffic_junction', { initialCars: 8, arrivalInterval: 0.25 });
  const state = advance(n, initialScenarioState(n), {}, 20, 0.05);
  assert.equal(state.crash, false);
  for (const axis of ['ns', 'ew']) {
    const cars = state.cars.filter((car) => car.axis === axis);
    for (const car of cars) {
      const front = Math.max(
        ...footprintCorners(carFootprint(car)).map((point) => point[axis === 'ns' ? 'z' : 'x']),
      );
      assert.ok(front < JUNCTION.zebraNear);
      for (const other of cars)
        if (other !== car) assert.equal(overlaps(carFootprint(car), carFootprint(other)), false);
    }
  }
});

test('crossroad crash status follows body contact rather than two arbitrary progress intervals', () => {
  const n = node('traffic_junction', { initialCars: 0 });
  let state = initialScenarioState(n);
  state.cars = [
    { id: 'ns', axis: 'ns', position: -5 },
    { id: 'ew', axis: 'ew', position: -5 },
  ];
  state = advanceScenario(n, state, { ns_green: 1, ew_green: 1 }, 0.01);
  assert.equal(state.crash, false, 'Both old ±5 intervals overlap before the visible cars touch.');
  state = advanceScenario(n, state, { ns_green: 1, ew_green: 1 }, 1);
  assert.equal(state.crash, true);
  assert.ok(overlaps(carFootprint(state.cars[0]), carFootprint(state.cars[1])));
  assert.ok(state.collisionPoint && state.collisionPair.length === 2);
});

test('road gates close continuously after committed cars clear and leave queued bumpers outside the arms', () => {
  const n = node('railway');
  let state = initialScenarioState(n);
  state = advanceScenario(n, state, { barrier: 1, throttle: 0 }, 0.4);
  near(state.barrier, 0.5);
  assert.equal(evaluateScenario(n, state, {}).gate_closed, 0);
  state = advanceScenario(n, state, { barrier: 1, throttle: 0 }, 0.4);
  near(state.barrier, 1);
  state = advance(n, state, { barrier: 1, throttle: 0 }, 20, 0.1);
  assert.equal(evaluateScenario(n, state, {}).cars_wait, 1);
  assert.equal(evaluateScenario(n, state, {}).crossing_clear, 1);
  for (const car of state.roadCars) {
    near(car.position, RAILWAY.roadStopPosition);
    assert.equal(overlaps(carFootprint(car, 'railway'), ROAD_CROSSING), false);
  }
  state = initialScenarioState(n);
  state.roadCars = [{ id: 'committed', direction: 1, position: -18.8, speed: 8 }];
  state = advance(n, state, { barrier: 1, throttle: 0 }, 4, 0.1);
  near(state.barrier, 0);
  assert.equal(crossingClear(state.roadCars), false);
  near(state.roadCars[0].position, -18.8 + 32);
  state = advance(n, state, { barrier: 1, throttle: 0 }, 2, 0.1);
  near(state.barrier, 1);
  assert.equal(crossingClear(state.roadCars), true);
});

test('an open gate and an empty road never manufacture a crash when a train arrives', () => {
  const n = node('railway');
  let state = initialScenarioState(n);
  state.roadCars = [];
  state = advance(n, state, { signal_a: 1, barrier: 0 }, 25, 0.1);
  assert.equal(state.fault, false);
  assert.ok(state.passed >= 1);
  assert.deepEqual(state.roadCars, []);
  assert.equal(state.collisionPoint, null);
});

test('moving open-gate traffic collides at the actual train boundary and freezes only the contacting vehicles', () => {
  const n = node('railway');
  let state = initialScenarioState(n);
  assert.equal(state.fault, false);
  state = advance(n, state, { signal_a: 1, barrier: 0 }, 8, 0.1);
  assert.equal(state.failure, 'open_barrier');
  const train = state.trains.find(({ id }) => id === 'train-a');
  const car = state.roadCars.find(({ id }) => id === 'road-a');
  assert.ok(train.crashed && car.crashed);
  assert.ok(overlaps(trainFootprint(train), carFootprint(car, 'railway')));
  assert.deepEqual(state.collisionPair, [train.id, car.id]);
  assert.ok(bodySeparation(trainCollisionBody(train), carCollisionBody(car, 'railway')) < 2e-6);
  assert.ok(bodiesOverlap(trainCollisionBody(train), carCollisionBody(car, 'railway')));
  const trainStop = train.position,
    carStop = car.position;
  const other = state.roadCars.find(({ id }) => id === 'road-b').position;
  state = advance(n, state, { signal_a: 1, barrier: 0 }, 2, 0.1);
  near(state.trains[0].position, trainStop);
  near(state.roadCars[0].position, carStop);
  assert.notEqual(state.roadCars[1].position, other);
});

test('same-path train collisions use rendered front-to-tail distances instead of a twelve-meter nose interval', () => {
  const n = node('railway');
  let state = initialScenarioState(n);
  state.roadCars = [];
  state.trains = [
    {
      id: 'lead',
      track: 'a',
      position: 30,
      speed: 0,
      stopped: true,
      crashed: true,
      derailed: false,
    },
    {
      id: 'following',
      track: 'a',
      position: -20,
      speed: 0,
      stopped: false,
      crashed: false,
      derailed: false,
    },
  ];
  state = advance(n, state, { signal_a: 1, barrier: 1 }, 8, 0.05);
  assert.ok(state.faults.includes('collision'));
  const [lead, following] = state.trains;
  assert.ok(overlaps(trainFootprint(lead), trainFootprint(following)));
  assert.ok(bodySeparation(trainCollisionBody(lead), trainCollisionBody(following)) < 2e-6);
  assert.ok(
    following.position > lead.position - (RAILWAY.trainFront + RAILWAY.trainRear) / RAILWAY.scale,
    'The narrow visible nose reaches the actual wagon rather than the larger reservation box.',
  );
});

test('route reservation protects converging bodies but cannot by itself cause a turnout derailment', () => {
  const n = node('railway', { initialA: -29, initialB: -100 });
  const original = initialScenarioState(n);
  assert.equal(trainReservesSection(original.trains[0]), true);
  const changed = advanceScenario(n, original, { points: 1, run: 0 }, 0);
  assert.equal(changed.fault, false);
  const tail = initialScenarioState(n);
  tail.trains[0].position = 47;
  assert.equal(evaluateScenario(n, tail, {}).occupied, 1);
  tail.trains[0].position = 82;
  assert.equal(evaluateScenario(n, tail, {}).occupied, 0);
});

test('swept contact coordinates agree across coarse and fine physics calls for road and rail collisions', () => {
  for (const type of ['traffic_junction', 'railway']) {
    const n = node(type),
      inputs = type === 'railway' ? { signal_a: 1, barrier: 0 } : { ns_green: 1, ew_green: 1 };
    const coarse = advance(n, initialScenarioState(n), inputs, 8, 0.25);
    const fine = advance(n, initialScenarioState(n), inputs, 8, 0.002);
    assert.deepEqual(coarse.collisionPair, fine.collisionPair);
    near(coarse.collisionPoint.x, fine.collisionPoint.x, 1e-6);
    near(coarse.collisionPoint.z, fine.collisionPoint.z, 1e-6);
  }
});

test('overlapping reservation envelopes cannot invent a collision between separated visible solids', () => {
  const n = node('railway');
  let state = initialScenarioState(n);
  state.trains = [{ ...state.trains[0], position: 33 }];
  state.roadCars = [{ id: 'clear-car', direction: 1, position: -3, crashed: false }];
  assert.ok(overlaps(trainFootprint(state.trains[0]), carFootprint(state.roadCars[0], 'railway')));
  assert.ok(
    bodySeparation(
      trainCollisionBody(state.trains[0]),
      carCollisionBody(state.roadCars[0], 'railway'),
    ) > 0.01,
  );
  state = advanceScenario(n, state, { throttle: 0 }, 0.01);
  assert.equal(state.fault, false);
  assert.equal(state.collisionPoint, null);
  assert.ok(state.roadCars[0].position > -3);
  const cross = node('traffic_junction', { initialCars: 0 });
  let road = initialScenarioState(cross);
  road.cars = [
    { id: 'ns', axis: 'ns', position: -2.4 },
    { id: 'ew', axis: 'ew', position: -9 },
  ];
  assert.ok(overlaps(...road.cars.map((car) => carFootprint(car))));
  assert.equal(bodiesOverlap(...road.cars.map((car) => carCollisionBody(car))), false);
  road = advanceScenario(cross, road, { ns_green: 1, ew_green: 1 }, 0.0001);
  assert.equal(road.crash, false);
});

test('independent turnouts select genuinely different departure trajectories in both directions', () => {
  for (const track of ['a', 'b']) {
    const outcomes = [];
    for (const diverted of [false, true]) {
      const n = node('railway');
      let state = initialScenarioState(n);
      state.trains = state.trains.filter((train) => train.track === track);
      state.roadCars = [];
      const controls = {
        signal_a: Number(track === 'a'),
        signal_b: Number(track === 'b'),
        points: track === 'a' ? 0 : Number(!diverted),
        exit_points: track === 'b' ? 1 : Number(diverted),
        barrier: 1,
      };
      state = advance(n, state, controls, track === 'a' ? 16 : 20, 0.05);
      assert.equal(state.fault, false, state.faults.join(','));
      const train = state.trains[0],
        pose = railwayPose(train);
      assert.ok(train.position > 60);
      assert.equal(train.exitRoute, track === 'a' ? Number(diverted) : Number(!diverted));
      assert.ok(diverted ? Math.abs(pose.x) > 2 : Math.abs(pose.x) < 1e-10);
      const before = pose.x;
      state = advanceScenario(
        n,
        state,
        { ...controls, points: 1 - controls.points, exit_points: 1 - controls.exit_points },
        0.01,
      );
      assert.equal(state.fault, false, 'Switching after the tail clears is safe.');
      assert.ok(
        Math.abs(railwayPose(state.trains[0]).x - before) < 0.02,
        'A latched route cannot teleport after leaving the points.',
      );
      outcomes.push(pose.x);
    }
    assert.ok(Math.abs(outcomes[1] - outcomes[0]) > 2);
  }
});

test('turnout controls gang only when unwired and derail only the physically occupied end', () => {
  const n = node('railway');
  const ganged = advanceScenario(n, initialScenarioState(n), { points: 1, run: 0 }, 0);
  assert.equal(evaluateScenario(n, ganged, {}).points_state, 1);
  assert.equal(evaluateScenario(n, ganged, {}).exit_points_state, 1);
  const independent = advanceScenario(
    n,
    initialScenarioState(n),
    { points: 0, exit_points: 1, run: 0 },
    0,
  );
  assert.equal(independent.points, 0);
  assert.equal(independent.exitPoints, 1);
  let occupied = initialScenarioState(n);
  occupied.trains = [{ ...occupied.trains[0], position: 33 }];
  occupied.roadCars = [];
  const clearEnd = advanceScenario(n, occupied, { points: 1, exit_points: 0, run: 0 }, 0);
  assert.equal(clearEnd.fault, false);
  const unsafe = advanceScenario(n, occupied, { points: 0, exit_points: 1, run: 0 }, 0);
  assert.equal(unsafe.failure, 'points_under_train');
  assert.equal(unsafe.trains[0].derailed, true);
  assert.equal(unsafe.trains[0].crashed, false);
  assert.equal(unsafe.collisionPoint, null);
});
