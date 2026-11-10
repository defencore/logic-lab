import test from 'node:test';
import assert from 'node:assert/strict';
import { createGestures } from '../../src/application/gestures.js';
import { withDocument } from './fixture.js';

const point = (x, y) => ({ x, y });

test('component dragging reroutes incident wires from the original geometry and saves one undo step', (t) => {
  const elements = withDocument(t);
  elements.set('#viewport', { focus() {}, classList: { remove() {} } });
  const paths = new Map();
  document.querySelectorAll = (selector) => [
    { setAttribute: (_, value) => paths.set(selector, value) },
  ];
  const nodes = [
    { id: 'source', type: 'switch', ...point(0, 0) },
    { id: 'selected', type: 'led', ...point(600, 100) },
    { id: 'fixed', type: 'led', ...point(600, 300) },
    { id: 'auto', type: 'led', ...point(600, 500) },
    { id: 'remote-source', type: 'switch', ...point(0, 700) },
    { id: 'remote-target', type: 'led', ...point(600, 700) },
  ];
  const connect = (id, from, to) => ({
    id,
    from: { node: from, port: 'out' },
    to: { node: to, port: 'in' },
  });
  const internal = {
    ...connect('internal', 'source', 'selected'),
    points: [point(250, 58), point(250, 158)],
  };
  const external = {
    ...connect('external', 'source', 'fixed'),
    points: [point(240, 58), point(240, 238), point(460, 238), point(460, 358)],
  };
  const automatic = connect('automatic', 'source', 'auto');
  const remote = connect('remote', 'remote-source', 'remote-target');
  const project = { nodes, wires: [internal, external, automatic, remote], wireStyle: 'bezier' };
  const before = JSON.stringify(project);
  const state = {
    project,
    selected: new Set(['source', 'selected']),
    undoStack: [],
    redoStack: ['future'],
  };
  for (const id of state.selected) elements.set(`[data-node="${id}"].circuit-node`, { style: {} });
  let saves = 0;
  const actions = {
    worldPoint: ({ clientX, clientY }) => point(clientX, clientY),
    snapshot: () => JSON.stringify(project),
    updateHistoryControls() {},
    persist: () => saves++,
  };
  const wiring = { clear() {}, pointerMove: () => false, pointerUp: () => false };
  const gestures = createGestures({ state, services: { wiring }, actions });
  const pointer = (clientX, clientY) => ({ clientX, clientY, pointerId: 1 });
  const down = () =>
    gestures.nodePointerDown({
      ...pointer(0, 0),
      button: 0,
      target: { closest: () => null },
      currentTarget: { dataset: { node: 'source' } },
      stopPropagation() {},
    });

  down();
  gestures.onPointerMove(pointer(20, 20));
  assert.deepEqual(internal.points, [point(270, 78), point(270, 178)]);
  assert.deepEqual(external.points, [
    point(240, 78),
    point(240, 238),
    point(460, 238),
    point(460, 358),
  ]);
  gestures.onPointerMove(pointer(60, -20));
  assert.deepEqual(internal.points, [point(310, 38), point(310, 138)]);
  assert.deepEqual(external.points, [
    point(240, 38),
    point(240, 238),
    point(460, 238),
    point(460, 358),
  ]);
  assert.match(paths.get('[data-wire="automatic"] path'), /^M220,38C/);
  assert.equal(automatic.points, undefined);
  assert.equal(paths.has('[data-wire="remote"] path'), false);

  gestures.onPointerMove(pointer(0, 0));
  gestures.onPointerUp(pointer(0, 0));
  assert.equal(JSON.stringify(project), before);
  assert.deepEqual(state.undoStack, []);
  assert.deepEqual(state.redoStack, ['future']);
  assert.equal(saves, 0);

  down();
  gestures.onPointerMove(pointer(20, 20));
  gestures.onPointerUp(pointer(20, 20));
  assert.deepEqual(state.undoStack, [before]);
  assert.deepEqual(state.redoStack, []);
  assert.equal(saves, 1);
});
