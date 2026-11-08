import { open, value, advance, output, input } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('manual D-memory lesson captures edges, holds changed data, and resets', () => {
  const context = open('d-memory');
  value(context, 'data', 1);
  assert.equal(input(context, 'q'), 0);
  value(context, 'clock', 1);
  assert.equal(input(context, 'q'), 1);
  assert.equal(input(context, 'nq'), 0);
  value(context, 'data', 0);
  assert.equal(input(context, 'q'), 1);
  value(context, 'clock', 0);
  value(context, 'clock', 1);
  assert.equal(input(context, 'q'), 0);
  value(context, 'clock', 0);
  value(context, 'data', 1);
  value(context, 'clock', 1);
  value(context, 'reset', 1);
  assert.equal(input(context, 'q'), 0);
});

test('counter lesson exposes weighted bit lamps and respects its real controls', () => {
  const context = open('counter');
  advance(context, 2.5);
  assert.equal(output(context, 'counter'), 5);
  for (let i = 0; i < 8; i++) assert.equal(input(context, `bit${i}`), (5 >> i) & 1);
  value(context, 'enable', 0);
  advance(context, 1);
  assert.equal(output(context, 'counter'), 5);
  value(context, 'reset', 1);
  assert.equal(output(context, 'counter'), 0);
  for (let i = 0; i < 8; i++) assert.equal(input(context, `bit${i}`), 0);
});

test('memory lesson writes on a manual edge, retains address data and releases outputs', () => {
  const context = open('ram');
  assert.equal(output(context, 'ram'), 0);
  assert.equal(output(context, 'rom'), 20);
  assert.equal(output(context, 'registers'), 0);
  value(context, 'write', 1);
  assert.equal(output(context, 'ram'), 'Z');
  value(context, 'clock', 1);
  value(context, 'write', 0);
  assert.equal(output(context, 'ram'), 42);
  assert.equal(output(context, 'registers'), 42);
  value(context, 'address', 3);
  assert.equal(output(context, 'ram'), 0);
  assert.equal(output(context, 'rom'), 30);
  assert.equal(output(context, 'registers'), 0);
  value(context, 'address', 2);
  assert.equal(output(context, 'ram'), 42);
  assert.equal(output(context, 'registers'), 42);
  value(context, 'read', 0);
  assert.equal(output(context, 'ram'), 'Z');
  assert.equal(output(context, 'rom'), 'Z');
  assert.equal(output(context, 'registers'), 42);
});
