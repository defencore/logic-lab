import { fixture, objects, transforms, bounds } from './fixtures/automation-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOMATION_TYPES,
  initialAutomationState,
} from '../../../../src/scenes/models/automation/index.js';

test('house gate, tank level, visitor, alarm and rain show the same state as their sensors', () => {
  const { root, model, dispose } = fixture('smart_home'),
    state = initialAutomationState({ type: 'smart_home' });
  model.update({ state, parameters: { dayLength: 60 } });
  const closed = objects(root, 'home-gate')[0].position.x;
  assert.equal(objects(root, 'home-visitor')[0].visible, false);
  model.update({
    state: {
      ...state,
      time: 8,
      gate: 1,
      water: 25,
      alarmActive: true,
      controls: { ...state.controls, sprinkler: 1, indoor_light: 1, outdoor_light: 1 },
    },
    parameters: { dayLength: 60 },
  });
  assert.ok(Math.abs(objects(root, 'home-gate')[0].position.x - closed) > 2.5);
  assert.equal(objects(root, 'home-visitor')[0].visible, true);
  assert.ok(objects(root, 'home-alarm')[0].material.emissiveIntensity > 0);
  assert.equal(objects(root, 'home-water')[0].scale.y, 0.25);
  assert.ok(objects(root, 'water-drop').every((object) => object.visible));
  const withRain = transforms(root);
  model.update({ state: { ...state, time: 24 }, parameters: { dayLength: 60 } });
  assert.notDeepEqual(transforms(root), withRain);
  assert.equal(objects(root, 'home-visitor')[0].visible, false);
  dispose();
});

test('sliding home gate clears posts and fences throughout its entire travel and water stays inside its tank', () => {
  const { root, model, dispose } = fixture('smart_home');
  const state = initialAutomationState({ type: 'smart_home' });
  const fixed = [...objects(root, 'home-fence'), ...objects(root, 'home-gate-post')].map(bounds);
  const lawn = bounds(objects(root, 'home-slab')[0]);
  const rail = bounds(objects(root, 'home-gate-track')[0]);
  assert.ok(
    Math.abs(rail.min.y - lawn.max.y) < 1e-6,
    'gate rail is seated on the modeled lawn slab',
  );
  assert.ok(
    rail.min.x >= lawn.min.x &&
      rail.max.x <= lawn.max.x &&
      rail.min.z >= lawn.min.z &&
      rail.max.z <= lawn.max.z,
  );
  for (let gate = 0; gate <= 1.001; gate += 0.05) {
    model.update({ state: { ...state, gate, water: gate * 100 }, parameters: {} });
    const moving = bounds(objects(root, 'home-gate')[0]);
    assert.ok(
      model.bounds.containsBox(moving),
      'the stable camera envelope contains the full gate sweep',
    );
    for (const wheel of objects(root, 'home-gate-wheel')) {
      const contact = bounds(wheel);
      assert.ok(Math.abs(contact.min.y - rail.max.y) < 1e-6, 'wheel tread touches the actual rail');
      assert.ok(
        contact.min.x >= rail.min.x &&
          contact.max.x <= rail.max.x &&
          contact.min.z >= rail.min.z &&
          contact.max.z <= rail.max.z,
        'wheel stays on the rail from closed to fully open',
      );
    }
    assert.ok(
      fixed.every((box) => !box.intersectsBox(moving)),
      `gate clears fence and posts at ${gate}`,
    );
    const tank = bounds(objects(root, 'home-water-tank')[0]);
    const water = objects(root, 'home-water')[0];
    if (water.visible)
      assert.ok(tank.containsBox(bounds(water)), 'all fill levels stay inside the actual shell');
  }
  model.update({ state: { ...state, water: 0, time: 8 }, parameters: {} });
  assert.equal(
    objects(root, 'home-water')[0].visible,
    false,
    'an empty tank has no floating water disc',
  );
  const visitor = bounds(objects(root, 'home-visitor')[0]);
  const path = bounds(objects(root, 'home-path')[0]);
  assert.ok(Math.abs(visitor.min.y - path.max.y) < 1e-6, 'visitor feet stand on the entrance path');
  dispose();
});
