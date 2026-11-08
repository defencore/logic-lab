import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { componentPins } from '../../src/components/pins.js';
import {
  dimensions,
  portPoint,
  portDirection,
  route,
  wirePath,
  wireVertices,
  moveWireSegment,
  insertWirePoint,
} from '../../src/circuits/geometry/index.js';

const matrix = () => ({ id: 'matrix', type: 'matrix', x: 500, y: 100, params: {} });
const source = () => ({ id: 'source', type: 'bus_input', x: 0, y: 20, params: { value: 85 } });
const makeWire = (bit = 0) => ({
  id: `wire${bit}`,
  from: { node: 'source', port: `out${bit}` },
  to: { node: 'matrix', port: `cols${bit}` },
  width: 1,
});
const assertOrthogonal = (vertices) => {
  for (let index = 1; index < vertices.length; index++) {
    const previous = vertices[index - 1],
      current = vertices[index];
    assert.notEqual(previous.x === current.x, previous.y === current.y);
  }
};
const assertBottomEntry = (vertices, target) => {
  assert.deepEqual(vertices.at(-1), target);
  assert.equal(vertices.at(-2).x, target.x);
  assert.ok(vertices.at(-2).y > target.y, 'Columns are approached from below the matrix.');
};

test('matrix rows run vertically and columns horizontally in a compact footprint', () => {
  const node = matrix();
  assert.deepEqual(dimensions(node), { w: 260, h: 270 });
  const definition = getDefinition('matrix');
  assert.equal(definition.inputs.length, 16);
  assert.ok(definition.inputs.every((pin) => pin.width === 1));
  for (let bit = 0; bit < 8; bit++) {
    assert.deepEqual(portPoint(node, `rows${bit}`, 'in'), { x: 500, y: 158 + bit * 22 });
    assert.deepEqual(portPoint(node, `cols${bit}`, 'in'), { x: 570 + bit * 22, y: 370 });
    assert.deepEqual(portDirection(node, `rows${bit}`, 'in'), { x: -1, y: 0 });
    assert.deepEqual(portDirection(node, `cols${bit}`, 'in'), { x: 0, y: 1 });
  }
});

test('matrix markup retains every physical contact, axis label and accessible full port name', () => {
  const markup = componentPins(matrix(), {
    label: 'LED matrix',
    inputLabel: 'Inputs',
    outputLabel: 'Outputs',
  });
  assert.equal((markup.match(/<button /g) || []).length, 16);
  for (let bit = 0; bit < 8; bit++) {
    assert.match(markup, new RegExp(`data-pin="rows${bit}"[^>]*style="top:${58 + bit * 22}px"`));
    assert.match(
      markup,
      new RegExp(`data-pin="cols${bit}"[^>]*style="top:270px;left:${70 + bit * 22}px"`),
    );
    assert.ok(markup.includes(`<span>R${bit}</span>`));
    assert.ok(markup.includes(`<span>C${bit}</span>`));
    assert.ok(markup.includes(`aria-label="LED matrix · Inputs · COLS${bit}"`));
  }
  assert.equal((markup.match(/pin-edge-bottom/g) || []).length, 8);
  assert.equal((markup.match(/pin-edge-left/g) || []).length, 8);
  assert.ok(!markup.includes('bus-pin'));
});

test('every matrix column receives a separate orthogonal route approaching its bottom contact', () => {
  const node = matrix(),
    input = source();
  const project = { nodes: [input, node], wireStyle: 'orthogonal' };
  const lanes = new Set();
  for (let bit = 0; bit < 8; bit++) {
    const wire = makeWire(bit);
    const vertices = wireVertices(wire, project);
    assert.deepEqual(vertices[0], portPoint(input, `out${bit}`, 'out'));
    assert.equal(vertices[1].y, vertices[0].y);
    assert.ok(vertices[1].x > vertices[0].x);
    assertBottomEntry(vertices, portPoint(node, `cols${bit}`, 'in'));
    assertOrthogonal(vertices);
    assert.equal(
      wirePath(wire, project),
      vertices.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '),
    );
    lanes.add(vertices.at(-2).y);
  }
  assert.equal(lanes.size, 8);
});

test('matrix movement and reconnecting from a row to a column preserve the actual terminal direction', () => {
  const node = matrix(),
    input = source();
  const project = { nodes: [input, node], wireStyle: 'orthogonal' };
  const wire = makeWire(3);
  wire.to.port = 'rows3';
  let vertices = wireVertices(wire, project);
  assert.equal(vertices.at(-2).y, vertices.at(-1).y);
  assert.ok(vertices.at(-2).x < vertices.at(-1).x);
  wire.to.port = 'cols3';
  node.x = -400;
  node.y = -240;
  vertices = wireVertices(wire, project);
  assertBottomEntry(vertices, portPoint(node, 'cols3', 'in'));
  assertOrthogonal(vertices);
  node.x = 400;
  node.y = 700;
  assertBottomEntry(wireVertices(wire, project), portPoint(node, 'cols3', 'in'));
});

test('Bezier controls and pending previews approach the same bottom matrix terminal', () => {
  const node = matrix(),
    input = source();
  const project = { nodes: [input, node], wireStyle: 'bezier' };
  const wire = makeWire(2);
  const path = wirePath(wire, project);
  const values = [...path.matchAll(/-?[\d.]+/g)].map((match) => Number(match[0]));
  const target = portPoint(node, 'cols2', 'in');
  assert.equal(values[4], target.x, 'The final Bezier control is directly below the terminal.');
  assert.ok(values[5] > target.y);
  assert.deepEqual(values.slice(-2), [target.x, target.y]);
  assert.equal(
    route(portPoint(input, 'out2', 'out'), target, [], 'bezier', null, {
      start: portDirection(input, 'out2', 'out'),
      end: portDirection(node, 'cols2', 'in'),
    }),
    path,
  );
});

test('manual wire markers and edits survive matrix movement without changing the contact edge', () => {
  const node = matrix(),
    input = source();
  const project = { nodes: [input, node], wireStyle: 'orthogonal' };
  const wire = makeWire(0);
  let vertices = wireVertices(wire, project);
  wire.points = moveWireSegment(vertices, vertices.length - 2, 30);
  assert.notEqual(wire.points, null);
  vertices = wireVertices(wire, project);
  assertOrthogonal(vertices);
  assertBottomEntry(vertices, portPoint(node, 'cols0', 'in'));
  const inserted = insertWirePoint(vertices, { x: 350, y: 430 });
  assert.notEqual(inserted, null);
  wire.points = inserted;
  const saved = JSON.parse(JSON.stringify(wire));
  node.x += 140;
  node.y -= 80;
  const moved = wireVertices(saved, project);
  assertOrthogonal(moved);
  assertBottomEntry(moved, portPoint(node, 'cols0', 'in'));
  for (const marker of saved.points)
    assert.ok(moved.some((point) => point.x === marker.x && point.y === marker.y));
});
