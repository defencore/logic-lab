import {
  open,
  value,
  output,
  advanceProcess,
  processState,
  bodiesContact,
  collisionBodies,
  openRailwayUnsafe,
} from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JUNCTION,
  RAILWAY,
  RAIL_RESERVATION,
  trainFootprint,
  carFootprint,
} from '../../../src/scenes/transport/geometry.js';

test('canonical railway circuit safely alternates real road and train traffic for three minutes', () => {
  const context = open('railway-interlocking');
  let previousPoints = processState(context, 'railway').points;
  let handovers = 0,
    queues = 0,
    railWindows = 0;
  const movingRoadCars = new Set();
  assert.equal(output(context, 'window'), 0, 'The laboratory must begin with moving road traffic.');
  advanceProcess(context, 180, (current) => {
    const state = processState(current, 'railway');
    const controls = current.runtime.inputs.railway;
    assert.equal(output(current, 'railway', 'fault'), 0);
    assert.ok(state.trains.every((train) => !train.crashed && !train.derailed));
    assert.ok(state.roadCars.every((car) => !car.crashed));
    assert.ok(!(controls.signal_a && controls.signal_b));
    if (controls.signal_a || controls.signal_b) {
      railWindows++;
      assert.equal(output(current, 'window'), 1);
      assert.equal(output(current, 'railway', 'gate_closed'), 1);
      assert.equal(output(current, 'railway', 'crossing_clear'), 1);
    }
    if (state.points !== previousPoints) {
      handovers++;
      assert.ok(
        state.trains.every((train) => !bodiesContact(trainFootprint(train), RAIL_RESERVATION)),
        'Points changed before the entire train cleared the protected corridor.',
      );
      previousPoints = state.points;
    }
    for (const train of state.trains)
      if (train.stopped && train.position <= RAILWAY.stopPosition + 1e-7) {
        assert.ok(
          !bodiesContact(trainFootprint(train), RAIL_RESERVATION),
          'A red-signal waiting train must not reserve the protected route.',
        );
      }
    for (const car of state.roadCars) {
      if (car.speed > 0) movingRoadCars.add(car.id);
      if (car.stopped && car.position < 0) {
        queues++;
        assert.ok(
          car.position * RAILWAY.roadScale + JUNCTION.carLength / 2 < -RAILWAY.gateX,
          'A queued road vehicle nose must stop before the gate.',
        );
      }
    }
  });
  const state = processState(context, 'railway');
  assert.ok(state.passed >= 6);
  assert.ok(state.roadPassed >= 6);
  assert.ok(handovers >= 4 && railWindows > 0 && queues > 0);
  assert.equal(movingRoadCars.size, 2);
});

test('railway unsafe overrides report actual train/train and train/road body contact', () => {
  for (const open of [0, 1]) {
    const context = openRailwayUnsafe(open);
    advanceProcess(context, 16);
    const state = processState(context, 'railway');
    assert.equal(output(context, 'railway', 'fault'), 1);
    assert.ok(state.faults.includes(open ? 'open_barrier' : 'collision'));
    const bodies = collisionBodies(state);
    assert.ok(
      bodiesContact(...bodies),
      'A recorded collision must involve contacting physical bodies.',
    );
    assert.ok(Number.isFinite(state.collisionPoint.x) && Number.isFinite(state.collisionPoint.z));
    assert.ok(
      open
        ? state.collisionPair.some((id) => id.startsWith('road-'))
        : state.collisionPair.every((id) => id.startsWith('train-')),
    );
    value(context, 'unsafe', 0);
    value(context, 'open', 0);
    advanceProcess(context, 0.1);
    assert.equal(output(context, 'railway', 'fault'), 1);
    value(context, 'reset', 1);
    assert.equal(output(context, 'railway', 'fault'), 0);
  }
});

test('an open railway gate is protected by red signals and cannot invent a crash on an empty road', () => {
  const guarded = open('railway-interlocking');
  value(guarded, 'open', 1);
  advanceProcess(guarded, 45);
  assert.equal(output(guarded, 'railway', 'fault'), 0);
  assert.ok(processState(guarded, 'railway').roadPassed > 0);
  assert.ok(
    processState(guarded, 'railway').trains.every(
      (train) => train.stopped && train.position === RAILWAY.stopPosition,
    ),
  );
  const empty = openRailwayUnsafe(1);
  const state = processState(empty, 'railway');
  state.roadCars = [];
  state.trains = state.trains.filter((train) => train.track === 'a');
  advanceProcess(empty, 25);
  assert.equal(output(empty, 'railway', 'fault'), 0);
  assert.equal(processState(empty, 'railway').collisionPair, null);
  assert.ok(
    processState(empty, 'railway').passed >= 1,
    'The isolated train must actually cross, not merely remain stopped.',
  );
});

test('railway overspeed remains a physical derailment independently of crossing accidents', () => {
  const context = open('railway-interlocking');
  value(context, 'unsafe', 1);
  value(context, 'throttle', 120);
  advanceProcess(context, 4);
  const state = processState(context, 'railway');
  assert.ok(state.faults.includes('overspeed'));
  assert.ok(state.trains.some((train) => train.derailed));
});
