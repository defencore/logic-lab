import test from 'node:test';
import assert from 'node:assert/strict';
import { byteFixture } from './fixtures/state-inspection.js';
import { node, wire } from './core/fixtures/simulator.js';
import { simulate } from '../../src/simulation/index.js';
import { inspectByte } from '../../src/workbench/state-inspection/model.js';

test('register capture metadata includes same-value edges, ignores EN0 and clears on reset', () => {
  const f = byteFixture();
  f.pulse();
  const first = f.runtime.state.device.lastByteChange;
  assert.equal(first.kind, 'capture');
  assert.equal(first.definite, true);
  assert.equal(first.at, 0);
  assert.equal(first.sequence, 1);
  assert.deepEqual(first.before, Array(8).fill(0));
  assert.deepEqual(first.after, [1, 0, 1, 0, 0, 1, 0, 0]);
  simulate(f.project, f.runtime, 0);
  assert.equal(f.runtime.state.device.lastByteChange, first);
  f.pulse();
  const repeated = f.runtime.state.device.lastByteChange;
  assert.equal(repeated.sequence, 2);
  assert.deepEqual(repeated.before, repeated.after);
  f.set('enable', 0);
  f.set('data', 99);
  f.pulse();
  assert.equal(f.runtime.state.device.lastByteChange, repeated);
  assert.equal(f.runtime.state.device.q, 37);
  f.set('reset', 1);
  assert.equal(f.runtime.state.device.lastByteChange, null);
  assert.equal(f.runtime.state.device.q, 0);
});

test('counter events identify the actual count transition and overflow without inventing captures while disabled', () => {
  const f = byteFixture('counter', 3);
  f.pulse();
  const change = f.runtime.state.device.lastByteChange;
  assert.equal(change.kind, 'count');
  assert.deepEqual(change.before, [1, 1, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(change.after, [0, 0, 1, 0, 0, 0, 0, 0]);
  f.set('enable', 0);
  f.pulse();
  assert.equal(f.runtime.state.device.lastByteChange, change);
  const overflow = byteFixture('counter', 255);
  overflow.pulse();
  assert.deepEqual(overflow.runtime.state.device.lastByteChange.before, Array(8).fill(1));
  assert.deepEqual(overflow.runtime.state.device.lastByteChange.after, Array(8).fill(0));
  overflow.set('reset', 1);
  assert.equal(
    overflow.runtime.state.device.lastByteChange,
    null,
    'reset metadata even when Q already equals zero',
  );
});

test('possible captures/counts preserve per-bit uncertainty and shift inspection reuses its existing event', () => {
  for (const type of ['register', 'counter']) {
    const f = byteFixture(type, 3);
    f.project.nodes.push(node('low', 'gnd'));
    f.project.wires.push(wire('low', 'out', 'device', 'enable'));
    simulate(f.project, f.runtime, 0);
    f.pulse();
    const change = f.runtime.state.device.lastByteChange;
    assert.equal(change.definite, false);
    assert.ok(change.after.includes('X'));
    assert.equal(inspectByte(f.node, f.runtime).change, change);
  }
  const f = byteFixture('shift_register');
  f.pulse();
  assert.equal(f.runtime.state.device.lastShift.kind, 'shift');
  assert.equal(f.runtime.state.device.lastByteChange, undefined);
  assert.equal(inspectByte(f.node, f.runtime).change, f.runtime.state.device.lastShift);
});

test('zero-byte register capture markers clear on reset even if the byte itself never changed', () => {
  const f = byteFixture('register', 0, 0);
  f.pulse();
  assert.equal(f.runtime.state.device.q, 0);
  assert.equal(f.runtime.state.device.lastByteChange.sequence, 1);
  f.set('reset', 1);
  assert.equal(f.runtime.state.device.q, 0);
  assert.equal(f.runtime.state.device.lastByteChange, null);
});
