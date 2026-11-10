import test from 'node:test';
import assert from 'node:assert/strict';
import { moveWireSegmentTo, route, wireSegmentSpan } from '../../src/circuits/geometry/index.js';

const point = (x, y) => ({ x, y });

test('aligning a segment removes both jogs and redundant points at the exact coordinate', () => {
  const vertices = [
    point(160, 0.1),
    point(190, 0.1),
    point(230, 0.1),
    point(230, 52),
    point(320, 52),
    point(320, 0.1),
    point(355, 0.1),
    point(400, 0.1),
  ];
  const moved = moveWireSegmentTo(vertices, 3, 0.1);
  assert.deepEqual(moved, []);
  assert.equal(route(vertices[0], vertices.at(-1), moved), 'M160,0.1 L400,0.1');
});

test('a merged or previously saved straight span moves as a unit after alignment', () => {
  const source = point(160, 58);
  const target = point(400, 20);
  const untouched = [point(276, 20), point(335, 20)];
  const before = [
    source,
    point(190, 58),
    point(205, 58),
    point(205, 66),
    point(260, 66),
    point(276, 66),
    ...untouched,
    target,
  ];
  const aligned = moveWireSegmentTo(before, 4, 58);
  assert.deepEqual(aligned, [point(276, 58), ...untouched]);
  const expected = [point(184, 58), point(184, 78), point(276, 78), ...untouched];
  assert.deepEqual(moveWireSegmentTo([source, ...aligned, target], 0, 78), expected);

  const olderRoute = [source, point(205, 58), point(260, 58), ...aligned, target];
  for (const index of [0, 1, 2]) {
    assert.deepEqual(wireSegmentSpan(olderRoute, index), { start: 0, end: 3 });
    assert.deepEqual(moveWireSegmentTo(olderRoute, index, 78), expected);
  }
});

test('shortening neighboring arms does not reverse through obsolete inline points', () => {
  const vertices = [
    point(160, 58),
    point(230, 58),
    point(230, 72),
    point(230, 95),
    point(230, 110),
    point(280, 110),
    point(280, 92),
    point(280, 60),
    point(280, 50),
    point(340, 50),
    point(400, 50),
  ];
  assert.deepEqual(moveWireSegmentTo(vertices, 4, 80), [
    point(230, 58),
    point(230, 80),
    point(280, 80),
    point(280, 50),
    point(340, 50),
  ]);
});

test('straightening a short connection preserves its manual route through a save', () => {
  const vertices = [
    point(160, 58),
    point(170, 58),
    point(170, 52),
    point(180, 52),
    point(180, 58),
    point(190, 58),
  ];
  const moved = moveWireSegmentTo(vertices, 2, 58);
  assert.deepEqual(moved, [point(170, 58)]);
  const saved = JSON.parse(JSON.stringify(moved));
  assert.equal(route(vertices[0], vertices.at(-1), saved), 'M160,58 L170,58 L190,58');
});

test('aligning a segment preserves a reversal on the same line', () => {
  const vertices = [
    point(0, 0),
    point(40, 0),
    point(40, 8),
    point(20, 8),
    point(20, 20),
    point(100, 20),
  ];
  const moved = moveWireSegmentTo(vertices, 2, 0);
  assert.deepEqual(moved.slice(0, 2), [point(40, 0), point(20, 0)]);
  assert.deepEqual(wireSegmentSpan([vertices[0], ...moved, vertices.at(-1)], 0), {
    start: 0,
    end: 1,
  });
});
