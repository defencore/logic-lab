import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseWireRoute } from '../../src/circuits/geometry/auto-routing.js';
import { DEFAULT_DIRECTIONS } from '../../src/circuits/geometry/points.js';

const point = (x, y) => ({ x, y });
const segment = (a, b) => ({ a, b });

test('prefers a body-free corridor with fewer crossings over the shorter corridor', () => {
  const baseline = [point(0, 30), point(300, 30)];
  const obstacles = [
    { left: -100, top: -20, right: 0, bottom: 100 },
    { left: 80, top: 0, right: 220, bottom: 100 },
    { left: 300, top: -20, right: 400, bottom: 100 },
  ];
  const occupied = [segment(point(150, -80), point(150, 20))];
  assert.deepEqual(chooseWireRoute(baseline, DEFAULT_DIRECTIONS, obstacles, occupied), [
    point(0, 30),
    point(24, 30),
    point(24, 100),
    point(276, 100),
    point(276, 30),
    point(300, 30),
  ]);
});

test('detours around the end of another wire when a direct route would cross it', () => {
  const baseline = [point(0, 30), point(300, 30)];
  const occupied = [segment(point(150, 0), point(150, 80))];
  assert.deepEqual(chooseWireRoute(baseline, DEFAULT_DIRECTIONS, [], occupied), [
    point(0, 30),
    point(24, 30),
    point(24, -8),
    point(276, -8),
    point(276, 30),
    point(300, 30),
  ]);
});

test('retains clear baseline lanes and allows wires to share a pin lead', () => {
  const baseline = [point(0, 30), point(70, 30), point(70, 60), point(300, 60)];
  const occupied = [segment(point(0, 30), point(24, 30)), segment(point(0, 30), point(0, 90))];
  assert.equal(chooseWireRoute(baseline, DEFAULT_DIRECTIONS, [], occupied), baseline);
});

test('keeps the outward approach of bottom contacts when detouring around a body', () => {
  const baseline = [point(20, 0), point(20, 45), point(260, 45)];
  const directions = { start: { x: 0, y: 1 }, end: { x: -1, y: 0 } };
  const obstacles = [{ left: 80, top: 20, right: 180, bottom: 90 }];
  const route = chooseWireRoute(baseline, directions, obstacles, []);
  assert.deepEqual(route, [
    point(20, 0),
    point(20, 90),
    point(236, 90),
    point(236, 45),
    point(260, 45),
  ]);
});

test('skips shortcuts that cross the same wire again', () => {
  const baseline = [
    point(190, 160),
    point(190, 184),
    point(186, 184),
    point(186, 150),
    point(210, 150),
  ];
  const directions = { start: { x: 0, y: 1 }, end: { x: -1, y: 0 } };
  const obstacles = [{ left: 90, top: 180, right: 190, bottom: 280 }];
  const occupied = [segment(point(110, 210), point(110, 140))];

  assert.deepEqual(chooseWireRoute(baseline, directions, obstacles, occupied), [
    point(190, 160),
    point(190, 184),
    point(196, 184),
    point(196, 159),
    point(186, 159),
    point(186, 150),
    point(210, 150),
  ]);
});

test('only asks for search budget on a conflicting route', () => {
  const baseline = [point(0, 30), point(300, 30)];
  const occupied = [segment(point(150, 0), point(150, 80))];
  let requests = 0;
  const deny = () => {
    requests++;
    return false;
  };
  assert.equal(chooseWireRoute(baseline, DEFAULT_DIRECTIONS, [], [], deny), baseline);
  assert.equal(requests, 0);
  assert.equal(chooseWireRoute(baseline, DEFAULT_DIRECTIONS, [], occupied, deny), baseline);
  assert.equal(requests, 1);
});

test('keeps the original route when avoiding a crossing would require a distant detour', () => {
  const baseline = [point(0, 30), point(300, 30)];
  const occupied = [segment(point(150, -1000), point(150, 1000))];
  assert.equal(chooseWireRoute(baseline, DEFAULT_DIRECTIONS, [], occupied), baseline);
});
