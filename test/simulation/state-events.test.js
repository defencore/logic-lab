import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryFixture } from './fixtures/state-inspection.js';
import { node, wire, circuit, source } from './core/fixtures/simulator.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
} from '../../src/experiments/actions.js';

test('memory write metadata records actual edges including repeated same-value writes at one timestamp', () => {
  const f = memoryFixture();
  f.pulse();
  const first = f.runtime.state.memory.lastWrite;
  assert.equal(first.sequence, 1);
  assert.equal(first.at, 0);
  assert.equal(first.definite, true);
  assert.deepEqual(first.addresses, [2]);
  assert.deepEqual(first.cells[0].changed, [0, 2, 5]);
  assert.deepEqual(first.cells[0].before, Array(8).fill(0));
  assert.deepEqual(first.cells[0].after, [1, 0, 1, 0, 0, 1, 0, 0]);
  simulate(f.project, f.runtime, 0);
  assert.equal(
    f.runtime.state.memory.lastWrite,
    first,
    'settling and redraws must not invent write events',
  );
  f.pulse();
  assert.equal(f.runtime.state.memory.lastWrite.sequence, 2);
  assert.deepEqual(f.runtime.state.memory.lastWrite.cells[0].changed, []);
  assert.deepEqual(
    first.cells[0].before,
    Array(8).fill(0),
    'past metadata is immutable across later writes',
  );
  f.set('data', 99);
  f.set('address', 3);
  assert.equal(
    f.runtime.state.memory.lastWrite.sequence,
    2,
    'data/address levels do not write without CLK↑',
  );
  f.pulse();
  assert.equal(f.runtime.state.memory.memory[2], 37);
  assert.equal(f.runtime.state.memory.memory[3], 99);
  assert.equal(f.runtime.state.memory.lastWrite.sequence, 3);
});

test('uncertain write addresses identify all possibly changed cells without claiming a definite write', () => {
  const f = memoryFixture();
  f.set('address', 0);
  f.project.wires = f.project.wires.filter(
    ({ to }) => to.node !== 'memory' || to.port !== 'address0',
  );
  simulate(f.project, f.runtime, 0);
  f.pulse();
  const last = f.runtime.state.memory.lastWrite;
  assert.equal(last.definite, false);
  assert.deepEqual(last.addresses, [0, 1]);
  assert.equal(last.cells.length, 2);
  assert.deepEqual(last.cells[0].after, ['X', 0, 'X', 0, 0, 'X', 0, 0]);
  assert.deepEqual(f.runtime.state.memory.memoryBits[2], Array(8).fill(0));
});

test('memory reset and replay rebuild event metadata from the true recorded baseline', () => {
  const f = memoryFixture();
  const sequence = createSequence(f.project, { probes: [{ node: 'memory', port: 'out' }] });
  for (const [id, value] of [
    ['clk', 1],
    ['clk', 0],
    ['clk', 1],
  ])
    appendAction(sequence, { at: 0, node: id, key: 'value', value });
  finishSequence(sequence, 0.01);
  const a = replaySequence(sequence),
    b = replaySequence(sequence);
  assert.deepEqual(a.runtime.state.memory.lastWrite, b.runtime.state.memory.lastWrite);
  assert.equal(a.runtime.state.memory.lastWrite.sequence, 2);
  const reset = createRuntime();
  f.project.nodes.find(({ id }) => id === 'clk').params.value = 0;
  simulate(f.project, reset, 0);
  assert.equal(reset.state.memory.lastWrite, undefined);
  assert.deepEqual(reset.state.memory.memory, Array(16).fill(0));
});

test('shift metadata follows SER into Q0 and old Q0 toward Q1, while SOUT mirrors current Q7', () => {
  const project = circuit(
    [
      source('ser', 1),
      source('clk', 0),
      source('rst', 0),
      node('shift', 'shift_register', { initial: 128 }),
    ],
    [
      wire('ser', 'out', 'shift', 'd'),
      wire('clk', 'out', 'shift', 'clk'),
      wire('rst', 'out', 'shift', 'reset'),
    ],
  );
  const runtime = createRuntime();
  const set = (id, value) => {
    project.nodes.find((item) => item.id === id).params.value = value;
    simulate(project, runtime, 0);
  };
  simulate(project, runtime, 0);
  set('clk', 1);
  const first = runtime.state.shift.lastShift;
  assert.equal(first.ser, 1);
  assert.equal(first.before[7], 1);
  assert.equal(first.after[0], 1);
  assert.equal(runtime.signals.outputs.shift.out, 1);
  assert.equal(runtime.outputs.shift.serial, 0);
  set('ser', 0);
  assert.equal(runtime.state.shift.lastShift, first);
  set('clk', 0);
  set('clk', 1);
  assert.equal(runtime.state.shift.lastShift.sequence, 2);
  assert.equal(runtime.state.shift.lastShift.before[0], 1);
  assert.equal(runtime.state.shift.lastShift.after[1], 1);
  set('rst', 1);
  assert.equal(runtime.state.shift.lastShift, null);
  assert.equal(runtime.state.shift.q, 0);
});

test('reset clears a shift event even when the stored zero byte does not change', () => {
  const project = circuit(
    [source('ser', 0), source('clk', 0), source('rst', 0), node('shift', 'shift_register')],
    [
      wire('ser', 'out', 'shift', 'd'),
      wire('clk', 'out', 'shift', 'clk'),
      wire('rst', 'out', 'shift', 'reset'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(runtime.state.shift.q, 0);
  assert.equal(runtime.state.shift.lastShift.sequence, 1);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(runtime.state.shift.q, 0);
  assert.equal(runtime.state.shift.lastShift, null);
});
