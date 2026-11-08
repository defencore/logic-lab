import test from 'node:test';
import assert from 'node:assert/strict';
import { findNodePlacement, revealNodePlacement } from '../../src/circuits/placement.js';
import { dimensions } from '../../src/circuits/geometry/index.js';

const node = (type, x = 0, y = 0, params = {}) => ({ type, x, y, params });
const view = { x: 0, y: 0, zoom: 1 };
const viewport = { width: 800, height: 600 };
function separated(a, b, padding = 24) {
  const first = dimensions(a),
    second = dimensions(b);
  return (
    a.x + first.w + padding <= b.x ||
    b.x + second.w + padding <= a.x ||
    a.y + first.h + padding <= b.y ||
    b.y + second.h + padding <= a.y
  );
}
function visible(item, camera = view, size = viewport) {
  const { w, h } = dimensions(item);
  return (
    item.x * camera.zoom + camera.x >= 0 &&
    item.y * camera.zoom + camera.y >= 0 &&
    (item.x + w) * camera.zoom + camera.x <= size.width &&
    (item.y + h) * camera.zoom + camera.y <= size.height
  );
}

test('automatic placement separates the complete switch and LED rectangles with room for contacts', () => {
  const source = node('switch');
  Object.assign(source, findNodePlacement(source, [], { view, viewport }));
  const lamp = node('led');
  Object.assign(lamp, findNodePlacement(lamp, [source], { view, viewport }));
  assert.equal(separated(source, lamp), true);
  assert.equal(visible(source), true);
  assert.equal(visible(lamp), true);
});

test('large matrices use their actual width and height and take available visible space', () => {
  const source = node('switch', 320, 260);
  const matrix = node('matrix');
  Object.assign(matrix, findNodePlacement(matrix, [source], { view, viewport }));
  assert.equal(separated(matrix, source), true);
  assert.equal(visible(matrix), true);
  assert.equal(matrix.x % 20, 0);
  assert.equal(matrix.y % 20, 0);
});

test('the selected visible grid position is nearest to the canvas center even around mixed shapes', () => {
  const existing = [node('matrix', 260, 180), node('switch', 40, 380), node('note', 540, 20)];
  const candidate = node('led');
  const position = findNodePlacement(candidate, existing, { view, viewport });
  const distance = ({ x, y }) => (x - 320) ** 2 + (y - 260) ** 2;
  const available = [];
  for (let x = 0; x <= 640; x += 20)
    for (let y = 0; y <= 500; y += 20) {
      const placed = { ...candidate, x, y };
      if (existing.every((other) => separated(placed, other))) available.push(placed);
    }
  assert.ok(available.length);
  assert.equal(distance(position), Math.min(...available.map(distance)));
});

test('background groups allow components inside them and can wrap existing components', () => {
  const group = node('group', 0, 0, { width: 1000, height: 1000 });
  assert.deepEqual(findNodePlacement(node('switch'), [group], { view, viewport }), {
    x: 320,
    y: 260,
  });
  const wrapped = findNodePlacement(
    node('group', 0, 0, { width: 420, height: 260 }),
    [node('switch', 320, 260)],
    { view, viewport },
  );
  assert.deepEqual(wrapped, { x: 200, y: 180 });
});

test('a packed canvas with 1000 nodes terminates, keeps clearance and reveals the new node', () => {
  const existing = Array.from({ length: 1000 }, (_, index) =>
    node('switch', -4000 + (index % 40) * 200, -1750 + Math.floor(index / 40) * 140),
  );
  const lamp = node('led');
  Object.assign(lamp, findNodePlacement(lamp, existing, { view, viewport }));
  assert.equal(
    existing.every((other) => separated(lamp, other)),
    true,
  );
  assert.equal(visible(lamp, revealNodePlacement(view, viewport, lamp)), true);
});

test('placement respects circuit coordinate bounds and a zoomed, panned canvas', () => {
  const camera = { x: -999900, y: 999900, zoom: 1 };
  const item = node('matrix');
  Object.assign(item, findNodePlacement(item, [], { view: camera, viewport }));
  const size = dimensions(item);
  assert.ok(item.x >= -1000000 && item.y >= -1000000);
  assert.ok(item.x + size.w <= 1000000 && item.y + size.h <= 1000000);
  const zoomed = { x: 140, y: -240, zoom: 2 };
  const lamp = node('led');
  Object.assign(lamp, findNodePlacement(lamp, [], { view: zoomed, viewport }));
  assert.equal(visible(lamp, zoomed), true);
  assert.deepEqual(revealNodePlacement(zoomed, viewport, lamp), zoomed);
});
