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
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../../../../src/scenes/models/scenarios/index.js';

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
