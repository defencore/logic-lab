import test from 'node:test';
import assert from 'node:assert/strict';
import { travelRatio, shaftRadians } from '../src/motion-view.js';

test('mechanical travel maps physical min, midpoint and max onto the visible rail', () => {
  assert.equal(travelRatio(-20, -20, 180), 0);
  assert.equal(travelRatio(80, -20, 180), 0.5);
  assert.equal(travelRatio(180, -20, 180), 1);
  assert.equal(travelRatio(-100, -20, 180), 0);
  assert.equal(travelRatio(500, -20, 180), 1);
  assert.equal(travelRatio('X', -20, 180), 0);
  assert.equal(travelRatio(1, 10, 10), 0);
});

test('shaft transforms preserve direction while wrapping complete motor revolutions', () => {
  assert.ok(Math.abs(shaftRadians(90) - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(shaftRadians(-90) + Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(shaftRadians(370) - shaftRadians(10)) < 1e-12);
  assert.equal(shaftRadians(360 * 10000), 0);
  assert.equal(shaftRadians('Z'), 0);
});
