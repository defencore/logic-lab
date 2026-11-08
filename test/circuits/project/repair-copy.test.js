import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverProjectCopy } from '../../../src/circuits/recover-project.js';

const original = () => ({
  version: 1,
  name: 'Old servo work',
  nodes: [
    { id: 'pwm', type: 'pwm', x: 10, y: 20, params: { frequency: 105, duty: 0.5 } },
    {
      id: 'servo',
      type: 'servo',
      x: 30,
      y: 40,
      params: { minDuty: 0.18, maxDuty: 0.82, range: 180 },
    },
    { id: 'scope', type: 'scope', x: 50, y: 60, params: {} },
  ],
  wires: [
    { id: 'old', from: { node: 'pwm', port: 'duty' }, to: { node: 'servo', port: 's1' } },
    { id: 'trace', from: { node: 'pwm', port: 'out' }, to: { node: 'scope', port: 'in' } },
  ],
});

test('explicit recovery copies retain circuit layout and observations while disconnecting unsupported servo commands', () => {
  const source = JSON.stringify(original(), null, 2);
  const result = recoverProjectCopy(source);
  assert.equal(result.disconnected, 1);
  assert.equal(result.project.name, 'Old servo work');
  assert.equal(result.project.nodes[1].x, 30);
  assert.deepEqual(result.project.nodes[1].params, { range: 180 });
  assert.deepEqual(
    result.project.wires.map((wire) => wire.id),
    ['trace'],
  );
  assert.equal(source, JSON.stringify(original(), null, 2));
});

test('recovery copies do not accept recordings or hide unrelated invalid project data', () => {
  assert.equal(
    recoverProjectCopy(JSON.stringify({ kind: 'logic-lab-sequence', initialProject: original() })),
    null,
  );
  const bad = original();
  bad.nodes[0].type = 'unknown';
  assert.equal(recoverProjectCopy(JSON.stringify(bad)), null);
  assert.equal(recoverProjectCopy('{broken'), null);
  const modern = original();
  modern.nodes[1].params = {};
  modern.wires[0].from.port = 'out';
  assert.equal(recoverProjectCopy(JSON.stringify(modern)), null);
});
