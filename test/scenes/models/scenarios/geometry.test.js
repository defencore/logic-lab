import { node, advance } from './fixtures/scenarios.js';
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
