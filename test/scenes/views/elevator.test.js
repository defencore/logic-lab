import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createElevator } from '../../../src/scenes/views/scenarios/elevator.js';
import { boundsForScene, fitCameraToBounds } from '../../../src/scenes/common/camera.js';
import { floorAt } from '../../../src/scenes/models/elevator/config.js';
import { sceneContext, objects, worldBounds } from './fixtures/scene-context.js';

test('elevator cabin, counterweight and doors use actual plant snapshots with floor-aligned geometry', () => {
  const f = sceneContext(),
    model = createElevator(f.context);
  const cabin = objects(f.root, 'elevator-cabin')[0],
    weight = objects(f.root, 'elevator-counterweight')[0];
  const floor = objects(f.root, 'elevator-cabin-floor')[0],
    landings = objects(f.root, 'elevator-landing');
  const cabinDoors = objects(f.root, 'elevator-cabin-door'),
    landingDoors = objects(f.root, 'elevator-landing-door');
  model.update({});
  assert.equal(cabin.position.y, 0.45, 'empty snapshots start on floor 1');
  assert.deepEqual(
    landings.map((landing) => landing.userData.floor),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.deepEqual(
    objects(f.root, 'elevator-floor-label').map((label) => label.userData.floor),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(landingDoors.length, 18);
  for (let position = 1; position <= 9; position++) {
    const snapshot = { state: { position, door: 0, moving: 0, fault: false } },
      before = structuredClone(snapshot);
    model.update(snapshot);
    assert.deepEqual(snapshot, before);
    assert.ok(Math.abs(cabin.position.y - (0.45 + (position - 1) * 3.2)) < 1e-12);
    assert.ok(Math.abs(cabin.position.y + weight.position.y - 26.5) < 1e-12);
    const cabinFloor = worldBounds(floor),
      landing = worldBounds(landings[position - 1]);
    assert.ok(
      Math.abs(cabinFloor.max.y - landing.max.y) < 1e-6,
      'cabin floor is flush with the landing',
    );
    assert.ok(
      landing.min.z - cabinFloor.max.z > 0 && landing.min.z - cabinFloor.max.z < 0.03,
      'threshold has a small positive gap',
    );
    assert.ok(
      worldBounds(cabinDoors[0]).max.x < worldBounds(cabinDoors[1]).min.x,
      'closed leaves have a real centre seam',
    );
    model.update({ state: { position, door: 1 } });
    assert.ok(
      worldBounds(cabinDoors[1]).min.x - worldBounds(cabinDoors[0]).max.x > 2.1,
      'open cabin doorway has usable clearance',
    );
    landingDoors.forEach((door, index) =>
      assert.ok(
        Math.abs(
          Math.abs(door.position.x) - (Math.floor(index / 2) + 1 === position ? 1.595 : 0.535),
        ) < 1e-12,
      ),
    );
  }
  model.update({ state: { position: 7.012, door: 0.5 } });
  assert.equal(floorAt(7.012), 7);
  assert.ok(
    Math.abs(landingDoors[12].position.x) > 1,
    'landing opening uses the same floor zone as the physical plant',
  );
  const held = cabin.position.y;
  model.update({ state: { position: 'X', door: 'X', uncertain: true } });
  assert.equal(cabin.position.y, held, 'unknown values retain the last actual pose');
  f.dispose();
});

test('elevator framing contains the complete mechanism in wide and narrow layouts', () => {
  const f = sceneContext(),
    model = createElevator(f.context);
  for (let position = 1; position <= 9; position++) {
    model.update({ state: { position, door: 1 } });
    assert.ok(
      model.bounds.containsBox(boundsForScene(f.root)),
      'declared bounds include doors, counterweight and drive',
    );
  }
  for (const aspect of [0.5, 420 / 380, 420 / 300, 2])
    for (const direction of [
      [1, 0.6, 1.4],
      [0, 0.01, 1],
      [0, 1, 0.001],
    ]) {
      const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
      const controls = { target: new THREE.Vector3(), update() {} };
      fitCameraToBounds(camera, controls, model.bounds, direction);
      camera.updateMatrixWorld(true);
      for (const x of [model.bounds.min.x, model.bounds.max.x])
        for (const y of [model.bounds.min.y, model.bounds.max.y])
          for (const z of [model.bounds.min.z, model.bounds.max.z]) {
            const projected = new THREE.Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(projected.x) <= 1.001 && Math.abs(projected.y) <= 1.001);
          }
    }
  f.dispose();
});
