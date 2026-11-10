import test from 'node:test';
import assert from 'node:assert/strict';
import { translateWirePoints } from '../../src/circuits/geometry/index.js';
import { orthogonalVertices } from '../../src/circuits/geometry/routing.js';

const point = (x, y) => ({ x, y });
const verticesOf = (...pairs) => pairs.map(([x, y]) => point(x, y));
const stationary = point(0, 0);
const sidePins = { start: point(1, 0), end: point(-1, 0) };
const bottomPin = { start: point(1, 0), end: point(0, 1) };
const stepped = verticesOf([160, 58], [260, 58], [260, 200], [376, 200], [376, 258], [400, 258]);

function movedRoute(vertices, startDelta, endDelta = stationary, directions = sidePins) {
  const points = translateWirePoints(
    vertices,
    vertices.slice(1, -1),
    startDelta,
    endDelta,
    directions,
  );
  const shift = (pin, delta) => point(pin.x + delta.x, pin.y + delta.y);
  return orthogonalVertices(
    shift(vertices[0], startDelta),
    shift(vertices.at(-1), endDelta),
    JSON.parse(JSON.stringify(points)),
    null,
    directions,
  );
}

test('moving a contact adjusts its terminal leg and keeps the distant bends', () => {
  assert.deepEqual(movedRoute(stepped, point(0, 40)), [
    point(160, 98),
    point(260, 98),
    ...stepped.slice(2),
  ]);
  assert.deepEqual(movedRoute(stepped, point(140, 40)), [
    point(300, 98),
    point(324, 98),
    point(324, 200),
    ...stepped.slice(3),
  ]);
  assert.deepEqual(movedRoute(stepped, point(0, 142)), [point(160, 200), ...stepped.slice(3)]);
});

test('moving both contacts together translates their exact saved route', () => {
  const delta = point(-40, 20);
  const points = stepped.slice(1, -1);
  assert.deepEqual(
    translateWirePoints(stepped, points, delta, delta, sidePins),
    points.map(({ x, y }) => point(x - 40, y + 20)),
  );
  assert.equal(translateWirePoints(stepped, points, stationary, stationary, sidePins), points);
  assert.equal(
    translateWirePoints(stepped, points, point(1_000_000, 0), point(1_000_000, 0), sidePins),
    points,
  );
  assert.deepEqual(
    movedRoute(stepped, point(0, 40), point(40, -20)),
    verticesOf([160, 98], [260, 98], [260, 200], [376, 200], [376, 238], [440, 238]),
  );
});

test('a short route still approaches a moved bottom contact from below', () => {
  const original = verticesOf([160, 200], [260, 200], [260, 180]);
  assert.deepEqual(
    movedRoute(original, stationary, point(40, -40), bottomPin),
    verticesOf([160, 200], [300, 200], [300, 140]),
  );
  assert.deepEqual(
    movedRoute(original, point(0, -40), stationary, bottomPin),
    verticesOf([160, 160], [184, 160], [184, 200], [260, 200], [260, 180]),
  );
});

test('moving a pin past old inline markers never routes back to them', () => {
  const straight = verticesOf([160, 58], [240, 58], [320, 58], [400, 58]);
  assert.deepEqual(
    movedRoute(straight, point(100, 0)),
    verticesOf([260, 58], [320, 58], [400, 58]),
  );
  assert.deepEqual(
    movedRoute(straight, point(200, 0)),
    verticesOf([360, 58], [380, 58], [400, 58]),
  );
  assert.deepEqual(
    movedRoute(straight, point(100, 40)),
    verticesOf([260, 98], [340, 98], [340, 58], [400, 58]),
  );
});
