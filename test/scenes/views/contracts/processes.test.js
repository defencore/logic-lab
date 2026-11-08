import { withScene, byRole, worldBounds } from './fixtures/transport-render-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';

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
