import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequence, appendAction } from '../../src/experiments/actions.js';

const project = () => ({
  version: 1,
  name: 'FM action limits',
  nodes: [{ id: 'fm', type: 'fm', x: 0, y: 0, params: {} }],
  wires: [],
});
test('recorded FM modulation depth uses the same 0–1 contract as the model and editor', () => {
  const sequence = createSequence(project());
  assert.throws(
    () => appendAction(sequence, { at: 0, node: 'fm', key: 'depth', value: 2 }),
    /supported range/,
  );
  appendAction(sequence, { at: 0, node: 'fm', key: 'depth', value: 0.75 });
  appendAction(sequence, { at: 0.1, node: 'fm', key: 'amplitude', value: 3.3 });
  assert.equal(sequence.actions[1].value, 3.3);
  const invalid = project();
  invalid.nodes[0].params.depth = 1000;
  assert.throws(() => createSequence(invalid), /recording range/);
});
