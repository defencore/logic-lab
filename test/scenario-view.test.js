import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  railwayPoint,
  SCENARIO_VIEW_TYPES,
  createScenarioView,
  createScenarioModel,
} from '../src/scenario-view.js';

test('railway approaches converge onto opposite ends of the shared section', () => {
  assert.deepEqual(railwayPoint('a', 0), { x: 0, z: 0 });
  assert.deepEqual(railwayPoint('b', 35), { x: 0, z: 0 });
  assert.equal(railwayPoint('a', 35).z, railwayPoint('b', 0).z);
  assert.ok(railwayPoint('a', -55).x < 0);
  assert.ok(railwayPoint('b', -55).x > 0);
  assert.ok(railwayPoint('a', 10).z < railwayPoint('a', 11).z);
  assert.ok(railwayPoint('b', 10).z > railwayPoint('b', 11).z);
});

test('every actual scene constructor builds and updates normal and failed Three.js geometry', () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        return {
          width: 0,
          height: 0,
          getContext() {
            return { clearRect() {}, fillText() {} };
          },
        };
      },
    },
  });
  try {
    const snapshots = {
      traffic_light: { lamps: { red: 1, yellow: 0, green: 0 } },
      traffic_junction: {
        lights: { ns_green: 1, ns_yellow: 0, ew_green: 0, ew_yellow: 0 },
        cars: [
          { id: 'a', axis: 'ns', position: -20 },
          { id: 'b', axis: 'ew', position: -25 },
        ],
        crash: false,
      },
      railway: {
        signals: { a: 1, b: 0 },
        points: 0,
        barrier: 1,
        trains: [
          { id: 'a', track: 'a', position: -48 },
          { id: 'b', track: 'b', position: -85 },
        ],
        faults: [],
      },
      animal_feeder: {
        hopper: 300,
        bowl: 30,
        spilled: 0,
        dispensing: true,
        animal: { phase: 0.25, eating: true, hungry: true },
      },
      water_tank: { level: 35, spilled: 0, overflow: false, pumping: true, draining: false },
    };
    for (const type of SCENARIO_VIEW_TYPES) {
      const root = new THREE.Group(),
        resources = new Set();
      const keep = (resource) => {
        resources.add(resource);
        return resource;
      };
      const geometries = new Map(),
        paints = new Map();
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
      const context = {
        root,
        keep,
        geometry,
        material,
        box: (w, h, d) => geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
        cylinder: (top, bottom, h, segments = 28) =>
          geometry(
            `cylinder:${top}:${bottom}:${h}:${segments}`,
            () => new THREE.CylinderGeometry(top, bottom, h, segments),
          ),
        sphere: (r) => geometry(`sphere:${r}`, () => new THREE.SphereGeometry(r, 24, 16)),
        mesh(parent, shape, paint, x = 0, y = 0, z = 0) {
          const object = new THREE.Mesh(shape, paint);
          object.position.set(x, y, z);
          parent.add(object);
          return object;
        },
      };
      const model = createScenarioModel(type, context);
      const normal = { ...snapshots[type], time: 1 };
      model.update({ state: normal, parameters: {} });
      const transforms = () => {
        const result = [];
        root.traverse((object) =>
          result.push([object.id, ...object.position, ...object.quaternion, ...object.scale]),
        );
        return result;
      };
      const frozen = transforms();
      model.update({ state: normal, parameters: {}, time: 100 });
      assert.deepEqual(transforms(), frozen, `${type}: global time cannot move a frozen scenario`);
      const failure = {
        ...normal,
        time: 3,
        crash: true,
        alarm: true,
        overflow: true,
        spilled: 100,
        level: 100,
        draining: true,
        faults: ['open_barrier'],
        trains: normal.trains?.map((train) => ({ ...train, crashed: true, derailed: true })),
        cars: normal.cars?.map((car) => ({ ...car, crashed: true })),
      };
      model.update({ state: failure, parameters: {} });
      let meshes = 0;
      root.traverse((object) => {
        for (const value of [
          ...object.position,
          ...object.scale,
          object.rotation.x,
          object.rotation.y,
          object.rotation.z,
        ])
          assert.ok(Number.isFinite(value), `${type}: finite transform`);
        if (object.isMesh) {
          meshes++;
          assert.ok(
            object.geometry.getAttribute('position').array.every(Number.isFinite),
            `${type}: finite vertices`,
          );
        }
      });
      assert.ok(meshes > 10, `${type}: populated scene`);
      model.update({
        state: { ...failure, cars: [], trains: [], hopper: 0, bowl: 0, level: 0 },
        parameters: {},
      });
      for (const resource of resources) resource.dispose();
    }
  } finally {
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});

test('all five scenario kinds are explicit and invalid scenes fail before graphics allocation', () => {
  assert.deepEqual(SCENARIO_VIEW_TYPES, [
    'traffic_light',
    'traffic_junction',
    'railway',
    'animal_feeder',
    'water_tank',
  ]);
  assert.throws(() => createScenarioView(null, { type: 'unknown' }), /Unsupported 3D scenario/);
  assert.throws(() => createScenarioView(null, { type: 'water_tank' }), /container element/);
});
