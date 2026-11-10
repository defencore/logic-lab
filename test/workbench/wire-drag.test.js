import test from 'node:test';
import assert from 'node:assert/strict';
import { createGestures } from '../../src/workbench/wiring/gestures.js';
import { wireVertices } from '../../src/circuits/geometry/index.js';

const point = (x, y) => ({ x, y });

function fixture(t, zoom = 1) {
  const previousDocument = globalThis.document;
  const viewport = { focus() {}, setPointerCapture() {}, hasPointerCapture: () => false };
  globalThis.document = { querySelector: () => viewport };
  t.after(() => {
    if (previousDocument) globalThis.document = previousDocument;
    else delete globalThis.document;
  });
  const makeWire = (id, points) => ({
    id,
    from: { node: 'switch', port: 'out' },
    to: { node: id, port: 'in' },
    points,
  });
  const reference = makeWire('a', [
    point(300, 158),
    point(300, 240),
    point(500, 240),
    point(500, 158),
  ]);
  const wire = makeWire('b', [point(320, 158), point(320, 248), point(530, 248), point(530, 338)]);
  const project = {
    wireStyle: 'orthogonal',
    wires: [reference, wire],
    nodes: [
      { id: 'switch', type: 'switch', x: 100, y: 100 },
      { id: 'a', type: 'led', x: 600, y: 100 },
      { id: 'b', type: 'led', x: 600, y: 280 },
    ],
  };
  const state = {};
  const history = [];
  const commands = { renderEditor() {}, renderContext() {}, refresh() {}, updateGeometry() {} };
  const gestures = createGestures({
    state,
    project: () => project,
    wire: () => wire,
    position: (event) => point(event.clientX / zoom, event.clientY / zoom),
    options: {
      cancelConnection() {},
      snapshot: () => structuredClone(project),
      commit: (before) => history.push(before),
      getView: () => ({ zoom }),
    },
    commands,
  });
  Object.assign(commands, gestures);
  const pointer = (x, y, altKey = false) => ({
    clientX: x * zoom,
    clientY: y * zoom,
    pointerId: 1,
    altKey,
    preventDefault() {},
    stopPropagation() {},
  });
  const vertices = (points = wire.points) => wireVertices({ ...wire, points }, project);
  return { gestures, state, pointer, wire, vertices, history };
}

test('wire segment drag previews and commits exact off-grid alignment', (t) => {
  const { gestures, state, pointer, wire, vertices, history } = fixture(t);
  const before = vertices();
  const originalPoints = wire.points;
  gestures.startDrag(pointer(425, 248), 'segment', 2);
  gestures.pointerMove(pointer(425, 242));
  assert.equal(state.drag.guide.coordinate, 240);
  assert.equal(vertices(state.drag.previewPoints)[2].y, 240);
  assert.deepEqual(wire.points, originalPoints);

  gestures.pointerUp(pointer(425, 242));
  const after = vertices();
  assert.equal(after[2].y, 240);
  assert.deepEqual([after[0], after.at(-1)], [before[0], before.at(-1)]);
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].wires[1].points, originalPoints);
});

test('vertical alignment uses screen distance and Alt allows free movement', (t) => {
  const { gestures, state, pointer, vertices, history } = fixture(t, 2);
  gestures.startDrag(pointer(320, 202), 'segment', 1);
  gestures.pointerMove(pointer(320, 235));
  assert.equal(state.drag.previewPoints, null);

  gestures.pointerMove(pointer(305, 202));
  assert.equal(vertices(state.drag.previewPoints)[1].x, 305);
  gestures.pointerMove(pointer(303, 202));
  assert.equal(vertices(state.drag.previewPoints)[1].x, 300);
  gestures.pointerMove(pointer(303, 202, true));
  assert.equal(state.drag.guide, null);
  assert.equal(vertices(state.drag.previewPoints)[1].x, 303);

  gestures.cancelGesture();
  assert.equal(vertices()[1].x, 320);
  assert.equal(history.length, 0);
});

test('dragging a subsection of a straight run moves the entire run without snapping to itself', (t) => {
  const { gestures, state, pointer, wire, vertices, history } = fixture(t);
  wire.points.splice(2, 0, point(450, 248), point(480, 248));

  gestures.startDrag(pointer(500, 248), 'segment', 4);
  gestures.pointerMove(pointer(500, 254));
  assert.equal(state.drag.guide, null);
  gestures.pointerUp(pointer(500, 254));

  assert.deepEqual(vertices(), [
    point(260, 158),
    point(320, 158),
    point(320, 254),
    point(530, 254),
    point(530, 338),
    point(600, 338),
  ]);
  assert.equal(history.length, 1);
});

test('a bend can be dragged by less than one grid step on both axes', (t) => {
  const { gestures, pointer, vertices, history } = fixture(t);
  gestures.startDrag(pointer(320, 248), 'bend', 2);
  gestures.pointerMove(pointer(326, 254));
  gestures.pointerUp(pointer(326, 254));

  assert.deepEqual(vertices().slice(1, 4), [point(326, 158), point(326, 254), point(530, 254)]);
  assert.equal(history.length, 1);
});

test('the Alt state on release can detach a segment from a snap guide', (t) => {
  const { gestures, state, pointer, vertices, history } = fixture(t);
  gestures.startDrag(pointer(425, 248), 'segment', 2);
  gestures.pointerMove(pointer(425, 242));
  assert.equal(state.drag.guide.coordinate, 240);
  gestures.pointerUp(pointer(425, 242, true));

  assert.equal(vertices()[2].y, 242);
  assert.equal(history.length, 1);
});
