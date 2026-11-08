import { node, wire, circuit, source, byte, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('reactivating sequential components does not capture clock or trigger edges ignored while disabled', () => {
  for (const type of ['d_ff', 'counter', 'shift_register', 'monostable']) {
    const sequential = node('memory', type);
    const project = circuit(
      [source('data', 1), source('clock', 0), sequential],
      [
        wire('clock', 'out', 'memory', type === 'monostable' ? 'trigger' : 'clk'),
        ...(['d_ff', 'shift_register'].includes(type) ? [wire('data', 'out', 'memory', 'd')] : []),
      ],
    );
    const runtime = evaluate(project);
    sequential.enabled = false;
    project.nodes.find((node) => node.id === 'clock').params.value = 1;
    simulate(project, runtime, 0);
    sequential.enabled = true;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'memory', type === 'd_ff' ? 'q' : 'out'), 0, type);
    project.nodes.find((node) => node.id === 'clock').params.value = 0;
    simulate(project, runtime, 0);
    project.nodes.find((node) => node.id === 'clock').params.value = 1;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'memory', type === 'd_ff' ? 'q' : 'out'), 1, type);
  }
});

test('D flip-flop captures once per rising edge and resets asynchronously', () => {
  const project = circuit(
    [source('d', 1), source('clk', 0), source('reset', 0), node('ff', 'd_ff')],
    [
      wire('d', 'out', 'ff', 'd'),
      wire('clk', 'out', 'ff', 'clk'),
      wire('reset', 'out', 'ff', 'reset'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'ff', 'q'), 0);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ff', 'q'), 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0.1);
  assert.equal(output(runtime, 'ff', 'q'), 1);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ff', 'q'), 0);
});

test('flip-flops sample simultaneous edges without racing through a chain', () => {
  const project = circuit(
    [source('data', 1), source('clk', 0), node('a', 'd_ff'), node('b', 'd_ff')],
    [
      wire('data', 'out', 'a', 'd'),
      wire('a', 'q', 'b', 'd'),
      wire('clk', 'out', 'a', 'clk'),
      wire('clk', 'out', 'b', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'a', 'q'), 1);
  assert.equal(output(runtime, 'b', 'q'), 0);
});

test('counter counts clock rising edges and respects enable', () => {
  const project = circuit(
    [node('clk', 'clock', { frequency: 2 }), source('en', 1), node('counter', 'counter')],
    [wire('clk', 'out', 'counter', 'clk'), wire('en', 'out', 'counter', 'enable')],
  );
  const runtime = evaluate(project);
  for (let step = 0; step < 200; step++) simulate(project, runtime, 0.01);
  assert.equal(output(runtime, 'counter'), 4);
  project.nodes[1].params.value = 0;
  for (let step = 0; step < 100; step++) simulate(project, runtime, 0.01);
  assert.equal(output(runtime, 'counter'), 4);
});

test('SR latch remembers its state and flags an invalid set/reset', () => {
  const project = circuit(
    [source('s', 1), source('r', 0), node('latch', 'sr_latch')],
    [wire('s', 'out', 'latch', 's'), wire('r', 'out', 'latch', 'r')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'latch', 'q'), 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'latch', 'q'), 1);
  project.nodes[0].params.value = 1;
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'latch', 'q'), 'X');
  assert.ok(runtime.diagnostics.some((entry) => entry.code === 'invalid_sr'));
});

test('JK and T flip-flops toggle on rising edges', () => {
  const project = circuit(
    [source('one', 1), source('clk', 0), node('jk', 'jk_ff'), node('t', 't_ff')],
    [
      wire('one', 'out', 'jk', 'j'),
      wire('one', 'out', 'jk', 'k'),
      wire('one', 'out', 't', 't'),
      wire('clk', 'out', 'jk', 'clk'),
      wire('clk', 'out', 't', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  for (let count = 0; count < 4; count++) {
    project.nodes[1].params.value = 1;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'jk', 'q'), (count + 1) % 2);
    assert.equal(output(runtime, 't', 'q'), (count + 1) % 2);
    project.nodes[1].params.value = 0;
    simulate(project, runtime, 0);
  }
});

test('register and shift register retain data between edges', () => {
  const project = circuit(
    [
      byte('data', 173),
      source('serial', 1),
      source('clk', 0),
      node('reg', 'register'),
      node('shift', 'shift_register'),
    ],
    [
      wire('data', 'out', 'reg', 'd'),
      wire('serial', 'out', 'shift', 'd'),
      wire('clk', 'out', 'reg', 'clk'),
      wire('clk', 'out', 'shift', 'clk'),
    ],
  );
  const runtime = evaluate(project);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'reg'), 173);
  assert.equal(output(runtime, 'shift'), 1);
  project.nodes[2].params.value = 0;
  simulate(project, runtime, 0);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'shift'), 3);
});

test('RAM writes on a rising edge, reads addressed data and releases its output', () => {
  const project = circuit(
    [
      byte('address', 3),
      byte('data', 197),
      source('clk', 0),
      source('we', 1),
      source('oe', 1),
      node('ram', 'ram'),
    ],
    [
      wire('address', 'nibble', 'ram', 'address'),
      wire('data', 'out', 'ram', 'data'),
      wire('clk', 'out', 'ram', 'clk'),
      wire('we', 'out', 'ram', 'we'),
      wire('oe', 'out', 'ram', 'oe'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'ram'), 'Z');
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  project.nodes[3].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ram'), 197);
  project.nodes[0].params.value = 4;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ram'), 0);
  project.nodes[4].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'ram'), 'Z');
});

test('ROM and register-file addresses use fixed 4-bit and 3-bit pins', () => {
  const project = circuit(
    [
      byte('address', 2),
      byte('data', 91),
      source('clk', 0),
      source('we', 1),
      node('rom', 'rom', { data: '0,0xA0,0xff' }),
      node('rf', 'register_file'),
    ],
    [
      wire('address', 'nibble', 'rom', 'address'),
      wire('address', 'address', 'rf', 'read'),
      wire('address', 'address', 'rf', 'write'),
      wire('data', 'out', 'rf', 'data'),
      wire('clk', 'out', 'rf', 'clk'),
      wire('we', 'out', 'rf', 'we'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'rom'), 255);
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'rf'), 91);
});
