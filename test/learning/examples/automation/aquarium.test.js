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

test('aquarium life-support permissions and a stuck-heater fault cause measured deterioration before death and recover on reset', () => {
  const air = open('aquarium-life-support');
  source(air, 'air-permit', 0);
  advance(air, 40);
  assert.ok(output(air, 'world', 'oxygen') < 55);
  assert.equal(output(air, 'world', 'low_oxygen'), 1);
  assert.equal(input(air, 'aerator'), 0);
  assert.equal(output(air, 'world', 'alive'), 4);
  advance(air, 160);
  assert.equal(output(air), 1);
  assert.ok(output(air, 'world', 'alive') < 4);
  assert.equal(state(air).failure, 'oxygen');
  source(air, 'air-permit', 1);
  reset(air);
  assert.equal(output(air, 'world', 'alive'), 4);
  assert.equal(output(air, 'world', 'health'), 100);
  assert.equal(output(air), 0);

  const heat = open('aquarium-life-support');
  source(heat, 'unsafe-heat', 1);
  advance(heat, 8);
  assert.ok(output(heat, 'world', 'temperature') > 30);
  assert.equal(input(heat, 'cooler'), 0);
  assert.equal(output(heat, 'world', 'alive'), 4);
  advance(heat, 50);
  assert.equal(output(heat, 'world', 'alive'), 0);
  assert.equal(state(heat).failure, 'heat');
  source(heat, 'unsafe-heat', 0);
  advance(heat, 30);
  assert.equal(output(heat, 'world', 'alive'), 0, 'correcting a command cannot revive fish');
  reset(heat);
  assert.equal(output(heat, 'world', 'alive'), 4);
});

test('timed aquarium feeding produces bounded actual portions and an explicit bypass causes overfeeding', () => {
  const context = open('aquarium-feeding');
  let currentPulse = 0,
    longestPulse = 0,
    pulses = 0,
    previous = 0,
    minimumFood = Infinity;
  advance(context, 90, () => {
    const feeding = input(context, 'feed');
    if (feeding) {
      currentPulse += 0.05;
      if (!previous) pulses++;
      longestPulse = Math.max(longestPulse, currentPulse);
    } else currentPulse = 0;
    minimumFood = Math.min(minimumFood, output(context, 'world', 'food'));
    previous = feeding;
  });
  assert.ok(pulses > 4);
  assert.ok(longestPulse <= 1.05);
  assert.ok(minimumFood > 20);
  assert.equal(output(context, 'world', 'alive'), 4);
  source(context, 'force-feed', 1);
  advance(context, 10);
  assert.ok(output(context, 'world', 'food') > 85);
  assert.equal(input(context, 'feed'), 1);
  advance(context, 80);
  assert.equal(state(context).failure, 'overfed');
  assert.ok(output(context, 'world', 'alive') < 4);
  source(context, 'force-feed', 0);
  reset(context);
  assert.equal(output(context, 'world', 'alive'), 4);
  assert.equal(output(context), 0);
});

test('aquarium XOR schedule reproduces all four states and permanent light removes the resting interval', () => {
  const context = open('aquarium-lighting');
  for (const invert of [0, 1]) {
    source(context, 'invert', invert);
    assert.equal(output(context, 'world', 'day'), 1);
    assert.equal(input(context, 'light'), 1 ^ invert);
  }
  advance(context, 31);
  for (const invert of [0, 1]) {
    source(context, 'invert', invert);
    assert.equal(output(context, 'world', 'day'), 0);
    assert.equal(input(context, 'light'), invert);
  }
  source(context, 'invert', 0);
  source(context, 'force-light', 1);
  advance(context, 120);
  assert.ok(state(context).lightExposure > 90);
  assert.ok(output(context, 'world', 'health') < 100);
  assert.equal(output(context, 'world', 'alive'), 4);
  advance(context, 200);
  assert.equal(output(context, 'world', 'alive'), 0);
  assert.equal(state(context).failure, 'light');
  source(context, 'force-light', 0);
  reset(context);
  assert.equal(output(context, 'world', 'alive'), 4);
});

test('the complete aquarium lighting circuit survives changed day lengths and fish populations', () => {
  for (const [dayLength, fishCount, invert] of [
    [600, 8, 0],
    [10, 1, 1],
  ]) {
    const context = open('aquarium-lighting');
    source(context, 'world', dayLength, 'dayLength');
    source(context, 'world', fishCount, 'fishCount');
    reset(context);
    source(context, 'invert', invert);
    advance(context, dayLength * 2);
    assert.deepEqual(context.runtime.diagnostics, []);
    assert.equal(output(context, 'world', 'alive'), fishCount);
    assert.equal(output(context, 'world', 'health'), 100);
    assert.equal(output(context), 0);
  }
});
