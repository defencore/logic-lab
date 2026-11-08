import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../../src/components/catalog/index.js';
import {
  SCENARIO_VIEW_TYPES,
  createScenarioModel,
} from '../../../src/scenes/views/scenarios/index.js';
import { createMotionModel } from '../../../src/scenes/views/mechanics/model.js';
import { inspectionTargets } from '../../../src/scenes/common/inspection.js';
import { sceneContext, objects } from './fixtures/scene-context.js';

test('every scenario has linked physical objects and every tagged endpoint exists on its real circuit component', (t) => {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () =>
        new Proxy(
          { measureText: (text) => ({ width: text.length * 9 }) },
          { get: (object, key) => object[key] || (() => {}) },
        ),
    }),
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  for (const type of SCENARIO_VIEW_TYPES) {
    const f = sceneContext(),
      model = createScenarioModel(type, f.context);
    model.update({ state: {}, parameters: {} });
    const definition = getDefinition(type),
      ports = new Set();
    f.root.traverse((object) => {
      for (const tag of object.userData.inspection || []) {
        if (!tag.port) continue;
        const pins = definition[tag.side === 'in' ? 'inputs' : 'outputs'];
        assert.ok(
          pins.some((pin) => pin.id === tag.port),
          `${type}: ${tag.side}.${tag.port} must be a real physical contact`,
        );
        ports.add(`${tag.side}:${tag.port}`);
      }
    });
    assert.ok(
      ports.size >= (type === 'traffic_light' ? 3 : 4),
      `${type} exposes linked actuators and sensors`,
    );
    f.dispose();
  }
});

test('mechanical motors, carriages and sensors map to their actual node IDs and update after reassignment', () => {
  const f = sceneContext({ mechanics: true }),
    model = createMotionModel(f.context);
  const snapshot = {
    motors: [
      { id: 'motor-x', label: 'X', position: 10, angle: 45, min: 0, max: 100, enabled: true },
    ],
    sensors: [
      {
        id: 'sensor-x',
        motorId: 'motor-x',
        threshold: 0,
        position: 10,
        signal: 0,
        triggered: false,
        enabled: true,
      },
    ],
  };
  model.update(snapshot);
  assert.deepEqual(inspectionTargets(model.axes[0].motor.children[0])[0], {
    nodeId: 'motor-x',
    port: 'angle',
    side: 'out',
  });
  assert.deepEqual(inspectionTargets(model.axes[0].carriage.children[0])[0], {
    nodeId: 'motor-x',
    port: 'position',
    side: 'out',
  });
  const sensor = objects(f.root, 'position-sensor')[0];
  assert.deepEqual(inspectionTargets(sensor.children[0])[0], {
    nodeId: 'sensor-x',
    port: 'out',
    side: 'out',
  });
  snapshot.motors[0].id = 'reassigned';
  model.update(snapshot);
  assert.equal(inspectionTargets(model.axes[0].motor.children[0])[0].nodeId, 'reassigned');
  model.update({ motors: [], sensors: [] });
  assert.deepEqual(inspectionTargets(model.axes[0].carriage.children[0]), []);
  model.dispose();
  f.dispose();
});
