import { node, near, advance } from './fixtures/scenarios.js';
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
import { bodiesOverlap, bodySeparation } from '../../../../src/scenes/transport/shapes.js';
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../../../../src/scenes/models/scenarios/index.js';

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
