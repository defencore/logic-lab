import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHotkeyBinding,
  canonicalHotkeyBinding,
  bindingFromEvent,
  displayHotkeyBinding,
  matchesHotkeyBinding,
  hotkeyBindingError,
  findHotkeyConflict,
} from '../../src/components/catalog/hotkey-bindings.js';

test('physical bindings have a stable canonical descriptor independent of the active text layout', () => {
  assert.equal(canonicalHotkeyBinding('Shift+Ctrl+KeyA'), 'Ctrl+Shift+KeyA');
  assert.deepEqual(parseHotkeyBinding('Ctrl+Shift+KeyA'), {
    binding: 'Ctrl+Shift+KeyA',
    code: 'KeyA',
    ctrlKey: true,
    altKey: false,
    shiftKey: true,
    metaKey: false,
  });
  assert.equal(bindingFromEvent({ code: 'KeyA', key: 'Ф', shiftKey: true }), 'Shift+KeyA');
  assert.equal(bindingFromEvent({ code: 'ShiftLeft', key: 'Shift', shiftKey: true }), null);
  assert.equal(bindingFromEvent({ code: 'KeyA', isComposing: true }), null);
  assert.equal(bindingFromEvent({ code: 'KeyA', getModifierState: () => true }), null);
  assert.equal(displayHotkeyBinding('Shift+Space', 'ua'), 'Shift + Пробіл');
  assert.equal(displayHotkeyBinding('', 'en'), 'Unassigned');
});

test('runtime and import validation share the portable-key policy and reject malformed descriptors', () => {
  for (const binding of ['', 'KeyA', 'Shift+KeyK', 'Space', 'ArrowUp', 'Shift+Digit2'])
    assert.equal(hotkeyBindingError(binding), null, binding);
  for (const binding of [
    'Ctrl+KeyL',
    'Ctrl+Shift+KeyA',
    'Alt+Tab',
    'Meta+KeyQ',
    'Tab',
    'Escape',
    'F1',
    'F12',
    'PrintScreen',
  ])
    assert.equal(hotkeyBindingError(binding), 'reserved', binding);
  for (const binding of [
    null,
    undefined,
    5,
    'A',
    'shift+KeyA',
    'KeyA+Shift',
    'Shift+Shift+KeyA',
    'KeyAA',
  ])
    assert.equal(hotkeyBindingError(binding), 'invalid', String(binding));
  assert.equal(hotkeyBindingError('Shift+Ctrl+KeyA'), 'noncanonical');
});

test('matching uses exact physical code and modifiers without activating browser shortcuts or composing text', () => {
  assert.equal(matchesHotkeyBinding('KeyA', { code: 'KeyA', key: 'ф' }), true);
  assert.equal(
    matchesHotkeyBinding('Shift+KeyA', { code: 'KeyA', key: 'Ф', shiftKey: true }),
    true,
  );
  for (const event of [
    { code: 'KeyB' },
    { code: 'KeyA', shiftKey: true },
    { code: 'KeyA', ctrlKey: true },
    { code: 'KeyA', isComposing: true },
    { code: 'KeyA', getModifierState: () => true },
  ])
    assert.equal(matchesHotkeyBinding('KeyA', event), false);
  assert.equal(matchesHotkeyBinding('Ctrl+KeyL', { code: 'KeyL', ctrlKey: true }), false);
  assert.equal(matchesHotkeyBinding('', { code: 'KeyA' }), false);
});

test('conflicts include disabled components and distinguish Shift from the plain physical key', () => {
  const first = { id: 'one', type: 'hotkey', params: { binding: 'KeyA' }, enabled: false };
  const second = { id: 'two', type: 'hotkey', params: { binding: 'Shift+KeyA' } };
  const project = { nodes: [first, second] };
  assert.equal(findHotkeyConflict(project, 'KeyA', 'new'), first);
  assert.equal(findHotkeyConflict(project, 'KeyA', 'one'), null);
  assert.equal(findHotkeyConflict(project, 'Shift+KeyA', 'one'), second);
  assert.equal(findHotkeyConflict(project, '', 'new'), null);
});
