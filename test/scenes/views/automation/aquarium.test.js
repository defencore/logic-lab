import { fixture, objects, transforms, bounds } from './fixtures/automation-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOMATION_TYPES,
  initialAutomationState,
} from '../../../../src/scenes/models/automation/index.js';

test('aquarium fish swim, gradually rise belly-up after death and replace their pupils with visible X eyes', () => {
  const { root, model, dispose } = fixture('aquarium'),
    state = initialAutomationState({ type: 'aquarium' });
  model.update({ state, parameters: {} });
  const live = objects(root, 'aquarium-fish');
  assert.equal(live.length, 4);
  assert.equal(objects(root, 'dead-fish-eye').filter((object) => object.visible).length, 0);
  const early = live.map((object) => object.position.clone());
  model.update({ state: { ...state, time: 2 }, parameters: {} });
  assert.ok(live.some((object, index) => object.position.distanceTo(early[index]) > 0.1));
  const dead = {
    ...state,
    time: 2,
    fish: state.fish.map((fish) => ({ ...fish, alive: false, health: 0, deadAt: 2 })),
  };
  model.update({ state: dead, parameters: {} });
  const lower = live.map((object) => object.position.y);
  model.update({ state: { ...dead, time: 8 }, parameters: {} });
  live.forEach((object, index) => {
    assert.ok(object.position.y > lower[index] + 0.5);
    assert.ok(Math.abs(object.rotation.x - Math.PI) < 1e-9);
    assert.equal(object.userData.alive, false);
  });
  assert.equal(objects(root, 'dead-fish-eye').filter((object) => object.visible).length, 16);
  model.update({ state, parameters: {} });
  assert.equal(objects(root, 'dead-fish-eye').filter((object) => object.visible).length, 0);
  assert.ok(live.every((object) => object.userData.alive));
  dispose();
});

test('aquarium bubbles, feeding pellets, heater and lamps display their actual circuit actuators', () => {
  const { root, model, dispose } = fixture('aquarium'),
    state = initialAutomationState({ type: 'aquarium' });
  model.update({ state, parameters: {} });
  assert.ok(objects(root, 'oxygen-bubble').every((object) => !object.visible));
  assert.ok(objects(root, 'food-pellet').every((object) => !object.visible));
  const powered = {
    ...state,
    time: 2,
    controls: {
      ...state.controls,
      heater: 1,
      cooler: 1,
      aerator: 1,
      feed: 1,
      light: 1,
      filter: 1,
      water_change: 1,
    },
  };
  model.update({ state: powered, parameters: {} });
  assert.ok(objects(root, 'oxygen-bubble').every((object) => object.visible));
  assert.ok(objects(root, 'food-pellet').every((object) => object.visible));
  assert.ok(objects(root, 'aquarium-water-change').every((object) => object.visible));
  assert.ok(objects(root, 'aquarium-heater')[0].material.emissiveIntensity > 0);
  assert.ok(
    objects(root, 'actuator-lamp').every((object) => object.material.emissiveIntensity > 0),
  );
  const frozen = transforms(root);
  model.update({ state: powered, parameters: {}, time: 123 });
  assert.deepEqual(transforms(root), frozen);
  dispose();
});

test('all eight fish remain inside the actual water volume and keep separated swimming lanes', () => {
  const { root, model, dispose } = fixture('aquarium');
  const state = initialAutomationState({ type: 'aquarium', params: { fishCount: 8 } });
  const water = bounds(objects(root, 'aquarium-water')[0]);
  const sand = bounds(objects(root, 'aquarium-sand')[0]);
  assert.ok(water.min.y >= sand.max.y - 1e-6, 'water starts at the sand surface');
  for (let time = 0; time <= 80; time += 0.5) {
    model.update({ state: { ...state, time }, parameters: {} });
    const fish = objects(root, 'aquarium-fish');
    const boxes = fish.map(bounds);
    for (const box of boxes) {
      assert.ok(
        water.containsBox(box),
        `entire fish stays behind glass and below water at ${time}`,
      );
      assert.ok(box.min.y > sand.max.y, 'fish clears sand and rear decorations');
    }
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++)
        assert.equal(boxes[a].intersectsBox(boxes[b]), false, `fish ${a}/${b} at ${time}`);
  }
  model.update({ state: { ...state, time: 20 }, parameters: {} });
  const lastSwimming = objects(root, 'aquarium-fish').map((fish) => fish.position.clone());
  const deadFish = state.fish.map((fish) => ({ ...fish, alive: false, deadAt: 20 }));
  model.update({ state: { ...state, time: 20, fish: deadFish }, parameters: {} });
  objects(root, 'aquarium-fish').forEach((fish, index) =>
    assert.ok(
      fish.position.distanceTo(lastSwimming[index]) < 1e-9,
      'death does not teleport fish to a different location',
    ),
  );
  for (let time = 20; time <= 23; time += 0.05) {
    model.update({ state: { ...state, time, fish: deadFish }, parameters: {} });
    const boxes = objects(root, 'aquarium-fish').map(bounds);
    for (const box of boxes) assert.ok(water.containsBox(box), 'rising fish remains in the water');
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++)
        assert.equal(
          boxes[a].intersectsBox(boxes[b]),
          false,
          'floating fish do not pass through each other',
        );
  }
  for (const fish of objects(root, 'aquarium-fish')) {
    const box = bounds(fish);
    assert.ok(water.containsBox(box), 'belly-up fish floats below the actual water surface');
    assert.ok(box.max.y > water.max.y - 0.1, 'dead fish reaches the surface');
  }
  for (const leg of objects(root, 'aquarium-leg'))
    assert.ok(Math.abs(bounds(leg).min.y - 0.085) < 1e-6);
  const table = bounds(objects(root, 'aquarium-table')[0]);
  for (const leg of objects(root, 'aquarium-leg'))
    assert.ok(Math.abs(bounds(leg).max.y - table.min.y) < 1e-6);
  dispose();
});
