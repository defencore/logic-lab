import { open, value, advance, output, input } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('stepper lab measures pulse travel, direction, disable, reset and microsteps', () => {
  const context = open('stepper-basics');
  assert.equal(output(context, 'axis', 'position'), 10);
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'axis', 'position') - 10.8) < 1e-8);
  value(context, 'direction', 0);
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'axis', 'position') - 10) < 1e-8);
  value(context, 'enable', 0);
  const held = output(context, 'axis', 'position');
  advance(context, 0.5);
  assert.equal(output(context, 'axis', 'position'), held);
  value(context, 'reset', 1);
  assert.equal(output(context, 'axis', 'position'), 10);
  value(context, 'reset', 0);
  value(context, 'direction', 1);
  value(context, 'enable', 1);
  value(context, 'axis', 4, 'microsteps');
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'axis', 'position') - 10.2) < 1e-8);
});

test('printer homing lab automatically reaches its minimum, stops and permits reverse escape', () => {
  const context = open('printer-homing');
  assert.equal(output(context, 'axis', 'position'), 5);
  advance(context, 2);
  assert.equal(output(context, 'axis', 'position'), 0);
  assert.equal(input(context, 'home-led'), 1);
  assert.equal(input(context, 'axis', 'enable'), 0);
  advance(context, 0.5);
  assert.equal(output(context, 'axis', 'position'), 0);
  value(context, 'direction', 1);
  assert.equal(output(context, 'axis', 'position'), 0);
  advance(context, 0.25);
  assert.ok(output(context, 'axis', 'position') > 0.9);
  assert.equal(input(context, 'home-led'), 0);
  value(context, 'direction', 0);
  advance(context, 0.5);
  assert.equal(output(context, 'axis', 'position'), 0);
  value(context, 'reset', 1);
  assert.equal(output(context, 'axis', 'position'), 5);
});

test('position-control lab follows shared setpoints, reverses and respects motion enable', () => {
  const context = open('position-control');
  for (const target of [128, 64, 192]) {
    value(context, 'target', target);
    advance(context, 3);
    const requested = (target / 255) * 8;
    assert.ok(Math.abs(output(context, 'axis', 'position') - requested) <= 0.03);
    assert.equal(input(context, 'target-led'), 1);
    const held = output(context, 'axis', 'position');
    advance(context, 0.1);
    assert.equal(output(context, 'axis', 'position'), held);
  }
  value(context, 'run', 0);
  const held = output(context, 'axis', 'position');
  value(context, 'target', 32);
  advance(context, 1);
  assert.equal(output(context, 'axis', 'position'), held);
  assert.equal(input(context, 'target-led'), 0);
  value(context, 'run', 1);
  advance(context, 4);
  assert.ok(Math.abs(output(context, 'axis', 'position') - (32 / 255) * 8) <= 0.03);
  assert.equal(input(context, 'target-led'), 1);
});

test('three-axis printer lab shares pulses while preserving independent mechanics and controls', () => {
  const context = open('printer-xyz');
  assert.deepEqual(
    context.project.nodes.filter((node) => node.type === 'stepper').map((node) => node.id),
    ['x-axis', 'y-axis', 'z-axis'],
  );
  assert.equal(context.project.nodes.length, 22);
  advance(context, 1);
  for (const [axis, expected] of [
    ['x', 6.6],
    ['y', 11.6],
    ['z', 3.4],
  ]) {
    assert.ok(Math.abs(output(context, `${axis}-axis`, 'position') - expected) < 1e-8);
  }
  value(context, 'y-direction', 0);
  advance(context, 1);
  assert.ok(Math.abs(output(context, 'y-axis', 'position') - 10) < 1e-8);
  const heldX = output(context, 'x-axis', 'position');
  const previousZ = output(context, 'z-axis', 'position');
  value(context, 'x-enable', 0);
  advance(context, 1);
  assert.equal(output(context, 'x-axis', 'position'), heldX);
  assert.ok(output(context, 'z-axis', 'position') > previousZ + 0.39);
});

test('three-axis printer lab exposes six inclusive limit indicators at hard endpoints', () => {
  for (const side of ['min', 'max']) {
    const project = createExample('printer-xyz');
    for (const axis of ['x', 'y', 'z']) {
      const motor = project.nodes.find((node) => node.id === `${axis}-axis`);
      motor.params.initial =
        side === 'max' ? 20 - motor.params.lead / 200 : motor.params.lead / 200;
      project.nodes.find((node) => node.id === `${axis}-direction`).params.value =
        side === 'max' ? 1 : 0;
    }
    const context = { project, runtime: createRuntime() };
    simulate(project, context.runtime, 0);
    advance(context, 0.1);
    for (const axis of ['x', 'y', 'z']) {
      assert.equal(output(context, `${axis}-axis`, 'position'), side === 'max' ? 20 : 0);
      assert.equal(input(context, `${axis}-${side}-led`), 1);
      assert.equal(input(context, `${axis}-${side === 'max' ? 'min' : 'max'}-led`), 0);
    }
    assert.deepEqual(context.runtime.diagnostics, []);
  }
});
