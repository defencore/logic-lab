import {
  withScene,
  entities,
  assertFits,
  byRole,
  worldBounds,
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
