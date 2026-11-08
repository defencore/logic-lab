import { fixture, transforms } from './fixtures/automation-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAutomationModel,
  AUTOMATION_FRAMING,
} from '../../../../src/scenes/views/automation/index.js';
import {
  AUTOMATION_TYPES,
  initialAutomationState,
} from '../../../../src/scenes/models/automation/index.js';

test('all automation worlds build detailed finite geometry and remain frozen when global wall time changes', () => {
  for (const type of AUTOMATION_TYPES) {
    const { root, model, dispose } = fixture(type),
      state = initialAutomationState({ type });
    model.update({ state, parameters: {}, time: 0 });
    const frozen = transforms(root);
    model.update({ state, parameters: {}, time: 900 });
    assert.deepEqual(transforms(root), frozen, type);
    let count = 0;
    root.traverse((object) => {
      for (const value of [...object.position, ...object.quaternion, ...object.scale])
        assert.ok(Number.isFinite(value), type);
      if (object.isMesh) {
        count++;
        assert.ok(object.geometry.getAttribute('position').array.every(Number.isFinite));
      }
    });
    assert.ok(count > 60, `${type}: actual detailed scene`);
    for (const view of ['target', 'perspective', 'front', 'top'])
      assert.ok(AUTOMATION_FRAMING[type][view].every(Number.isFinite));
    dispose();
  }
});
