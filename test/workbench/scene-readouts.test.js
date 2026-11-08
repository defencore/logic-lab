import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { getSceneSnapshot } from '../../src/scenes/data/scenarios.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { sceneInputValue } from '../../src/workbench/scene-readouts.js';

const throttlePins = getDefinition('railway').inputs.filter((pin) => pin.group === 'throttle');
const bits = (snapshot) => throttlePins.map((pin) => sceneInputValue(snapshot, pin));
function fixture(value) {
  const railway = { id: 'rail', type: 'railway', enabled: true, params: {} };
  const project = { nodes: [railway], wires: [] };
  if (value !== undefined) {
    project.nodes.unshift({ id: 'speed', type: 'bus_input', params: { value } });
    project.wires = throttlePins.map((pin) => ({
      id: `speed-${pin.bit}`,
      from: { node: 'speed', port: `out${pin.bit}` },
      to: { node: 'rail', port: pin.id },
    }));
  }
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  return {
    project,
    runtime,
    railway,
    snapshot: () =>
      getSceneSnapshot(project, runtime, { id: 'rail', type: 'railway', nodeId: 'rail' }),
  };
}

test('unwired railway throttle contacts display the individual bits of documented default30', () => {
  const f = fixture(),
    snapshot = f.snapshot(),
    before = structuredClone(snapshot);
  assert.equal(snapshot.inputs.throttle, 'Z');
  assert.equal(snapshot.physicalInputs, f.runtime.inputs.rail);
  assert.ok(throttlePins.every(({ id }) => snapshot.physicalInputs[id] === 'Z'));
  assert.equal(throttlePins.length, 8);
  assert.deepEqual(bits(snapshot), [0, 1, 1, 1, 1, 0, 0, 0]);
  assert.deepEqual(snapshot, before, 'readout inspection must not rewrite floating inputs');
});

test('grouped scene readouts agree with all actual physical throttle inputs after simulation', () => {
  const f = fixture(173);
  for (const value of [173, 0, 255, 30]) {
    f.project.nodes.find(({ id }) => id === 'speed').params.value = value;
    simulate(f.project, f.runtime, 0);
    const snapshot = f.snapshot(),
      before = JSON.stringify({ project: f.project, inputs: f.runtime.inputs, snapshot });
    assert.equal(snapshot.inputs.throttle, value);
    assert.deepEqual(
      bits(snapshot),
      throttlePins.map(({ id }) => f.runtime.inputs.rail[id]),
    );
    assert.deepEqual(
      bits(snapshot),
      throttlePins.map(({ bit }) => (value >> bit) & 1),
    );
    assert.equal(
      JSON.stringify({ project: f.project, inputs: f.runtime.inputs, snapshot }),
      before,
    );
  }
});

test('conflicting throttle bits retain known physical pins instead of spreading aggregate X', () => {
  const f = fixture(173);
  f.project.nodes.push({ id: 'conflict', type: 'switch', params: { value: 0 } });
  f.project.wires.push({
    id: 'conflict-wire',
    from: { node: 'conflict', port: 'out' },
    to: { node: 'rail', port: throttlePins[0].id },
  });
  simulate(f.project, f.runtime, 0);
  const snapshot = f.snapshot(),
    before = structuredClone(snapshot);
  assert.equal(snapshot.inputs.throttle, 'X');
  assert.deepEqual(bits(snapshot), ['X', 0, 1, 1, 0, 1, 0, 1]);
  assert.deepEqual(
    bits(snapshot),
    throttlePins.map(({ id }) => f.runtime.inputs.rail[id]),
  );
  assert.deepEqual(snapshot, before);
});

test('a partially floating word retains individual Z rather than inventing a default bit', () => {
  const f = fixture(173);
  f.project.wires = f.project.wires.filter(({ id }) => id !== 'speed-2');
  simulate(f.project, f.runtime, 0);
  const snapshot = f.snapshot();
  assert.equal(snapshot.inputs.throttle, 'X');
  assert.deepEqual(bits(snapshot), [1, 0, 'Z', 1, 0, 1, 0, 1]);
});

test('aggregate-only snapshots retain X while a disabled mechanism releases all readouts to Z', () => {
  const f = fixture(173),
    snapshot = f.snapshot();
  delete snapshot.physicalInputs;
  snapshot.inputs.throttle = 'X';
  assert.deepEqual(bits(snapshot), Array(8).fill('X'));
  assert.equal(snapshot.inputs.throttle, 'X');
  f.railway.enabled = false;
  simulate(f.project, f.runtime, 0);
  assert.deepEqual(bits(f.snapshot()), Array(8).fill('Z'));
  const signalPin = getDefinition('railway').inputs.find(({ id }) => id === 'signal_a');
  assert.equal(sceneInputValue(f.snapshot(), signalPin), 'Z');
});

test('ordinary bit contacts use per-mechanism defaults and retain known or unknown commands', () => {
  const f = fixture(),
    snapshot = f.snapshot();
  for (const [port, fallback] of [
    ['run', 1],
    ['reset', 0],
    ['signal_a', 0],
    ['barrier', 0],
  ]) {
    const pin = getDefinition('railway').inputs.find(({ id }) => id === port);
    assert.equal(sceneInputValue(snapshot, pin), fallback);
    snapshot.inputs[port] = 1;
    assert.equal(sceneInputValue(snapshot, pin), 1);
    snapshot.inputs[port] = 0;
    assert.equal(sceneInputValue(snapshot, pin), 0);
    snapshot.inputs[port] = 'X';
    assert.equal(sceneInputValue(snapshot, pin), 'X');
    snapshot.inputs[port] = 'Z';
    assert.equal(sceneInputValue(snapshot, pin), fallback);
  }
});
