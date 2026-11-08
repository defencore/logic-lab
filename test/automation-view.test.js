import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAutomationModel, AUTOMATION_FRAMING } from '../src/automation-view.js';
import { AUTOMATION_TYPES, initialAutomationState } from '../src/automation-worlds.js';

function fixture(type) {
  const resources = new Set(),
    root = new THREE.Group(),
    geometries = new Map(),
    materials = new Map();
  const keep = (object) => {
    resources.add(object);
    return object;
  };
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, keep(factory()));
    return geometries.get(key);
  };
  const material = (color, metalness = 0, roughness = 0.65) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!materials.has(key))
      materials.set(key, keep(new THREE.MeshStandardMaterial({ color, metalness, roughness })));
    return materials.get(key);
  };
  const context = {
    root,
    keep,
    geometry,
    material,
    box: (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
    sphere: (r) => geometry(`sphere:${r}`, () => new THREE.SphereGeometry(r, 24, 16)),
    cylinder: (top, bottom, height, segments = 28) =>
      geometry(
        `cylinder:${top}:${bottom}:${height}:${segments}`,
        () => new THREE.CylinderGeometry(top, bottom, height, segments),
      ),
    mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(shape, paint);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
  };
  return {
    root,
    model: createAutomationModel(type, context),
    dispose() {
      resources.forEach((resource) => resource.dispose?.());
    },
  };
}
function objects(root, role) {
  const result = [];
  root.traverse((object) => {
    if (object.userData.role === role) result.push(object);
  });
  return result;
}
function transforms(root) {
  const result = [];
  root.traverse((object) =>
    result.push([
      object.id,
      ...object.position,
      ...object.quaternion,
      ...object.scale,
      object.visible,
    ]),
  );
  return result;
}

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

function bounds(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object, true);
}

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
