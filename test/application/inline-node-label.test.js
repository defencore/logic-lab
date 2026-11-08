import test from 'node:test';
import assert from 'node:assert/strict';
import { inlineFixture } from './fixtures/inline-node-label.js';

test('double-click label draft commits once on Enter and one real Undo restores the previous label', (t) => {
  const f = inlineFixture(t),
    view = { ...f.state.view };
  f.begin();
  assert.equal(f.input.value, '');
  assert.equal(f.input.placeholder, 'Switch');
  assert.equal(f.input.maxLength, 100);
  assert.equal(f.header.getAttribute('role'), 'group');
  assert.equal(f.header.getAttribute('tabindex'), null);
  assert.equal(f.cancellations, 1);
  assert.equal(f.state.pending, null);
  assert.equal(f.state.gesture, null);
  f.type('SER input');
  assert.equal(f.state.project.nodes[0].label, '');
  assert.equal(f.state.undoStack.length, 0);
  const input = f.input;
  assert.equal(f.key('Enter').defaultPrevented, true);
  assert.equal(f.state.project.nodes[0].label, 'SER input');
  assert.deepEqual(f.calls, [['source', 'SER input']]);
  assert.equal(f.state.undoStack.length, 1);
  assert.equal(f.root.activeElement, f.header);
  assert.deepEqual(f.state.view, view, 'text confirmation does not reveal or zoom the component');
  f.event(input, 'blur');
  assert.equal(f.calls.length, 1);
  f.actions.undo();
  assert.equal(f.state.project.nodes[0].label, '');
  assert.equal(f.state.undoStack.length, 0);
});

test('Escape and unchanged blur cancel without history; blank commit keeps the default-name semantics', (t) => {
  const f = inlineFixture(t, 'Custom');
  f.begin();
  f.type('Discard');
  assert.equal(f.key('Escape').defaultPrevented, true);
  assert.equal(f.state.project.nodes[0].label, 'Custom');
  assert.equal(f.root.activeElement, f.header);
  assert.equal(f.calls.length, 0);
  f.begin();
  f.event(f.input, 'blur');
  assert.equal(f.state.undoStack.length, 0);
  assert.equal(f.calls.length, 0);
  f.begin();
  f.type('');
  f.event(f.input, 'blur');
  assert.equal(f.state.project.nodes[0].label, '');
  assert.deepEqual(f.calls, [['source', '']]);
  assert.equal(f.state.undoStack.length, 1);
});

test('same-project rendering preserves draft, caret and focus without committing the label', (t) => {
  const f = inlineFixture(t, 'Old');
  f.begin();
  f.type('Partial edit');
  const original = f.input;
  f.input.setSelectionRange(2, 7, 'backward');
  f.render();
  assert.notEqual(f.input, original);
  assert.equal(f.input.value, 'Partial edit');
  assert.equal(f.input.selectionStart, 2);
  assert.equal(f.input.selectionEnd, 7);
  assert.equal(f.input.selectionDirection, 'backward');
  assert.equal(f.root.activeElement, f.input);
  assert.equal(f.state.project.nodes[0].label, 'Old');
  assert.equal(f.calls.length, 0);
  f.event(original, 'blur');
  assert.equal(f.calls.length, 0);
});

test('readonly state blocks beginning and cancels a draft if permission is lost before blur', (t) => {
  const f = inlineFixture(t, 'Old');
  f.locked(true);
  f.begin();
  assert.equal(f.input, undefined);
  f.locked(false);
  f.begin();
  f.type('Blocked');
  f.locked(true);
  f.event(f.input, 'blur');
  assert.equal(f.state.project.nodes[0].label, 'Old');
  assert.equal(f.calls.length, 0);
  assert.equal(f.state.undoStack.length, 0);
  f.locked(false);
  f.begin();
  f.type('Another');
  f.locked(true);
  f.render();
  assert.equal(f.input, undefined);
  assert.equal(f.state.project.nodes[0].label, 'Old');
});

test('replacing the project or removing the component cancels the draft without renaming a reused ID', (t) => {
  const f = inlineFixture(t, 'Old');
  f.begin();
  f.type('Wrong project');
  f.state.project = structuredClone(f.state.project);
  f.state.project.nodes[0].label = 'Replacement';
  f.render();
  assert.equal(f.input, undefined);
  assert.equal(f.state.project.nodes[0].label, 'Replacement');
  f.begin();
  f.type('Removed');
  f.state.project.nodes = [];
  f.render();
  assert.equal(f.calls.length, 0);
  assert.equal(f.state.undoStack.length, 0);
});

test('the editor contains pointer and keyboard events while preserving native text defaults and IME composition', (t) => {
  const f = inlineFixture(t, 'Old');
  f.begin();
  for (const type of [
    'pointerdown',
    'pointerup',
    'click',
    'dblclick',
    'contextmenu',
    'wheel',
    'dragover',
    'drop',
  ]) {
    const event = f.event(f.input, type);
    assert.equal(event.cancelBubble, true);
    assert.equal(event.defaultPrevented, false);
  }
  for (const key of ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', ' ', 'Tab']) {
    const event = f.key(key);
    assert.equal(event.cancelBubble, true);
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(f.key('Enter', { isComposing: true }).defaultPrevented, false);
  assert.equal(f.calls.length, 0);
  assert.equal(f.opened, 0);
  assert.equal(f.state.project.nodes[0].label, 'Old');
});
