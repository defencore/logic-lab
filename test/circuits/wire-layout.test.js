import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshWireRoutes, wirePath, wireVertices } from '../../src/circuits/geometry/index.js';

const node = (id, type, x, y) => ({ id, type, x, y, params: {} });
const wire = (id, from, to) => ({
  id,
  from: { node: from, port: 'out' },
  to: { node: to, port: 'in' },
});

test('moving a component replans automatic geometry without changing the saved wire', () => {
  const source = node('source', 'switch', 0, -200);
  const obstacle = node('obstacle', 'switch', 310, 0);
  const target = node('target', 'led', 800, 0);
  const automatic = wire('automatic', 'source', 'target');
  const project = {
    nodes: [source, obstacle, target],
    wires: [automatic],
    wireStyle: 'orthogonal',
  };
  refreshWireRoutes(project);
  const original = wirePath(automatic, project);

  source.y = 0;
  assert.equal(wirePath(automatic, project), 'M160,58 L800,58');
  refreshWireRoutes(project);
  const planned = wireVertices(automatic, project);
  assert.deepEqual(
    [planned[0], planned.at(-1)],
    [
      { x: 160, y: 58 },
      { x: 800, y: 58 },
    ],
  );
  assert.ok(planned.length > 2);
  for (let i = 1; i < planned.length; i++) {
    const a = planned[i - 1];
    const b = planned[i];
    const overlapsBody =
      Math.min(a.x, b.x) < 470 &&
      Math.max(a.x, b.x) > 310 &&
      Math.min(a.y, b.y) < 100 &&
      Math.max(a.y, b.y) > 0;
    assert.equal(overlapsBody, false);
  }
  const path = wirePath(automatic, project);
  assert.equal(path, planned.map(({ x, y }, i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '));
  assert.equal(automatic.points, undefined);

  const reloaded = JSON.parse(JSON.stringify(project));
  refreshWireRoutes(reloaded);
  assert.equal(wirePath(reloaded.wires[0], reloaded), path);

  project.autoRouting = false;
  assert.equal(wirePath(automatic, project), 'M160,58 L800,58');
  refreshWireRoutes(project);
  assert.deepEqual(wireVertices(automatic, project), [
    { x: 160, y: 58 },
    { x: 800, y: 58 },
  ]);
  project.autoRouting = true;
  refreshWireRoutes(project);
  assert.equal(wirePath(automatic, project), path);

  source.y = -200;
  refreshWireRoutes(project);
  assert.equal(wirePath(automatic, project), original);
});

test('routing plans respect manual waypoints, curved wires and background groups', () => {
  const source = node('source', 'switch', 0, 0);
  const target = node('target', 'led', 800, 0);
  const group = node('group', 'group', 280, 0);
  const connection = wire('wire', 'source', 'target');
  const project = { nodes: [source, target, group], wires: [connection] };
  refreshWireRoutes(project);
  assert.equal(wirePath(connection, project), 'M160,58 L800,58');

  project.nodes.push(node('obstacle', 'switch', 310, 0));
  connection.points = [
    { x: 250, y: 58 },
    { x: 570, y: 58 },
  ];
  refreshWireRoutes(project);
  assert.equal(wirePath(connection, project), 'M160,58 L250,58 L570,58 L800,58');
  project.autoRouting = false;
  refreshWireRoutes(project);
  assert.equal(wirePath(connection, project), 'M160,58 L250,58 L570,58 L800,58');

  connection.points = [];
  project.wireStyle = 'bezier';
  refreshWireRoutes(project);
  assert.match(wirePath(connection, project), /^M160,58C/);
});

test('an eight-bit bundle keeps separate ordered approaches at the side and bottom contacts', () => {
  const source = node('byte', 'bus_input', 430, 320);
  const target = node('lcd', 'lcd1602', 0, 0);
  const connections = Array.from({ length: 8 }, (_, bit) => ({
    id: `d${bit}`,
    from: { node: source.id, port: `out${bit}` },
    to: { node: target.id, port: `d${bit}` },
  }));
  const project = { nodes: [source, target], wires: connections };
  const ordered = (values) =>
    values.every((value, index) => !index || value > values[index - 1]) ||
    values.every((value, index) => !index || value < values[index - 1]);

  for (const y of [320, 160]) {
    source.y = y;
    refreshWireRoutes(project);
    const routes = connections.map((connection) => wireVertices(connection, project));
    assert.ok(ordered(routes.map((route) => route[1].x)));
    assert.ok(ordered(routes.map((route) => route.at(-2).y)));
    const segments = routes.flatMap((route, bit) =>
      route.slice(1).map((b, index) => ({ bit, a: route[index], b })),
    );
    for (const [index, { bit, a, b }] of segments.entries()) {
      const axis = a.x === b.x ? 'y' : 'x';
      const cross = axis === 'x' ? 'y' : 'x';
      for (const other of segments.slice(index + 1)) {
        if (other.bit === bit || a[cross] !== other.a[cross] || a[cross] !== other.b[cross])
          continue;
        const start = Math.max(Math.min(a[axis], b[axis]), Math.min(other.a[axis], other.b[axis]));
        const end = Math.min(Math.max(a[axis], b[axis]), Math.max(other.a[axis], other.b[axis]));
        assert.ok(start >= end, `bits ${bit} and ${other.bit} overlap`);
      }
    }
    assert.ok(connections.every((connection) => !connection.points));
  }
});

test('a costly bundle does not prevent routing an inexpensive distant wire', () => {
  const nodes = [
    node('byte', 'bus_input', 430, 320),
    node('lcd', 'lcd1602', 0, 0),
    node('manual-source', 'bus_input', 1200, 0),
    node('manual-target', 'register', 2000, 0),
    node('source', 'switch', 4000, 0),
    node('obstacle', 'switch', 4310, 0),
    node('target', 'led', 4800, 0),
  ];
  const bundle = Array.from({ length: 8 }, (_, bit) => ({
    id: `bit${bit}`,
    from: { node: 'byte', port: `out${bit}` },
    to: { node: 'lcd', port: `d${bit}` },
  }));
  const manual = Array.from({ length: 32 }, (_, i) => ({
    id: `manual${i}`,
    from: { node: 'manual-source', port: `out${i % 8}` },
    to: { node: 'manual-target', port: `d${Math.floor(i / 8)}` },
    points: Array.from({ length: 100 }, (_, j) => ({
      x: 100 + j * 5,
      y: 190 + (i % 12) * 2 + (j % 2) * 30,
    })),
  }));
  const automatic = wire('automatic', 'source', 'target');
  const project = { nodes, wires: [...bundle, ...manual, automatic] };

  assert.equal(wireVertices(automatic, project).length, 2);
  refreshWireRoutes(project);
  assert.ok(wireVertices(automatic, project).length > 2);
});
