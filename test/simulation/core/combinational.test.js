import { node, wire, circuit, source, byte, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('ALU operations produce byte, carry/borrow and zero flags', () => {
  const project = circuit(
    [byte('a', 250), byte('b', 10), byte('op', 0), node('alu', 'alu')],
    [
      wire('a', 'out', 'alu', 'a'),
      wire('b', 'out', 'alu', 'b'),
      wire('op', 'address', 'alu', 'op'),
    ],
  );
  const runtime = evaluate(project);
  assert.deepEqual(runtime.signals.outputs.alu, { out: 4, carry: 1, zero: 0 });
  project.nodes[2].params.value = 4;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'alu'), 240);
  project.nodes[0].params.value = 10;
  project.nodes[2].params.value = 1;
  simulate(project, runtime, 0);
  assert.deepEqual(runtime.signals.outputs.alu, { out: 0, carry: 0, zero: 1 });
});

test('splitter/merger preserve bit order and decoder maps digits', () => {
  const project = circuit(
    [
      byte('byte', 165),
      node('split', 'splitter'),
      node('merge', 'merger'),
      node('decode', 'decoder'),
    ],
    [
      wire('byte', 'out', 'split', 'in'),
      wire('byte', 'nibble', 'decode', 'in'),
      ...Array.from({ length: 8 }, (_, index) => wire('split', `b${index}`, 'merge', `b${index}`)),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'merge'), 165);
  assert.equal(output(runtime, 'decode'), 0x6d);
});

test('tri-state releases the net, encoders detect one-hot and priority', () => {
  const project = circuit(
    [
      byte('data', 0b10100000),
      source('en', 0),
      node('tri', 'tristate'),
      node('enc', 'encoder'),
      node('pri', 'priority_encoder'),
    ],
    [
      wire('data', 'out', 'tri', 'in'),
      wire('en', 'out', 'tri', 'enable'),
      wire('data', 'out', 'enc', 'in'),
      wire('data', 'out', 'pri', 'in'),
    ],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 'tri'), 'Z');
  assert.equal(output(runtime, 'enc'), 'X');
  assert.equal(output(runtime, 'pri'), 7);
  project.nodes[1].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'tri'), 160);
});
