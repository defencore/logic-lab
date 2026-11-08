import { fixture, objects, bounds } from './fixtures/automation-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  AUTOMATION_TYPES,
  initialAutomationState,
} from '../../../../src/scenes/models/automation/index.js';

test('greenhouse vent, irrigation, flood surface and crop health follow measured state', () => {
  const { root, model, dispose } = fixture('greenhouse'),
    state = initialAutomationState({ type: 'greenhouse' });
  model.update({ state, parameters: {} });
  assert.equal(objects(root, 'greenhouse-flood')[0].visible, false);
  assert.ok(objects(root, 'water-drop').every((object) => !object.visible));
  const dryRotation = objects(root, 'greenhouse-vent')[0].rotation.x;
  model.update({
    state: {
      ...state,
      time: 10,
      moisture: 99,
      health: 10,
      growth: 80,
      controls: { ...state.controls, vent: 1, pump: 1, grow_light: 1 },
    },
    parameters: {},
  });
  assert.equal(objects(root, 'greenhouse-flood')[0].visible, true);
  assert.ok(objects(root, 'water-drop').every((object) => object.visible));
  assert.notEqual(objects(root, 'greenhouse-vent')[0].rotation.x, dryRotation);
  dispose();
});

test('greenhouse glazing forms a pitched roof and the hinged vent stays within the framing envelope', () => {
  const { root, model, dispose } = fixture('greenhouse');
  const state = initialAutomationState({ type: 'greenhouse' });
  model.update({ state, parameters: {} });
  const vent = objects(root, 'greenhouse-vent')[0];
  const hinge = vent.position.clone();
  const closed = bounds(vent);
  assert.equal(
    objects(root, 'greenhouse-roof').length,
    5,
    'roof is tiled around a real vent opening',
  );
  assert.ok(closed.min.z >= -2.7 && closed.max.z <= -0.4, 'closed vent is inside the rear roof');
  assert.ok(closed.min.y > 4.1 && closed.max.y < 4.9, 'closed vent follows the roof pitch');
  model.update({
    state: { ...state, controls: { ...state.controls, vent: 1, pump: 1 } },
    parameters: {},
  });
  assert.deepEqual(vent.position, hinge, 'vent rotates about its seated ridge-side hinge');
  const open = bounds(vent);
  assert.ok(open.max.y > closed.max.y + 0.5);
  assert.ok(model.bounds.containsBox(open), 'full vent travel fits the stable camera bounds');
  assert.ok(Math.abs(bounds(objects(root, 'greenhouse-slab')[0]).min.y - 0.085) < 1e-6);
  for (let time = 0; time < 8; time += 0.1) {
    model.update({
      state: { ...state, time, controls: { ...state.controls, pump: 1 } },
      parameters: {},
    });
    const beds = objects(root, 'greenhouse-soil').map(bounds);
    for (const drop of objects(root, 'water-drop')) {
      const point = drop.getWorldPosition(new THREE.Vector3());
      assert.ok(
        point.y > beds[0].max.y,
        'drops terminate at soil rather than falling through the floor',
      );
      assert.ok(
        beds.some(
          (bed) =>
            point.x > bed.min.x &&
            point.x < bed.max.x &&
            point.z > bed.min.z &&
            point.z < bed.max.z,
        ),
        'irrigation falls within a planted bed',
      );
    }
  }
  dispose();
});
