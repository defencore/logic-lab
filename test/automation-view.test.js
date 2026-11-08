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
    assert.ok(object.position.y > lower[index] + 1);
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
