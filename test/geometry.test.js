import test from 'node:test';
import assert from 'node:assert/strict';
import { portPoint, route, snap, wirePath } from '../src/geometry.js';

test('orthogonal routes preserve pins and explicit bends in either direction', () => {
  for (const target of [
    { x: 400, y: 140 },
    { x: -100, y: -40 },
  ]) {
    const start = { x: 160, y: 58 };
    const bend = { x: 260, y: 200 };
    const path = route(start, target, [bend]);
    const points = [...path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
    }));
    assert.deepEqual(points[0], start);
    assert.deepEqual(points.at(-1), target);
    assert.ok(points.some((p) => p.x === bend.x && p.y === bend.y));
    points
      .slice(1)
      .forEach((point, index) =>
        assert.ok(point.x === points[index].x || point.y === points[index].y),
      );
  }
});

test('component movement changes wire endpoints without losing routing', () => {
  const a = { id: 'a', type: 'switch', x: 0, y: 0, params: {} };
  const b = { id: 'b', type: 'led', x: 400, y: 0, params: {} };
  const project = { nodes: [a, b], wireStyle: 'bezier' };
  const wire = { from: { node: 'a', port: 'out' }, to: { node: 'b', port: 'in' } };
  assert.equal(portPoint(a, 'out', 'out').x, 160);
  assert.match(wirePath(wire, project), /^M160,58C/);
  a.x = 40;
  assert.match(wirePath(wire, project), /^M200,58C/);
  project.nodes.pop();
  assert.equal(wirePath(wire, project), '');
  assert.equal(snap(39), 40);
});
