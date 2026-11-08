import test from 'node:test';
import assert from 'node:assert/strict';
import { availableProbes, recommendedProbes, probeId } from '../../src/experiments/probes.js';
import { createSequence, defaultProbes } from '../../src/experiments/actions.js';
import { node } from './fixtures/lab-assessment.js';

const circuit = (nodes) => ({ version: 1, name: 'Observed signals', nodes, wires: [] });
const probe = (node, port, side = 'outputs') => ({ node, port, side });

test('default recording includes every semantic output and passive display input, without physical bit duplicates', () => {
  const project = circuit([
    node('memory', 'd_ff'),
    node('adder', 'full_adder'),
    node('display', 'sevenseg'),
    node('pixels', 'matrix'),
    node('value', 'bus_input'),
    node('note', 'note'),
    node('group', 'group'),
  ]);
  const expected = [
    probe('memory', 'q'),
    probe('memory', 'nq'),
    probe('adder', 'sum'),
    probe('adder', 'carry'),
    probe('display', 'in', 'inputs'),
    probe('pixels', 'rows', 'inputs'),
    probe('pixels', 'cols', 'inputs'),
    probe('value', 'out'),
    probe('value', 'nibble'),
    probe('value', 'address'),
  ];
  assert.deepEqual(availableProbes(project), expected);
  assert.deepEqual(defaultProbes(project), expected);
  assert.deepEqual(createSequence(project).probes, expected);
  assert.equal(new Set(expected.map(probeId)).size, expected.length);
});

test('recordings cap defaults at 32 while assignment recommendations can select later outputs', () => {
  const project = circuit(Array.from({ length: 40 }, (_, i) => node(`source${i}`, 'switch')));
  assert.equal(availableProbes(project).length, 40);
  assert.equal(defaultProbes(project).length, 32);
  assert.equal(createSequence(project).probes.length, 32);
  const preferred = [probe('source39', 'out'), probe('source35', 'out')];
  assert.deepEqual(recommendedProbes(project, preferred), preferred);
  assert.deepEqual(createSequence(project, { probes: preferred }).probes, preferred);
  assert.throws(() => createSequence(project, { probes: availableProbes(project) }), /1 and 32/);
});

test('assignment recommendations retain valid chosen ports and discard missing or incorrect interfaces', () => {
  const project = circuit([node('memory', 'd_ff'), node('lamp', 'led')]);
  const preferred = [
    probe('deleted', 'out'),
    probe('memory', 'nq'),
    probe('memory', 'q', 'inputs'),
    probe('lamp', 'in', 'inputs'),
  ];
  assert.deepEqual(recommendedProbes(project, preferred), [preferred[1], preferred[3]]);
  assert.deepEqual(recommendedProbes(project, [preferred[0]], 2), [
    probe('memory', 'q'),
    probe('memory', 'nq'),
  ]);
});
