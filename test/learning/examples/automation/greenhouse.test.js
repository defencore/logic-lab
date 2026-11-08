import {
  open,
  source,
  advance,
  output,
  input,
  state,
  reset,
} from './fixtures/automation-examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('greenhouse climate feedback grows plants while a failed heater raises temperature before damage', () => {
  const context = open('greenhouse-climate');
  advance(context, 60);
  assert.ok(output(context, 'world', 'growth') > 20);
  assert.equal(output(context, 'world', 'health'), 100);
  source(context, 'unsafe-heat', 1);
  advance(context, 12);
  assert.ok(output(context, 'world', 'temperature') > 30);
  assert.equal(input(context, 'vent'), 0);
  advance(context, 120);
  assert.ok(output(context, 'world', 'health') < 60);
  assert.equal(output(context), 1);
  assert.equal(state(context).failure, 'heat');
  source(context, 'unsafe-heat', 0);
  reset(context);
  assert.equal(output(context, 'world', 'health'), 100);
  assert.equal(output(context), 0);
});

test('greenhouse irrigation remembers both middle-band states, avoids invalid reset and exposes a real flooding bypass', () => {
  const context = open('greenhouse-irrigation');
  const middleStates = new Set();
  let highest = 0,
    lowest = 100;
  advance(context, 180, () => {
    const moisture = output(context, 'world', 'moisture');
    highest = Math.max(highest, moisture);
    lowest = Math.min(lowest, moisture);
    if (
      moisture > 45 &&
      moisture < 55 &&
      output(context, 'world', 'dry') === 0 &&
      output(context, 'world', 'wet') === 0
    )
      middleStates.add(input(context, 'pump'));
  });
  assert.deepEqual([...middleStates].sort(), [0, 1]);
  assert.ok(lowest < 35.1 && highest > 75);
  source(context, 'reset', 1);
  assert.equal(output(context, 'memory', 'q'), 0);
  assert.deepEqual(context.runtime.diagnostics, []);
  source(context, 'reset', 0);
  source(context, 'force-pump', 1);
  advance(context, 60);
  assert.ok(output(context, 'world', 'moisture') > 88);
  assert.ok(output(context, 'world', 'health') < 100);
  assert.equal(state(context).failure, 'flood');
  source(context, 'force-pump', 0);
  reset(context);
  assert.equal(output(context, 'world', 'health'), 100);
});
