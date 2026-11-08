import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../../src/application/history.js';
import { editingContext, withDocument } from './fixture.js';

test('editing history keeps a bounded sequence, restores model selection and supports redo', (t) => {
  const elements = withDocument(t);
  const context = editingContext();
  Object.assign(context.actions, createHistory(context));
  const { state, actions, events } = context;
  for (let step = 0; step < 85; step++) {
    actions.checkpoint();
    state.project.name = `Circuit ${step}`;
  }
  assert.equal(state.undoStack.length, 80);
  state.selected.add('old-node');
  state.selectedWire = 'old-wire';
  actions.undo();
  assert.equal(state.project.name, 'Circuit 83');
  assert.equal(state.selected.size, 0);
  assert.equal(state.selectedWire, null);
  assert.equal(elements.get('#project-name').value, 'Circuit 83');
  assert.deepEqual(events.slice(-3), ['cancel', ['changed', { reset: true }], 'lesson']);
  actions.undo(true);
  assert.equal(state.project.name, 'Circuit 84');
  assert.equal(state.redoStack.length, 0);
  assert.equal(elements.get('#redo').disabled, true);
});

test('locked laboratory work cannot enter undo history and each text editing session creates one checkpoint', (t) => {
  withDocument(t);
  const context = editingContext();
  Object.assign(context.actions, createHistory(context));
  const input = { value: 'First' };
  context.actions.bindLiveText(input, (value) => (context.state.project.name = value));
  input.oninput();
  input.value = 'Second';
  input.oninput();
  assert.equal(context.state.undoStack.length, 1);
  input.onblur();
  input.value = 'Third';
  input.oninput();
  assert.equal(context.state.undoStack.length, 2);
  context.services.classroom = { allowEdit: () => false };
  context.actions.undo();
  assert.equal(context.state.project.name, 'Third');
  assert.equal(context.state.undoStack.length, 2);
});
