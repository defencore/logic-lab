import { node, near, advance, positions } from './fixtures/scenarios.js';
import test from 'node:test';
import assert from 'node:assert/strict';
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
} from '../../../../src/scenes/transport/geometry.js';
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../../../../src/scenes/models/scenarios/index.js';

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
