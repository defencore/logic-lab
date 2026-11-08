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
