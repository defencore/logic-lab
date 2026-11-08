import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectionCommands } from '../../src/application/selection-commands.js';
import { createCommands } from '../../src/application/commands.js';
import { createHistory } from '../../src/application/history.js';
import { createFragment, serializeFragment, parseFragment } from '../../src/circuits/fragments.js';
import { dimensions } from '../../src/circuits/geometry/index.js';
import { editingContext, withDocument } from './fixture.js';

const node = (id, x, y = 60, type = 'switch', params = { value: 0 }) => ({
  id,
  type,
  x,
  y,
  label: id,
  enabled: true,
  params,
});
const wire = (id, from, to) => ({
  id,
  from: { node: from, port: 'out' },
  to: { node: to, port: 'a' },
  width: 1,
  points: [{ x: 240, y: 180 }],
});
const sourceProject = () => ({
  version: 1,
  name: 'Source',
  wireStyle: 'bezier',
  nodes: [node('source', 80), node('gate', 360, 60, 'and', {}), node('outside', 80, 280)],
  wires: [
    wire('internal', 'source', 'gate'),
    {
      id: 'external',
      from: { node: 'outside', port: 'out' },
      to: { node: 'gate', port: 'b' },
      width: 1,
    },
  ],
});

function setup(t, project = sourceProject()) {
  const elements = withDocument(t);
  const context = editingContext();
  context.state.project = project;
  context.state.selected = new Set(['source', 'gate']);
  context.actions.updateHistoryControls = () => {};
  const history = createHistory(context);
  context.actions.snapshot = history.snapshot;
  context.actions.checkpoint = history.checkpoint;
  const focus = [];
  const viewport = document.querySelector('#viewport');
  viewport.focus = (options) => focus.push(options);
  return { context, commands: createSelectionCommands(context), history, elements, focus };
}

function bounds(nodes) {
  const left = Math.min(...nodes.map(({ x }) => x));
  const top = Math.min(...nodes.map(({ y }) => y));
  return {
    left,
    top,
    width: Math.max(...nodes.map((node) => node.x + dimensions(node).w)) - left,
    height: Math.max(...nodes.map((node) => node.y + dimensions(node).h)) - top,
  };
}

const selected = (state) => state.project.nodes.filter(({ id }) => state.selected.has(id));

test('copy is read-only in a locked preview and includes only selected components and their internal wires', (t) => {
  const { context, commands } = setup(t);
  let editChecks = 0;
  context.services.classroom = {
    allowEdit: () => {
      editChecks++;
      return false;
    },
  };
  context.state.selectedWire = 'external';
  context.state.pending = { node: 'source', port: 'out', side: 'out' };
  const before = structuredClone(context.state);
  const text = commands.copySelection();
  const fragment = parseFragment(text);
  assert.deepEqual(
    fragment.nodes.map(({ id }) => id),
    ['source', 'gate'],
  );
  assert.deepEqual(
    fragment.wires.map(({ id }) => id),
    ['internal'],
  );
  assert.deepEqual(context.state, before);
  assert.deepEqual(context.events, []);
  assert.equal(editChecks, 0);
  context.state.selected.clear();
  assert.equal(commands.copySelection(), null);
});

test('paste clones a whole circuit fragment, route points and selection with one undo checkpoint', (t) => {
  const { context, commands, history, focus } = setup(t);
  const { state } = context;
  const before = structuredClone(state.project);
  const text = commands.copySelection();
  state.selectedWire = 'external';
  state.pending = { node: 'source', port: 'out', side: 'out' };
  assert.equal(commands.pasteSelection(text), true);
  const copies = selected(state),
    copiedWire = state.project.wires.at(-1);
  assert.deepEqual(
    copies.map(({ x, y }) => [x, y]),
    [
      [120, 100],
      [400, 100],
    ],
  );
  assert.equal(state.project.nodes.length, 5);
  assert.equal(state.project.wires.length, 3);
  assert.equal(copiedWire.from.node, copies[0].id);
  assert.equal(copiedWire.to.node, copies[1].id);
  assert.deepEqual(copiedWire.points, [{ x: 280, y: 220 }]);
  assert.equal(state.project.wireStyle, 'bezier');
  assert.equal(state.selectedWire, null);
  assert.equal(state.pending, null);
  assert.equal(state.undoStack.length, 1);
  assert.equal(context.events.filter((event) => event === 'cancel').length, 1);
  assert.equal(
    context.events.filter((event) => Array.isArray(event) && event[0] === 'changed').length,
    1,
  );
  assert.deepEqual(focus, [{ preventScroll: true }]);
  copies[0].params.value = 1;
  assert.equal(state.project.nodes[0].params.value, 0);
  history.undo();
  assert.deepEqual(state.project, before);
  assert.equal(state.undoStack.length, 0);
  assert.equal(state.redoStack.length, 1);
});

test('repeated paste advances the selected group by40 world units while retaining exact viewport zoom and pan', (t) => {
  const { context, commands } = setup(t);
  context.state.view = { x: 70, y: 40, zoom: 0.58 };
  const view = { ...context.state.view };
  const text = commands.copySelection();
  for (const offset of [40, 80, 120]) {
    assert.equal(commands.pasteSelection(text), true);
    assert.deepEqual(
      selected(context.state).map(({ x, y }) => [x, y]),
      [
        [80 + offset, 60 + offset],
        [360 + offset, 60 + offset],
      ],
    );
    assert.deepEqual(context.state.view, view);
  }
  assert.equal(context.state.undoStack.length, 3);
});

test('a foreign or offscreen fragment is centered inside the visible canvas without changing zoom', (t) => {
  const { context, commands } = setup(t);
  context.state.view = { x: -500, y: -400, zoom: 0.58 };
  const view = { ...context.state.view };
  const foreign = sourceProject();
  foreign.nodes.forEach((node) => {
    node.x += 40_000;
    node.y += 30_000;
  });
  const text = serializeFragment(createFragment(foreign, new Set(['source', 'gate'])));
  assert.equal(commands.pasteSelection(text), true);
  const group = bounds(selected(context.state));
  const center = {
    x: (group.left + group.width / 2) * view.zoom + view.x,
    y: (group.top + group.height / 2) * view.zoom + view.y,
  };
  assert.ok(Math.abs(center.x - 400) <= 10 * view.zoom);
  assert.ok(Math.abs(center.y - 300) <= 10 * view.zoom);
  assert.ok(group.left * view.zoom + view.x >= 0);
  assert.ok((group.left + group.width) * view.zoom + view.x <= 800);
  assert.deepEqual(context.state.view, view);
  const first = selected(context.state).map(({ x, y }) => [x, y]);
  assert.equal(commands.pasteSelection(text), true);
  assert.deepEqual(
    selected(context.state).map(({ x, y }) => [x, y]),
    first.map(([x, y]) => [x + 40, y + 40]),
  );
});

test('compact inspector paste reveals the canvas before measuring its formerly hidden viewport', (t) => {
  const { context, commands } = setup(t);
  context.state.workspaceView = 'inspector';
  const viewport = document.querySelector('#viewport');
  viewport.getBoundingClientRect = () =>
    context.state.workspaceView === 'canvas'
      ? { width: 800, height: 600 }
      : { width: 0, height: 0 };
  context.actions.setWorkspaceView = (view) => {
    context.state.workspaceView = view;
  };
  const foreign = sourceProject();
  foreign.nodes.forEach((node) => {
    node.x += 40_000;
    node.y += 30_000;
  });
  assert.equal(
    commands.pasteSelection(serializeFragment(createFragment(foreign, ['source', 'gate']))),
    true,
  );
  const group = bounds(selected(context.state));
  assert.equal(context.state.workspaceView, 'canvas');
  assert.ok(Math.abs(group.left + group.width / 2 - 400) <= 10);
  assert.ok(Math.abs(group.top + group.height / 2 - 300) <= 10);
  assert.equal(context.state.undoStack.length, 1);
});

test('replacing the project discards the old copy anchor and duplicate uses the same validated cloning path', (t) => {
  const { context, commands } = setup(t);
  const text = commands.copySelection();
  context.state.project = { version: 1, name: 'Other', nodes: [], wires: [] };
  context.state.selected.clear();
  assert.equal(commands.pasteSelection(text), true);
  const before = bounds(selected(context.state));
  const copiedIds = new Set(context.state.selected);
  assert.equal(createCommands(context).duplicateSelection(), true);
  assert.equal(context.state.project.nodes.length, 4);
  assert.equal(context.state.project.wires.length, 2);
  assert.ok([...context.state.selected].every((id) => !copiedIds.has(id)));
  const after = bounds(selected(context.state));
  assert.equal(after.left, before.left + 40);
  assert.equal(after.top, before.top + 40);
  assert.equal(context.state.undoStack.length, 2);
});

test('locked, malformed, incompatible and empty insertions never change project, selection or undo', (t) => {
  const { context, commands } = setup(t);
  const valid = commands.copySelection();
  const wrongPin = JSON.parse(valid);
  wrongPin.wires[0].to.port = 'missing';
  context.state.pending = { node: 'source' };
  context.state.selectedWire = 'external';
  const before = structuredClone(context.state);
  for (const text of [
    'plain text',
    '{}',
    JSON.stringify(wrongPin),
    valid.replace('"and"', '"missing_type"'),
  ]) {
    assert.equal(commands.pasteSelection(text), false);
    assert.deepEqual(context.state, before);
  }
  assert.ok(context.events.every((event) => Array.isArray(event) && event[0] === 'notify'));
  context.events.length = 0;
  context.services.classroom = { allowEdit: () => false };
  assert.equal(commands.pasteSelection(valid), false);
  assert.equal(commands.duplicateSelection(), false);
  assert.deepEqual(context.events, []);
  assert.deepEqual(context.state, before);
});

test('project limits reject a complete insertion before any mutation or checkpoint', (t) => {
  const { context, commands } = setup(t);
  context.state.selected = new Set(['source']);
  const text = commands.copySelection();
  context.state.project = {
    version: 1,
    name: 'Full',
    nodes: Array.from({ length: 1000 }, (_, index) => node(`n${index}`, index)),
    wires: [],
  };
  context.state.selected = new Set(['n0']);
  const before = structuredClone(context.state);
  assert.equal(commands.pasteSelection(text), false);
  assert.deepEqual(context.state, before);
  assert.deepEqual(context.events, [['notify', 'limitReached']]);
});

test('the wire limit rejects the whole fragment even while component space remains', (t) => {
  const { context, commands } = setup(t);
  const text = commands.copySelection();
  const sources = Array.from({ length: 100 }, (_, index) => node(`s${index}`, index));
  const gates = Array.from({ length: 25 }, (_, index) => node(`g${index}`, index, 200, 'and', {}));
  const wires = sources.flatMap((source) =>
    gates.flatMap((gate) =>
      ['a', 'b'].map((port) => ({
        id: `${source.id}-${gate.id}-${port}`,
        from: { node: source.id, port: 'out' },
        to: { node: gate.id, port },
        width: 1,
      })),
    ),
  );
  context.state.project = { version: 1, name: 'Wired', nodes: [...sources, ...gates], wires };
  context.state.selected = new Set(['s0']);
  const before = structuredClone(context.state);
  assert.equal(commands.pasteSelection(text), false);
  assert.deepEqual(context.state, before);
  assert.deepEqual(context.events, [['notify', 'limitReached']]);
});

test('pasting an assigned keyboard input clears conflicts and notifies without duplicating its held state', (t) => {
  const project = {
    version: 1,
    name: 'Keys',
    nodes: [node('key', 100, 100, 'hotkey', { binding: 'KeyK', mode: 'hold', value: 1 })],
    wires: [],
  };
  const { context, commands } = setup(t, project);
  context.state.selected = new Set(['key']);
  assert.equal(commands.pasteSelection(commands.copySelection()), true);
  const [copy] = selected(context.state);
  assert.equal(copy.params.binding, '');
  assert.equal(copy.params.value, 0);
  assert.equal(project.nodes[0].params.binding, 'KeyK');
  assert.equal(project.nodes[0].params.value, 1);
  assert.match(context.events.at(-1)[1], /pastedHotkeysCleared/);
  assert.equal(context.state.undoStack.length, 1);
});
