import { open, value, advance, input } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('wired-AND lesson permits strong lows, released highs and a floating line', () => {
  const context = open('wired-and');
  for (const a of [0, 1])
    for (const b of [0, 1]) {
      value(context, 'a', a);
      value(context, 'b', b);
      assert.equal(input(context, 'line'), a & b);
    }
  context.project.nodes.find((node) => node.id === 'pull').enabled = false;
  simulate(context.project, context.runtime, 0);
  assert.equal(input(context, 'line'), 'Z');
  assert.ok(context.runtime.diagnostics.some((diagnostic) => diagnostic.code === 'floating'));
});

test('Schmitt lesson reaches opposite outputs at the same middle voltage', () => {
  const context = open('schmitt');
  assert.equal(input(context, 'clean'), 0);
  value(context, 'level', 200);
  assert.equal(input(context, 'clean'), 1);
  value(context, 'level', 128);
  assert.equal(input(context, 'clean'), 1);
  value(context, 'level', 50);
  assert.equal(input(context, 'clean'), 0);
  value(context, 'level', 128);
  assert.equal(input(context, 'clean'), 0);
});

test('one-shot lesson expires while held, ignores active retriggers and resets', () => {
  const context = open('monostable');
  value(context, 'trigger', 1);
  assert.equal(input(context, 'pulse'), 1);
  advance(context, 0.2);
  value(context, 'trigger', 0);
  value(context, 'trigger', 1);
  advance(context, 0.301);
  assert.equal(input(context, 'pulse'), 0);
  advance(context, 0.1);
  assert.equal(input(context, 'pulse'), 0);
  value(context, 'trigger', 0);
  value(context, 'trigger', 1);
  assert.equal(input(context, 'pulse'), 1);
  value(context, 'reset', 1);
  assert.equal(input(context, 'pulse'), 0);
});
