import test from 'node:test';
import assert from 'node:assert/strict';
import { hotkeyFixture, keyboardEvent } from './fixtures/hotkey.js';

test('tab navigation retains assigned arrow/Home/End keys without actuating a source; the same keys work on canvas', () => {
  for (const code of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    const f = hotkeyFixture('hold', code),
      event = keyboardEvent('keydown', code);
    Object.defineProperty(event, 'target', {
      value: { closest: (selector) => (selector === '[role="tab"]' ? {} : null) },
    });
    assert.equal(f.controller.keyDown(event), false);
    assert.equal(event.defaultPrevented, false);
    assert.equal(f.output(), 0);
    assert.deepEqual(f.writes, []);
    f.controller.keyUp(keyboardEvent('keyup', code));
    assert.equal(f.down(code), true);
    assert.equal(f.output(), 1);
    f.up(code);
    assert.equal(f.output(), 0);
  }
});
