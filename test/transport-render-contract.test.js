import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScenarioModel } from '../src/scenario-view.js';
import { initialScenarioState, advanceScenario, SCENARIO_DEFAULTS } from '../src/scenarios.js';
import { JUNCTION, carFootprint, trainFootprint } from '../src/transport-geometry.js';

function withScene(type, inspect) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const resources = new Set();
  const root = new THREE.Group();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const geometries = new Map();
  const paints = new Map();
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, keep(factory()));
    return geometries.get(key);
  };
  const material = (color, metalness = 0, roughness = 0.65) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!paints.has(key))
      paints.set(key, keep(new THREE.MeshStandardMaterial({ color, metalness, roughness })));
    return paints.get(key);
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        const context = new Proxy(
          { measureText: (value) => ({ width: String(value).length * 10 }) },
          {
            get: (target, key) => (key in target ? target[key] : () => {}),
          },
        );
        return { width: 0, height: 0, getContext: () => context };
      },
    },
  });
  try {
    const context = {
      root,
      keep,
      geometry,
      material,
      box: (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
      cylinder: (a, b, h, segments = 28) =>
        geometry(
          `cylinder:${a}:${b}:${h}:${segments}`,
          () => new THREE.CylinderGeometry(a, b, h, segments),
        ),
      sphere: (radius) =>
        geometry(`sphere:${radius}`, () => new THREE.SphereGeometry(radius, 24, 16)),
      mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
        const object = new THREE.Mesh(shape, paint);
        object.position.set(x, y, z);
        parent.add(object);
        return object;
      },
    };
    inspect(root, createScenarioModel(type, context));
  } finally {
    for (const resource of resources) resource.dispose();
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete globalThis.document;
  }
}

function entities(root, kind) {
  const result = [];
  root.traverse((object) => {
    if (object.userData.transportKind === kind) result.push(object);
  });
  return result;
}

function assertFits(group, body) {
  const right = { x: Math.cos(body.heading), z: -Math.sin(body.heading) };
  const forward = { x: Math.sin(body.heading), z: Math.cos(body.heading) };
  const point = new THREE.Vector3();
  let vertices = 0;
  group.traverse((object) => {
    if (!object.isMesh) return;
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      const x = point.x - body.x,
        z = point.z - body.z;
      assert.ok(
        Math.abs(x * right.x + z * right.z) <= body.halfWidth + 0.00001,
        `${group.userData.transportId}: rendered width exceeds the collision body`,
      );
      assert.ok(
        Math.abs(x * forward.x + z * forward.z) <= body.halfLength + 0.00001,
        `${group.userData.transportId}: rendered nose or tail exceeds the collision body`,
      );
      vertices++;
    }
  });
  assert.ok(vertices > 100, 'The actual detailed vehicle geometry was inspected.');
}

test('queued 3D cars fit their collision bodies and stop completely before the zebra', () => {
  const node = { type: 'traffic_junction', params: {}, enabled: true };
  let state = initialScenarioState(node);
  for (let index = 0; index < 1000; index++) state = advanceScenario(node, state, {}, 0.01);
  withScene(node.type, (root, model) => {
    model.update({ state, parameters: SCENARIO_DEFAULTS[node.type] });
    root.updateMatrixWorld(true);
    const cars = entities(root, 'junction_car');
    assert.equal(cars.length, state.cars.length);
    for (const group of cars) {
      const car = state.cars.find((item) => item.id === group.userData.transportId);
      assertFits(group, carFootprint(car));
      assert.ok(car.position * JUNCTION.scale + JUNCTION.carLength / 2 < JUNCTION.zebraNear);
    }
  });
});

test('both detailed 3D trains fit the same asymmetric bodies used by physics through curves and the block', () => {
  const node = { type: 'railway', params: {}, enabled: true };
  const state = initialScenarioState(node);
  state.roadCars = [];
  withScene(node.type, (root, model) => {
    for (const position of [-85, -55, -32, -16, 0, 18, 35, 60, 90]) {
      state.trains = ['a', 'b'].map((track) => ({
        id: `train-${track}`,
        track,
        position,
        speed: 0,
        stopped: true,
      }));
      model.update({ state, parameters: SCENARIO_DEFAULTS.railway });
      root.updateMatrixWorld(true);
      const trains = entities(root, 'rail_train');
      assert.equal(trains.length, 2);
      for (const group of trains)
        assertFits(
          group,
          trainFootprint(state.trains.find((item) => item.id === group.userData.transportId)),
        );
    }
  });
});

test('crossing vehicles are rendered from state and a fault flag cannot teleport a decorative car into a train', () => {
  const node = { type: 'railway', params: {}, enabled: true };
  const state = initialScenarioState(node);
  state.trains = [];
  state.roadCars = [
    { id: 'road-a', direction: 1, position: -35, stopped: false, crashed: false },
    { id: 'road-b', direction: -1, position: 25, stopped: false, crashed: false },
  ];
  withScene(node.type, (root, model) => {
    model.update({ state, parameters: SCENARIO_DEFAULTS.railway });
    root.updateMatrixWorld(true);
    const cars = entities(root, 'rail_car');
    assert.equal(cars.length, 2);
    const poses = cars.map((group) => [...group.position, ...group.quaternion]);
    for (const group of cars)
      assertFits(
        group,
        carFootprint(
          state.roadCars.find((item) => item.id === group.userData.transportId),
          'railway',
        ),
      );
    model.update({
      state: { ...state, fault: true, faults: ['open_barrier'] },
      parameters: SCENARIO_DEFAULTS.railway,
    });
    root.updateMatrixWorld(true);
    assert.deepEqual(
      entities(root, 'rail_car').map((group) => [...group.position, ...group.quaternion]),
      poses,
    );
    model.update({ state: { ...state, roadCars: [] }, parameters: SCENARIO_DEFAULTS.railway });
    assert.equal(entities(root, 'rail_car').length, 0);
  });
});
