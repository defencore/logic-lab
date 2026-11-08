import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS } from '../src/catalog.js';
import { componentPins } from '../src/component-pins.js';
import {
  dimensions,
  portPoint,
  pinPlacement,
  portDirection,
  route,
  snap,
  wirePath,
  wireVertices,
  nearestWireSegment,
  moveWireVertex,
  moveWireSegment,
  insertWirePoint,
  removeWireVertex,
} from '../src/geometry.js';

test('each individual contact stays inside its component and aligns with its wire endpoint', () => {
  for (const definition of COMPONENTS) {
    const node = { id: 'device', type: definition.type, x: 100, y: 200, params: {} };
    const { w, h } = dimensions(node);
    const markup = componentPins(node, {
      label: definition.label,
      inputLabel: 'Input',
      outputLabel: 'Output',
    });
    for (const [side, pins] of [
      ['in', definition.inputs],
      ['out', definition.outputs],
    ]) {
      const contacts = new Set();
      for (const pin of pins) {
        const endpoint = portPoint(node, pin.id, side);
        const placement = pinPlacement(node, pin.id, side);
        const top = endpoint.y - node.y;
        if (placement.edge === 'bottom') {
          assert.equal(top, h, `${definition.type}.${pin.id} lies on the bottom edge`);
          assert.ok(endpoint.x > node.x && endpoint.x < node.x + w);
        } else {
          assert.ok(top >= 58 && top + 9 < h, `${definition.type}.${pin.id} fits vertically`);
          assert.equal(endpoint.x, node.x + (side === 'out' ? w : 0));
        }
        const coordinate = `${endpoint.x}:${endpoint.y}`;
        assert.ok(!contacts.has(coordinate), `${definition.type}.${pin.id} has its own contact`);
        contacts.add(coordinate);
        const style = `top:${top}px${placement.edge === 'bottom' ? `;left:${placement.x}px` : ''}`;
        assert.ok(
          markup.includes(
            `data-pin="${pin.id}" data-side="${side}" data-node="device" style="${style}"`,
          ),
          `${definition.type}.${pin.id} renders at its connection point`,
        );
      }
    }
  }
});

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

const point = (x, y) => ({ x, y });
const parseVertices = (path) =>
  [...path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((match) =>
    point(Number(match[1]), Number(match[2])),
  );
test('individual byte wires use distinct automatic lanes without sharing a vertical trunk', () => {
  const source = { id: 'source', type: 'counter', x: 0, y: 0, params: {} };
  const target = { id: 'target', type: 'dac', x: 420, y: 120, params: {} };
  const project = { nodes: [source, target], wireStyle: 'orthogonal' };
  const lanes = [];
  for (let bit = 0; bit < 8; bit++) {
    const wire = {
      from: { node: source.id, port: `out${bit}` },
      to: { node: target.id, port: `in${bit}` },
      width: 1,
    };
    const vertices = wireVertices(wire, project);
    assert.deepEqual(vertices, parseVertices(wirePath(wire, project)));
    assert.deepEqual(vertices[0], portPoint(source, `out${bit}`, 'out'));
    assert.deepEqual(vertices.at(-1), portPoint(target, `in${bit}`, 'in'));
    lanes.push(vertices[1].x);
  }
  assert.equal(new Set(lanes).size, 8);
});

function assertOrthogonal(vertices) {
  for (let index = 1; index < vertices.length; index++) {
    const a = vertices[index - 1],
      b = vertices[index];
    assert.notEqual(
      a.x === b.x,
      a.y === b.y,
      'Every segment has exactly one axis and nonzero length.',
    );
  }
  if (vertices.length > 1) {
    assert.equal(vertices[1].y, vertices[0].y);
    assert.ok(vertices[1].x > vertices[0].x, 'An output wire leaves to the right.');
    assert.equal(vertices.at(-2).y, vertices.at(-1).y);
    assert.ok(vertices.at(-2).x < vertices.at(-1).x, 'An input wire approaches from the left.');
  }
}
function edited(vertices, points) {
  assert.notEqual(points, null);
  assert.ok(points.length <= 100);
  const result = parseVertices(route(vertices[0], vertices.at(-1), points));
  assert.deepEqual(result[0], vertices[0]);
  assert.deepEqual(result.at(-1), vertices.at(-1));
  assert.deepEqual(
    result.slice(1, -1),
    points,
    'Saved edit points render as the same path, without routing drift.',
  );
  assertOrthogonal(result);
  return result;
}

test('automatic routes have no duplicate vertices and preserve pin directions in forward and backward layouts', () => {
  for (const b of [
    point(400, 58),
    point(400, 220),
    point(-80, 58),
    point(-80, -100),
    point(180, 140),
  ]) {
    const vertices = parseVertices(route(point(160, 58), b));
    assertOrthogonal(vertices);
    assert.deepEqual(vertices.at(-1), b);
  }
});

test('moving either a full straight wire or a terminal segment keeps both contacts anchored', () => {
  const straight = [point(160, 58), point(400, 58)];
  const moved = edited(straight, moveWireSegment(straight, 0, 60));
  assert.ok(moved.some((p) => p.y === 118));
  const stepped = [
    point(160, 58),
    point(260, 58),
    point(260, 200),
    point(376, 200),
    point(376, 258),
    point(400, 258),
  ];
  for (const index of [0, 1, stepped.length - 2])
    edited(stepped, moveWireSegment(stepped, index, 40));
  assert.equal(moveWireSegment(stepped, 1, 0), null);
  assert.equal(moveWireSegment(stepped, -1, 20), null);
});

test('moving a marked section leaves the following inline section unchanged', () => {
  const vertices = [point(160, 58), point(220, 58), point(280, 58), point(400, 58)];
  const moved = edited(vertices, moveWireSegment(vertices, 0, 40));
  assert.ok(moved.some((p) => p.x < 220 && p.y === 98));
  assert.ok(moved.some((p) => p.x === 280 && p.y === 58));
  assert.ok(moved.filter((p) => p.x > 220).every((p) => p.y === 58));
});

test('a straight marker can be inserted, moved into a detour, and removed', () => {
  const straight = [point(160, 58), point(400, 58)];
  const inserted = edited(straight, insertWirePoint(straight, point(260, 58)));
  assert.deepEqual(inserted, [straight[0], point(260, 58), straight[1]]);
  const moved = edited(inserted, moveWireVertex(inserted, 1, point(260, 140)));
  assert.ok(moved.some((p) => p.x === 260 && p.y === 140));
  assert.deepEqual(edited(inserted, removeWireVertex(inserted, 1)), straight);
});

test('moving corners adjusts adjacent segments without moving either pin', () => {
  const vertices = [
    point(160, 58),
    point(260, 58),
    point(260, 200),
    point(376, 200),
    point(376, 258),
    point(400, 258),
  ];
  for (const [index, target] of [
    [1, point(300, 100)],
    [2, point(240, 160)],
    [4, point(360, 240)],
  ]) {
    const moved = edited(vertices, moveWireVertex(vertices, index, target));
    assert.ok(moved.some((p) => p.x === target.x && p.y === target.y));
  }
  assert.equal(moveWireVertex(vertices, 0, point(0, 0)), null);
  assert.equal(moveWireVertex(vertices, vertices.length - 1, point(0, 0)), null);
});

test('off-line insertion adds a local detour and corner removal removes that marker', () => {
  const straight = [point(160, 58), point(400, 58)];
  const inserted = edited(straight, insertWirePoint(straight, point(260, 120)));
  const index = inserted.findIndex((p) => p.x === 260 && p.y === 120);
  assert.ok(index > 0);
  const removed = edited(inserted, removeWireVertex(inserted, index));
  assert.ok(!removed.some((p) => p.x === 260 && p.y === 120));
  assert.equal(insertWirePoint(straight, point(160, 58)), null);
});

test('edited manual routes survive component movement and serialized reconstruction', () => {
  const a = { id: 'a', type: 'switch', x: 0, y: 0, params: {} };
  const b = { id: 'b', type: 'led', x: 400, y: 200, params: {} };
  const project = { nodes: [a, b], wireStyle: 'orthogonal' };
  const wire = { from: { node: 'a', port: 'out' }, to: { node: 'b', port: 'in' }, points: [] };
  const vertices = wireVertices(wire, project);
  wire.points = moveWireSegment(vertices, 1, 40);
  assert.notEqual(wire.points, null);
  const saved = JSON.parse(JSON.stringify(wire));
  assert.deepEqual(wireVertices(saved, project).slice(1, -1), wire.points);
  a.x = 280;
  a.y = 100;
  b.x = 180;
  b.y = -120;
  const moved = wireVertices(saved, project);
  assert.deepEqual(moved[0], portPoint(a, 'out', 'out'));
  assert.deepEqual(moved.at(-1), portPoint(b, 'in', 'in'));
  assertOrthogonal(moved);
  assert.ok(
    saved.points.every((marker) => moved.some((p) => p.x === marker.x && p.y === marker.y)),
  );
});

test('nearest segments use projection distance, and invalid edits cannot create malformed routes', () => {
  const vertices = [point(160, 58), point(260, 58), point(260, 200), point(400, 200)];
  assert.deepEqual(nearestWireSegment(vertices, point(275, 120)), {
    index: 1,
    point: point(260, 120),
    distance: 15,
  });
  assert.equal(nearestWireSegment([], point(0, 0)), null);
  assert.equal(insertWirePoint(vertices, point(NaN, 10)), null);
  assert.equal(moveWireVertex(vertices, 1, point(10, Infinity)), null);
  assert.equal(moveWireSegment(vertices, 1, NaN), null);
  assert.equal(removeWireVertex(vertices, 0), null);
  const dense = [
    point(0, 58),
    ...Array.from({ length: 100 }, (_, i) => point(20 + i, 58)),
    point(400, 58),
  ];
  assert.equal(insertWirePoint(dense, point(200, 100)), null);
});

test('3D scene widgets retain their width and every exposed byte bit gets a routed contact', () => {
  for (const type of [
    'railway',
    'aquarium',
    'greenhouse',
    'smart_home',
    'water_tank',
    'traffic_junction',
  ]) {
    const node = { id: 'scene', type, x: 500, y: 120, params: {} };
    const definition = COMPONENTS.find((component) => component.type === type);
    const size = dimensions(node);
    assert.equal(size.w, 284, type);
    assert.ok(size.h >= 190, type);
    assert.ok(
      [...definition.inputs, ...definition.outputs].every((pin) => pin.width === 1),
      type,
    );
  }
  const source = { id: 'data', type: 'bus_input', x: 0, y: 0, params: { value: 30 } };
  const railway = { id: 'rail', type: 'railway', x: 500, y: 120, params: {} };
  const project = { nodes: [source, railway], wireStyle: 'orthogonal' };
  const lanes = [];
  for (let bit = 0; bit < 8; bit++) {
    const wire = {
      from: { node: source.id, port: `out${bit}` },
      to: { node: railway.id, port: `throttle${bit}` },
      width: 1,
    };
    const vertices = wireVertices(wire, project);
    assert.deepEqual(vertices[0], portPoint(source, wire.from.port, 'out'));
    assert.deepEqual(vertices.at(-1), portPoint(railway, wire.to.port, 'in'));
    assert.deepEqual(parseVertices(wirePath(wire, project)), vertices);
    lanes.push(vertices[1].x);
  }
  assert.equal(
    new Set(lanes).size,
    8,
    'Scene speed commands keep independent automatic wire lanes',
  );
  const aquarium = { id: 'aqua', type: 'aquarium', x: 500, y: 120, params: {} };
  const markup = componentPins(aquarium, {
    label: 'Aquarium',
    inputLabel: 'Input',
    outputLabel: 'Output',
  });
  for (let bit = 0; bit < 8; bit++) assert.ok(markup.includes(`data-pin="alive${bit}"`));
  assert.ok(!markup.includes('data-pin="alive"'));
  assert.ok(!markup.includes('bus-pin'));
});
