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
