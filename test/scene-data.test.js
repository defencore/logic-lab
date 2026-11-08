import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSceneEntries,
  getSceneSnapshot,
  sceneHealth,
  sceneMessageKey,
  sceneControlSwitch,
  sceneActuatorValues,
} from '../src/scene-data.js';

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

test('automation objects expose their actual runtime through the same scene selector and snapshots', () => {
  const project = {
    nodes: ['aquarium', 'greenhouse', 'smart_home'].map((type) => ({
      id: type,
      type,
      params: {},
      enabled: true,
    })),
    wires: [],
  };
  const entries = getSceneEntries(project);
  assert.deepEqual(
    entries.map(({ type }) => type),
    ['aquarium', 'greenhouse', 'smart_home'],
  );
  for (const entry of entries) {
    const state = { kind: entry.type, temperature: 24 };
    const runtime = {
      state: { [entry.nodeId]: { scenario: state } },
      inputs: { [entry.nodeId]: {} },
      outputs: { [entry.nodeId]: { temperature: 24 } },
      time: 2,
    };
    const snapshot = getSceneSnapshot(project, runtime, entry);
    assert.equal(snapshot.state, state);
    assert.equal(snapshot.outputs.temperature, 24);
    assert.equal(sceneHealth(snapshot).status, 'ready');
  }
});

test('manual turnout controls operate only the actual switch that drives the circuit port', () => {
  const project = {
    nodes: [
      { id: 'rail', type: 'railway' },
      { id: 'near', type: 'switch', enabled: true },
      { id: 'far', type: 'switch', enabled: true },
      { id: 'logic', type: 'and' },
    ],
    wires: [{ from: { node: 'near', port: 'out' }, to: { node: 'rail', port: 'points' } }],
  };
  assert.equal(sceneControlSwitch(project, 'rail', 'points'), 'near');
  assert.equal(sceneControlSwitch(project, 'rail', 'exit_points'), 'near');
  project.wires.push({
    from: { node: 'far', port: 'out' },
    to: { node: 'rail', port: 'exit_points' },
  });
  assert.equal(sceneControlSwitch(project, 'rail', 'exit_points'), 'far');
  project.wires[0].from.node = 'logic';
  assert.equal(sceneControlSwitch(project, 'rail', 'points'), null);
  project.nodes.find(({ id }) => id === 'far').enabled = false;
  assert.equal(sceneControlSwitch(project, 'rail', 'exit_points'), null);
});

test('actuator readouts show default commands and actual turnout position rather than a sensor request', () => {
  const aquarium = {
    node: { type: 'aquarium', enabled: true },
    inputs: { heater: 0, aerator: 1, filter: 'Z' },
    outputs: { cold: 1 },
  };
  const values = sceneActuatorValues(aquarium);
  assert.equal(values.heater, 0);
  assert.equal(values.aerator, 1);
  assert.equal(values.filter, 0);
  assert.equal(values.run, 1);
  aquarium.inputs.heater = 'X';
  assert.equal(sceneActuatorValues(aquarium).heater, 'X');
  aquarium.node.enabled = false;
  assert.ok(Object.values(sceneActuatorValues(aquarium)).every((value) => value === 'Z'));
  const railway = {
    node: { type: 'railway' },
    inputs: { points: 1, exit_points: 0 },
    outputs: { points_state: 0, exit_points_state: 1 },
  };
  assert.equal(sceneActuatorValues(railway).points, 0);
  assert.equal(sceneActuatorValues(railway).exit_points, 1);
});

test('process messages distinguish fish and plant damage from current security and latched pump faults', () => {
  assert.equal(sceneMessageKey({ node: { type: 'aquarium' } }, 'cold'), 'fishCold');
  assert.equal(sceneMessageKey({ node: { type: 'greenhouse' } }, 'cold'), 'plantCold');
  assert.equal(sceneMessageKey({ node: { type: 'smart_home' } }, 'empty_tank'), 'homeEmptyTank');
  assert.deepEqual(
    sceneHealth({ node: { type: 'smart_home' }, state: {}, outputs: { alarm: 1 } }),
    { status: 'warning', reason: 'homeSecurity' },
  );
  assert.deepEqual(
    sceneHealth({
      node: { type: 'smart_home' },
      state: { failure: 'empty_tank' },
      outputs: { alarm: 1 },
    }),
    { status: 'fault', reason: 'empty_tank' },
  );
});
