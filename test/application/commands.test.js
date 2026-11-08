import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommands } from '../../src/application/commands.js';
import { editingContext, withDocument } from './fixture.js';

const node = (id, x, type = 'switch') => ({
  id,
  type,
  x,
  y: 20,
  label: '',
  enabled: true,
  params: { value: 0 },
});
const wire = (id, from, to) => ({
  id,
  from: { node: from, port: 'out' },
  to: { node: to, port: 'a' },
  width: 1,
  points: [{ x: 200, y: 60 }],
});

test('duplicating a selection copies only internal wires with fresh IDs and independent parameters', () => {
  const context = editingContext();
  const { state } = context;
  state.project.nodes = [node('a', 20), node('b', 300, 'and'), node('outside', 500)];
  state.project.wires = [wire('inside', 'a', 'b'), wire('external', 'a', 'outside')];
  state.selected = new Set(['a', 'b']);
  createCommands(context).duplicateSelection();
  assert.equal(state.project.nodes.length, 5);
  assert.equal(state.project.wires.length, 3);
  const copies = state.project.nodes.slice(3),
    copiedWire = state.project.wires[2];
  assert.deepEqual(
    copies.map((item) => item.x),
    [60, 340],
  );
  assert.deepEqual(new Set(copies.map((item) => item.id)), state.selected);
  assert.equal(copiedWire.from.node, copies[0].id);
  assert.equal(copiedWire.to.node, copies[1].id);
  assert.deepEqual(copiedWire.points, [{ x: 240, y: 100 }]);
  copies[0].params.value = 1;
  assert.equal(state.project.nodes[0].params.value, 0);
});

test('source changes reach the recording session after the edited circuit updates', () => {
  const context = editingContext();
  context.state.project.nodes = [node('source', 20)];
  context.services.classroom = {
    allowInput: () => true,
    inputChanged: (...args) => context.events.push(['input', ...args]),
  };
  const commands = createCommands(context);
  commands.toggleSource('source');
  assert.equal(context.state.project.nodes[0].params.value, 1);
  assert.deepEqual(context.events, [
    'checkpoint',
    ['changed', undefined],
    ['input', 'source', 'value', 1],
  ]);
  context.services.classroom.allowInput = () => false;
  commands.toggleSource('source');
  assert.equal(context.state.project.nodes[0].params.value, 1);
  assert.equal(context.events.length, 3);
});

test('deleting components removes their wires and pending connection together', () => {
  const context = editingContext();
  context.state.project.nodes = [node('a', 20), node('b', 300), node('c', 500)];
  context.state.project.wires = [wire('ab', 'a', 'b'), wire('bc', 'b', 'c')];
  context.state.selected.add('a');
  context.state.pending = { node: 'a' };
  createCommands(context).deleteSelection();
  assert.deepEqual(
    context.state.project.nodes.map((item) => item.id),
    ['b', 'c'],
  );
  assert.deepEqual(
    context.state.project.wires.map((item) => item.id),
    ['bc'],
  );
  assert.equal(context.state.pending, null);
  assert.equal(context.state.selected.size, 0);
});

test('adding a component preserves catalog defaults, snaps its position and respects laboratory locking', (t) => {
  withDocument(t);
  const context = editingContext();
  const commands = createCommands(context);
  commands.addNode('switch', { x: 35, y: 42 });
  assert.equal(context.state.project.nodes.length, 1);
  const added = context.state.project.nodes[0];
  assert.deepEqual({ x: added.x, y: added.y }, { x: 40, y: 40 });
  assert.equal(added.params.value, 0);
  assert.deepEqual([...context.state.selected], [added.id]);
  context.services.classroom = { allowEdit: () => false };
  commands.addNode('switch', { x: 100, y: 100 });
  assert.equal(context.state.project.nodes.length, 1);
});
