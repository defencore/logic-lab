import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoutingIndex } from '../../src/circuits/geometry/routing-index.js';

const bounds = (left, top, right, bottom) => ({ left, top, right, bottom });

test('routing index checks exact inclusive bounds across tiles without duplicates', () => {
  const index = createRoutingIndex();
  const vertical = { id: 'vertical' },
    horizontal = { id: 'horizontal' },
    nearby = { id: 'nearby' };
  index.add(vertical, bounds(-256, -512, -256, 128));
  index.add(horizontal, bounds(-512, 0, 0, 0));
  index.add(nearby, bounds(-255, 1, -254, 2));

  assert.deepEqual(index.query(bounds(-256, 0, -256, 0)), [vertical, horizontal]);
  assert.deepEqual(index.query(bounds(-512, -512, 0, 128)), [vertical, horizontal, nearby]);
  assert.deepEqual(index.query(bounds(-255, 2, -254, 2)), [nearby]);
  assert.deepEqual(index.query(bounds(-253, 2, -253, 2)), []);
});

test('routing index finds and removes overflow records in stable insertion order', () => {
  const index = createRoutingIndex();
  const near = { id: 'near' },
    wide = { id: 'wide' },
    later = { id: 'later' };
  index.add(near, bounds(0, 0, 10, 10));
  index.add(wide, bounds(-1_000_000, 10, 1_000_000, 10));
  index.add(later, bounds(10, 10, 20, 20));

  assert.deepEqual(index.query(bounds(10, 10, 10, 10)), [near, wide, later]);
  assert.deepEqual(index.query(bounds(-1e20, -1e20, 1e20, 1e20)), [near, wide, later]);
  assert.deepEqual(index.query(bounds(0, 11, 0, 11)), []);
  index.remove(wide);
  index.add(near, bounds(100, 100, 110, 110));
  assert.deepEqual(index.query(bounds(10, 10, 10, 10)), [later]);
  assert.deepEqual(index.query(bounds(0, 0, 110, 110)), [later, near]);
});
