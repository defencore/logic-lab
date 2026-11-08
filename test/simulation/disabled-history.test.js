import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';

test('disabled channels append aligned unknown gaps instead of relabeling old measurements with new timestamps', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', enabled: true, params: { frequency: 1, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  for (let i = 0; i < 10; i++) simulate(project, runtime, 0.1);
  const original = [...runtime.history.clock];
  project.nodes[0].enabled = false;
  for (let i = 0; i < 10; i++) simulate(project, runtime, 0.1);
  assert.equal(runtime.history.clock.length, runtime.historyTimes.length);
  assert.deepEqual(runtime.history.clock.slice(0, 10), original);
  assert.deepEqual(runtime.history.clock.slice(10), Array(10).fill(null));
  project.nodes[0].enabled = true;
  simulate(project, runtime, 0.1);
  assert.equal(typeof runtime.history.clock.at(-1), 'number');
  assert.equal(runtime.history.clock.at(-2), null);
});
