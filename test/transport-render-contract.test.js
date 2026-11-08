import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScenarioModel } from '../src/scenario-view.js';
import { initialScenarioState, advanceScenario, SCENARIO_DEFAULTS } from '../src/scenarios.js';
import {
  JUNCTION,
  carFootprint,
  trainFootprint,
  carCollisionBody,
  trainCollisionBody,
  overlaps,
} from '../src/transport-geometry.js';
import { collisionPartVertices, bodyContactDetail } from '../src/transport-shapes.js';

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

function collisionMeshes(group) {
  const result = new Map();
  group.traverse((object) => {
    if (object.isMesh && object.userData.collisionPart)
      result.set(object.userData.collisionPart, object);
  });
  return result;
}
function assertExactSolids(group, body) {
  const meshes = collisionMeshes(group);
  assert.equal(meshes.size, body.parts.length);
  const directions = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
    [1, -1, 0],
    [1, 0, -1],
    [0, 1, -1],
    [1, 1, 1],
    [1, -1, 1],
    [-1, 1, 1],
    [2, 3, -5],
    [7, -2, 3],
  ];
  for (const part of body.parts) {
    const object = meshes.get(part.id);
    assert.ok(object, `Visible primitive ${part.id} exists.`);
    const attribute = object.geometry.getAttribute('position');
    const vertices = Array.from({ length: attribute.count }, (_, index) =>
      new THREE.Vector3()
        .fromBufferAttribute(attribute, index)
        .applyMatrix4(object.matrixWorld)
        .toArray(),
    );
    const collisionVertices = collisionPartVertices(part);
    for (const direction of directions) {
      const projection = (points) =>
        points.map((point) => point.reduce((sum, value, axis) => sum + value * direction[axis], 0));
      const actual = projection(vertices),
        collision = projection(collisionVertices);
      assert.ok(
        Math.abs(Math.min(...actual) - Math.min(...collision)) < 2e-6,
        `${part.id}: minimum visible support matches physics`,
      );
      assert.ok(
        Math.abs(Math.max(...actual) - Math.max(...collision)) < 2e-6,
        `${part.id}: maximum visible support matches physics`,
      );
    }
  }
}
function meshSurfaceDistance(object, point) {
  const positions = object.geometry.getAttribute('position'),
    indices = object.geometry.index;
  const target = new THREE.Vector3().fromArray(point),
    closest = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  let minimum = Infinity;
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    for (const [corner, key] of [
      [0, 'a'],
      [1, 'b'],
      [2, 'c'],
    ])
      triangle[key]
        .fromBufferAttribute(positions, indices ? indices.getX(i + corner) : i + corner)
        .applyMatrix4(object.matrixWorld);
    triangle.closestPointToPoint(target, closest);
    minimum = Math.min(minimum, target.distanceTo(closest));
  }
  return minimum;
}

test('actual rendered primitive supports exactly match compound collision solids, including their heights and curved noses', () => {
  for (const type of ['traffic_junction', 'railway'])
    withScene(type, (root, model) => {
      const state = initialScenarioState({ type, params: {} });
      if (type === 'traffic_junction') state.cars[0].position = -1.4;
      else {
        state.trains[0].position = -20;
        state.trains[1].position = 55;
        state.trains[1].exitRoute = 0;
      }
      model.update({ state, parameters: SCENARIO_DEFAULTS[type] });
      root.updateMatrixWorld(true);
      for (const kind of type === 'railway' ? ['rail_train', 'rail_car'] : ['junction_car'])
        for (const group of entities(root, kind)) {
          const vehicle = (
            kind === 'rail_train' ? state.trains : type === 'railway' ? state.roadCars : state.cars
          ).find((item) => item.id === group.userData.transportId);
          const body =
            kind === 'rail_train'
              ? trainCollisionBody(vehicle)
              : carCollisionBody(vehicle, type === 'railway' ? 'railway' : 'junction');
          assertExactSolids(group, body);
        }
    });
});

test('overlapping rail reservation boxes leave a measurable gap between every actual visible primitive', () => {
  const state = initialScenarioState({ type: 'railway', params: {} });
  state.trains = [{ ...state.trains[0], position: 33 }];
  state.roadCars = [{ id: 'clear', direction: 1, position: -3 }];
  assert.ok(overlaps(trainFootprint(state.trains[0]), carFootprint(state.roadCars[0], 'railway')));
  withScene('railway', (root, model) => {
    model.update({ state, parameters: SCENARIO_DEFAULTS.railway });
    root.updateMatrixWorld(true);
    const trains = [...collisionMeshes(entities(root, 'rail_train')[0]).values()];
    const cars = [...collisionMeshes(entities(root, 'rail_car')[0]).values()];
    let gap = Infinity;
    for (const one of trains)
      for (const two of cars) {
        const a = new THREE.Box3().setFromObject(one),
          b = new THREE.Box3().setFromObject(two);
        const separation = ['x', 'y', 'z'].map((axis) =>
          Math.max(0, a.min[axis] - b.max[axis], b.min[axis] - a.max[axis]),
        );
        gap = Math.min(gap, Math.hypot(...separation));
      }
    assert.ok(
      gap > 0.01,
      'Actual triangles are separated by more than a centimetre despite the old boxes touching.',
    );
  });
});

test('the first train/car contact witnesses lie on actual rendered triangle surfaces', () => {
  const node = { type: 'railway', params: {}, enabled: true };
  let state = initialScenarioState(node);
  for (let i = 0; i < 8000 && !state.collisionPoint; i++)
    state = advanceScenario(node, state, { signal_a: 1, barrier: 0 }, 0.001);
  assert.ok(state.collisionPair);
  const train = state.trains.find((item) => item.id === state.collisionPair[0]);
  const car = state.roadCars.find((item) => item.id === state.collisionPair[1]);
  const contact = bodyContactDetail(trainCollisionBody(train), carCollisionBody(car, 'railway'));
  assert.ok(contact && contact.distance < 2e-6);
  withScene('railway', (root, model) => {
    model.update({ state, parameters: SCENARIO_DEFAULTS.railway });
    root.updateMatrixWorld(true);
    const trainMesh = collisionMeshes(
      entities(root, 'rail_train').find((group) => group.userData.transportId === train.id),
    ).get(contact.partA);
    const carMesh = collisionMeshes(
      entities(root, 'rail_car').find((group) => group.userData.transportId === car.id),
    ).get(contact.partB);
    assert.ok(meshSurfaceDistance(trainMesh, contact.pointA) < 2e-6);
    assert.ok(meshSurfaceDistance(carMesh, contact.pointB) < 2e-6);
    assert.ok(
      new THREE.Vector3()
        .fromArray(contact.pointA)
        .distanceTo(new THREE.Vector3().fromArray(contact.pointB)) < 2e-6,
    );
  });
});

function byRole(root, role) {
  const found = [];
  root.traverse((object) => {
    if (object.userData.role === role) found.push(object);
  });
  return found;
}
function worldBounds(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}

test('rail beds support exposed sleepers and flush crossing decks support both trains and cars', () => {
  withScene('railway', (root, model) => {
    const state = initialScenarioState({ type: 'railway', params: {} });
    model.update({ state, parameters: {} });
    root.updateMatrixWorld(true);
    const railTop = Math.max(...byRole(root, 'rail').map((object) => worldBounds(object).max.y));
    const bedTop = Math.max(
      ...byRole(root, 'rail-ballast').map((object) => worldBounds(object).max.y),
    );
    const sleeperBottom = Math.min(
      ...byRole(root, 'rail-sleeper').map((object) => worldBounds(object).min.y),
    );
    assert.ok(bedTop <= sleeperBottom + 0.002, 'Ballast cannot bury the sleepers');
    assert.ok(railTop > bedTop + 0.1, 'Steel rail heads remain clearly above the bed');
    assert.ok(Math.abs(worldBounds(byRole(root, 'rail-crossing-deck')[0]).max.y - railTop) < 1e-6);
    for (const group of [...entities(root, 'rail_train'), ...entities(root, 'rail_car')])
      group.traverse((object) => {
        if (object.userData.collisionPart?.startsWith('wheel:'))
          assert.ok(
            Math.abs(worldBounds(object).min.y - railTop) < 1e-6,
            'Actual tyres and rail heads meet',
          );
        if (object.userData.collisionPart === 'plow')
          assert.ok(
            worldBounds(object).min.y > railTop + 0.01,
            'Cowcatcher clears the crossing surface',
          );
      });
  });
});

test('locomotive coupling joins the wagon and car proportions remain longer than their width', () => {
  withScene('railway', (root, model) => {
    model.update({ state: initialScenarioState({ type: 'railway', params: {} }) });
    for (const group of entities(root, 'rail_train')) {
      const parts = new Map();
      group.traverse((object) => {
        if (object.userData.collisionPart) parts.set(object.userData.collisionPart, object);
      });
      const coupling = worldBounds(parts.get('coupler'));
      assert.ok(coupling.intersectsBox(worldBounds(parts.get('chassis'))));
      assert.ok(coupling.intersectsBox(worldBounds(parts.get('wagon'))));
    }
    const size = worldBounds(entities(root, 'rail_car')[0]).getSize(new THREE.Vector3());
    assert.ok(size.x / size.z > 1.85, 'Road-car length should be close to twice its width');
  });
});

test('feeder paws and bowl rest on the pad, with a connected motor and contained food at all fill levels', () => {
  withScene('animal_feeder', (root, model) => {
    const base = {
      hopper: 300,
      bowl: 10,
      spilled: 0,
      time: 0,
      dispensing: true,
      animal: { phase: 0, eating: false },
    };
    model.update({ state: base, parameters: { bowlCapacity: 100 } });
    for (const paw of byRole(root, 'feeder-paw'))
      assert.ok(Math.abs(worldBounds(paw).min.y - 0.17) < 1e-6);
    assert.ok(Math.abs(worldBounds(byRole(root, 'feeder-bowl')[0]).min.y - 0.17) < 1e-6);
    const coupling = worldBounds(byRole(root, 'feeder-coupling')[0]);
    assert.ok(coupling.intersectsBox(worldBounds(byRole(root, 'feeder-motor')[0])));
    assert.ok(coupling.intersectsBox(worldBounds(byRole(root, 'feeder-shaft')[0])));
    for (const bowl of [1, 10, 50, 100]) {
      model.update({ state: { ...base, bowl }, parameters: { bowlCapacity: 100 } });
      const food = worldBounds(byRole(root, 'feeder-bowl-food')[0]);
      assert.ok(Math.abs(food.min.y - 0.24) < 1e-6, 'Food rests on the inner bowl floor');
      const localTop = food.max.y - 0.15;
      const innerRadius = 0.66 + ((localTop - 0.09) * (0.74 - 0.66)) / (0.34 - 0.09);
      assert.ok(
        (food.max.x - food.min.x) / 2 < innerRadius,
        'Fill does not pass through the measured inner wall',
      );
    }
  });
});

test('tank ruler clears its curved wall and the drain stream reaches a visible outlet destination', () => {
  withScene('water_tank', (root, model) => {
    model.update({ state: { level: 50, time: 0, pumping: true, draining: true } });
    const ruler = worldBounds(byRole(root, 'tank-level-ruler')[0]);
    assert.ok(ruler.min.z > 1.65 + 0.025, 'Flat ruler is outside the curved tank wall');
    const flow = worldBounds(byRole(root, 'tank-drain-stream')[0]);
    assert.ok(Math.abs(flow.max.y - 0.36) < 1e-6, 'Flow meets the downward pipe outlet');
    assert.ok(
      flow.min.y <= 0.24 && flow.min.y >= 0.205,
      'Flow reaches the drain grate at ground level',
    );
  });
});

test('road surfaces support complete cars at spawn and exit while long queues enter from outside the scene', () => {
  withScene('railway', (root, model) => {
    const state = initialScenarioState({ type: 'railway', params: {} });
    for (const position of [-70, 70]) {
      for (const car of state.roadCars) car.position = position;
      model.update({ state });
      const deck = worldBounds(byRole(root, 'rail-crossing-deck')[0]);
      for (const car of entities(root, 'rail_car')) {
        const body = worldBounds(car);
        assert.ok(body.min.x >= deck.min.x && body.max.x <= deck.max.x);
      }
    }
  });
  withScene('traffic_junction', (root, model) => {
    const state = initialScenarioState({ type: 'traffic_junction', params: { initialCars: 8 } });
    model.update({ state });
    const roads = new THREE.Box3();
    byRole(root, 'junction-asphalt').forEach((object) => roads.union(worldBounds(object)));
    const cars = entities(root, 'junction_car');
    assert.ok(
      cars.some((car) => !car.visible),
      'Far queued vehicles wait outside the visible road',
    );
    for (const car of cars.filter((car) => car.visible)) {
      const body = worldBounds(car);
      assert.ok(
        body.min.x >= roads.min.x &&
          body.max.x <= roads.max.x &&
          body.min.z >= roads.min.z &&
          body.max.z <= roads.max.z,
      );
    }
  });
});
