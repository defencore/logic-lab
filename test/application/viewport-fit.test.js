import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewport } from '../../src/application/viewport.js';
import { dimensions, refreshWireRoutes, wireVertices } from '../../src/circuits/geometry/index.js';
import { fitViewport } from '../../src/circuits/viewport.js';
import { withDocument } from './fixture.js';

test('fitting the circuit includes automatic detours outside the component bounds', (t) => {
  const elements = withDocument(t);
  const source = { id: 'byte', type: 'bus_input', x: 430, y: 160, params: {} };
  const target = { id: 'lcd', type: 'lcd1602', x: 0, y: 0, params: {} };
  const project = {
    nodes: [source, target],
    wires: Array.from({ length: 8 }, (_, bit) => ({
      id: `wire-${bit}`,
      from: { node: source.id, port: `out${bit}` },
      to: { node: target.id, port: `d${bit}` },
    })),
  };
  refreshWireRoutes(project);
  const points = project.wires.flatMap((wire) => wireVertices(wire, project));
  const width = Math.max(...points.map((point) => point.x));
  const height = Math.max(...points.map((point) => point.y));
  assert.ok(width > source.x + dimensions(source).w);
  assert.ok(height > source.y + dimensions(source).h);

  const size = { width: 800, height: 600 };
  elements.set('#viewport', { clientWidth: size.width, clientHeight: size.height });
  const state = { project, view: { x: 0, y: 0, zoom: 1 } };
  createViewport({ state, services: {}, actions: { applyView() {}, persist() {} } }).fit();
  assert.deepEqual(state.view, fitViewport({ x: 0, y: 0, width, height }, size));
});
