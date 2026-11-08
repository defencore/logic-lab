import {
  withScene,
  entities,
  collisionMeshes,
  assertExactSolids,
  meshSurfaceDistance,
} from './fixtures/transport-render-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  initialScenarioState,
  advanceScenario,
  SCENARIO_DEFAULTS,
} from '../../../../src/scenes/models/scenarios/index.js';
import {
  JUNCTION,
  carFootprint,
  trainFootprint,
  carCollisionBody,
  trainCollisionBody,
  overlaps,
} from '../../../../src/scenes/transport/geometry.js';
import {
  collisionPartVertices,
  bodyContactDetail,
} from '../../../../src/scenes/transport/shapes.js';

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
