import test from 'node:test';
import assert from 'node:assert/strict';
import { getSceneEntries, getSceneSnapshot, sceneHealth } from '../src/scene-data.js';

test('3D is available only for actual mechanisms or scene objects', () => {
  const project = {
    nodes: [
      { id: 'a', type: 'and' },
      { id: 'sensor', type: 'limit_switch' },
    ],
    wires: [],
  };
  assert.deepEqual(getSceneEntries(project), []);
  project.nodes.push({ id: 'motor', type: 'stepper' }, { id: 'motor2', type: 'stepper' });
  assert.deepEqual(getSceneEntries(project), [
    { id: '@mechanics', type: 'mechanics', nodeIds: ['motor', 'motor2'] },
  ]);
  project.nodes.push({ id: 'road', type: 'traffic_junction', enabled: false });
  assert.deepEqual(
    getSceneEntries(project).map((entry) => entry.id),
    ['@mechanics', 'road'],
  );
  project.nodes = project.nodes.filter(
    (node) => !['stepper', 'traffic_junction'].includes(node.type),
  );
  assert.deepEqual(getSceneEntries(project), []);
});

test('mechanical group IDs cannot hide a valid scene named mechanics', () => {
  const project = {
    nodes: [
      { id: 'motor', type: 'stepper' },
      { id: 'mechanics', type: 'traffic_light', params: {} },
    ],
    wires: [],
  };
  const entries = getSceneEntries(project);
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['@mechanics', 'mechanics'],
  );
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 2);
});

test('scene snapshots follow live circuit state and never invent safe outputs', () => {
  const node = { id: 'road', type: 'traffic_junction', params: { carSpeed: 8 }, enabled: true };
  const project = { nodes: [node], wires: [] };
  const state = { failure: 'collision', cars: [] };
  const runtime = {
    time: 4,
    state: { road: { scenario: state } },
    inputs: { road: { ns_green: 1 } },
    outputs: { road: { crash: 1 } },
  };
  const snapshot = getSceneSnapshot(project, runtime, getSceneEntries(project)[0]);
  assert.equal(snapshot.parameters.carSpeed, 8);
  assert.equal(snapshot.time, 4);
  assert.equal(snapshot.state, state);
  assert.equal(snapshot.inputs, runtime.inputs.road);
  assert.deepEqual(sceneHealth(snapshot), { status: 'fault', reason: 'collision' });
  runtime.outputs.road.crash = 'X';
  assert.equal(sceneHealth(snapshot).status, 'unknown');
  state.failure = 'invalid_parameters';
  assert.deepEqual(sceneHealth(snapshot), { status: 'warning', reason: 'invalid_parameters' });
  node.enabled = false;
  assert.equal(sceneHealth(snapshot).status, 'disabled');
  assert.equal(getSceneSnapshot(project, runtime, { nodeId: 'missing' }), null);
});
