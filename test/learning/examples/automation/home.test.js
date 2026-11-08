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
import { createRuntime, simulate } from '../../../../src/simulation/index.js';

test('home climate permission denies a true request and equal-duration lighting trials measure additional energy', () => {
  const denied = open('home-climate');
  source(denied, 'comfort', 0);
  advance(denied, 20);
  assert.equal(output(denied, 'world', 'cold'), 1);
  assert.equal(input(denied, 'heater'), 0);
  const coldTemperature = output(denied, 'world', 'temperature');
  source(denied, 'comfort', 1);
  advance(denied, 5);
  assert.ok(output(denied, 'world', 'temperature') > coldTemperature);

  const normal = open('home-climate'),
    forced = open('home-climate');
  source(forced, 'force-lights', 1);
  advance(normal, 60);
  advance(forced, 60);
  assert.ok(output(forced, 'world', 'energy') > output(normal, 'world', 'energy'));
  assert.ok(
    Math.abs(output(forced, 'world', 'temperature') - output(normal, 'world', 'temperature')) <
      1e-8,
  );
});

test('yard authorization drives actual gate travel, unauthorized motion alarms, and rain/low-water protection blocks irrigation', () => {
  const authorized = open('yard-security');
  advance(authorized, 10);
  assert.equal(output(authorized, 'world', 'motion'), 1);
  assert.equal(output(authorized, 'world', 'gate_open'), 1);
  assert.equal(output(authorized), 0);
  const unauthorized = open('yard-security');
  source(unauthorized, 'authorized', 0);
  advance(unauthorized, 9);
  assert.equal(input(unauthorized, 'gate'), 0);
  assert.equal(output(unauthorized, 'world', 'gate_open'), 0);
  assert.equal(output(unauthorized), 1);
  advance(unauthorized, 6);
  assert.equal(output(unauthorized), 0, 'a current security alarm clears after motion');

  advance(authorized, 12);
  assert.equal(output(authorized, 'world', 'rain'), 1);
  assert.equal(input(authorized, 'sprinkler'), 0);
  const dry = open('yard-security');
  source(dry, 'world', 0, 'initialWater');
  delete dry.runtime.state.world;
  simulate(dry.project, dry.runtime, 0);
  assert.equal(output(dry, 'world', 'tank_low'), 1);
  assert.equal(input(dry, 'sprinkler'), 0);
  assert.equal(output(dry), 0);
  source(dry, 'force-pump', 1);
  advance(dry, 0.1);
  assert.equal(output(dry), 1);
  assert.equal(state(dry).failure, 'empty_tank');
  source(dry, 'force-pump', 0);
  advance(dry, 1);
  assert.equal(output(dry), 1, 'dry-pump failure is latched');
  reset(dry);
  assert.equal(output(dry), 0);
});
