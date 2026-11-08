import {
  open,
  value,
  output,
  advanceProcess,
  processState,
  bodiesContact,
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

test('traffic-light laboratory exposes all eight real lamp states and valid passage', () => {
  const context = open('traffic-light');
  for (const red of [0, 1])
    for (const yellow of [0, 1])
      for (const green of [0, 1]) {
        value(context, 'red', red);
        value(context, 'yellow', yellow);
        value(context, 'green', green);
        assert.equal(output(context, 'light', 'valid'), Number(red + yellow + green === 1));
        assert.equal(
          output(context, 'light', 'go'),
          Number(green === 1 && red === 0 && yellow === 0),
        );
        assert.deepEqual(processState(context, 'light').lamps, { red, yellow, green });
      }
});

test('junction laboratory decodes safe phases, then creates a physical collision and resets', () => {
  const context = open('traffic-junction'),
    phases = new Set();
  advanceProcess(context, 120, (current) => {
    const signals = current.runtime.inputs.junction;
    assert.ok(!(signals.ns_green && signals.ew_green));
    assert.equal(output(current, 'junction', 'crash'), 0);
    const cars = processState(current, 'junction').cars;
    for (const car of cars.filter((car) => car.stopped)) {
      const nose = car.position * JUNCTION.scale + JUNCTION.carLength / 2;
      assert.ok(
        nose <= JUNCTION.stopLine + 1e-7,
        'Stopped car body must remain behind its stop line.',
      );
      assert.ok(nose < JUNCTION.zebraNear, 'A red queue must not occupy the zebra.');
    }
    for (const axis of ['ns', 'ew']) {
      const lane = cars.filter((car) => car.axis === axis).sort((a, b) => b.position - a.position);
      for (let index = 1; index < lane.length; index++) {
        const gap =
          (lane[index - 1].position - lane[index].position) * JUNCTION.scale - JUNCTION.carLength;
        assert.ok(
          gap >= JUNCTION.queueGap - 1e-7,
          'Queued bodies must retain their physical clearance.',
        );
      }
    }
    phases.add([signals.ns_green, signals.ns_yellow, signals.ew_green, signals.ew_yellow].join(''));
  });
  assert.equal(phases.size, 4);
  assert.ok(output(context, 'junction', 'passed') > 5);
  value(context, 'reset', 1);
  value(context, 'reset', 0);
  value(context, 'unsafe', 1);
  advanceProcess(context, 8);
  assert.equal(output(context, 'junction', 'crash'), 1);
  assert.ok(processState(context, 'junction').cars.filter((car) => car.crashed).length >= 2);
  const collision = processState(context, 'junction');
  const bodies = collision.collisionPair.map((id) =>
    carFootprint(collision.cars.find((car) => car.id === id)),
  );
  assert.ok(
    bodiesContact(...bodies),
    'A junction crash must be actual contact, not just simultaneous signals.',
  );
  assert.ok(
    Number.isFinite(collision.collisionPoint.x) && Number.isFinite(collision.collisionPoint.z),
  );
  value(context, 'unsafe', 0);
  advanceProcess(context, 0.2);
  assert.equal(output(context, 'junction', 'crash'), 1);
  value(context, 'reset', 1);
  assert.equal(output(context, 'junction', 'crash'), 0);
  value(context, 'reset', 0);
  advanceProcess(context, 20);
  assert.equal(output(context, 'junction', 'crash'), 0);
  assert.ok(output(context, 'junction', 'passed') > 0);
});
