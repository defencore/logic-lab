import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  SCENARIO_VIEW_TYPES,
  createScenarioView,
  createScenarioModel,
} from '../src/scenario-view.js';
import { railwayPoint } from '../src/transport-geometry.js';

test('railway approaches converge onto opposite ends of the shared section', () => {
  assert.ok(Math.abs(railwayPoint('a', 0).x) < 1e-12);
  assert.equal(railwayPoint('a', 0).z, 0);
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
            return {
              clearRect() {},
              fillText() {},
              fillRect() {},
              beginPath() {},
              arc() {},
              stroke() {},
            };
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
        roadCars: [
          { id: 'road-a', direction: 1, position: -20 },
          { id: 'road-b', direction: -1, position: -25 },
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
        roadCars: normal.roadCars?.map((car) => ({ ...car, crashed: true })),
        collisionPoint: { x: 0.13, z: 1.1 },
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
      if (type === 'traffic_junction' || type === 'railway') {
        const aftermath = root.children.find(
          (object) => object.userData.role === 'collision-aftermath',
        );
        assert.equal(aftermath.position.x, failure.collisionPoint.x);
        assert.equal(aftermath.position.z, failure.collisionPoint.z);
      }
      if (type === 'railway') {
        const vehicles = root.children.filter(
          (object) => object.userData.transportKind === 'rail_car',
        );
        assert.equal(
          vehicles.length,
          normal.roadCars.length,
          'Only actual model road cars are drawn',
        );
        const signs = [];
        root.traverse((object) => {
          if (object.userData.role === 'speed-sign-face') signs.push(object);
        });
        assert.equal(signs.length, 2);
        assert.equal(
          signs[0].material.map,
          signs[1].material.map,
          'Ring and number are on one shared face texture',
        );
        for (const face of signs) {
          assert.equal(
            face.isSprite,
            undefined,
            'Sign text does not billboard independently of its disk',
          );
          assert.ok(
            face.geometry
              .getAttribute('position')
              .array.every((value, index) => index % 3 !== 2 || Math.abs(value) < 1e-12),
            'Sign face vertices share one plane',
          );
          const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(face.quaternion);
          assert.ok(
            normal.z * face.position.z > 0,
            'Each side faces outward without mirrored backside text',
          );
        }
        model.update({ state: { ...failure, barrier: 0.5 }, parameters: {} });
        const arms = [];
        root.traverse((object) => {
          if (object.userData.role === 'rail-gate-arm') arms.push(object);
        });
        assert.equal(arms.length, 2);
        for (const arm of arms)
          assert.ok(
            Math.abs(arm.rotation.x + (arm.userData.direction * Math.PI) / 4) < 1e-12,
            'Half-closed gate renders a 45-degree angle',
          );
        model.update({ state: { ...failure, barrier: 1 }, parameters: {} });
        root.updateMatrixWorld(true);
        for (const arm of arms) {
          const bounds = new THREE.Box3().setFromObject(arm),
            size = bounds.getSize(new THREE.Vector3());
          assert.ok(size.z > 1.6 && size.x < 0.2, 'Closed arm spans the road along Z');
          assert.ok(
            bounds.max.x < -1 || bounds.min.x > 1,
            'Closed arm never spans the railway centerline',
          );
        }
        const rails = root.children.filter(
          (object) => object.userData.role === 'rail' && object.userData.track === 'a',
        );
        const left = rails
          .find((object) => object.userData.offset < 0)
          .geometry.parameters.path.getPoint(0.8);
        const right = rails
          .find((object) => object.userData.offset > 0)
          .geometry.parameters.path.getPoint(0.8);
        assert.ok(
          Math.abs(left.distanceTo(right) - 0.38) < 1e-10,
          'Parallel curved rails keep a constant normal gauge',
        );
      }
      model.update({
        state: { ...failure, cars: [], trains: [], roadCars: [], hopper: 0, bowl: 0, level: 0 },
        parameters: {},
      });
      for (const resource of resources) resource.dispose();
    }
  } finally {
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});

test('all eight scenario kinds are explicit and invalid scenes fail before graphics allocation', () => {
  assert.deepEqual(SCENARIO_VIEW_TYPES, [
    'aquarium',
    'greenhouse',
    'smart_home',
    'traffic_light',
    'traffic_junction',
    'railway',
    'animal_feeder',
    'water_tank',
  ]);
  assert.throws(() => createScenarioView(null, { type: 'unknown' }), /Unsupported 3D scenario/);
  assert.throws(() => createScenarioView(null, { type: 'water_tank' }), /container element/);
});
