import test from 'node:test';
import assert from 'node:assert/strict';
import { samplingAdvice } from '../../src/signals/sampling.js';

test('high-frequency analog traces offer a window that resolves the carrier', () => {
  const project = { nodes: [{ type: 'am', params: { carrier: 1000, frequency: 1, depth: 0 } }] };
  const advice = samplingAdvice(project, null, 1);
  assert.equal(advice.adequate, false);
  assert.ok(advice.target <= 0.01);
  assert.equal(samplingAdvice(project, null, advice.target).adequate, true);
  assert.equal(samplingAdvice({ nodes: [] }, null, 60).adequate, true);
});
