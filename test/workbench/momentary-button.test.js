import test from 'node:test';
import assert from 'node:assert/strict';
import { bindMomentaryButton } from '../../src/workbench/momentary-button.js';

function fixture(t, { blocked = false, accept = true } = {}) {
  const previous = { document: globalThis.document, window: globalThis.window };
  const document = new EventTarget(),
    window = new EventTarget(),
    element = new EventTarget(),
    values = [];
  globalThis.document = document;
  globalThis.window = window;
  element.focus = () => {};
  element.setPointerCapture = (id) => (element.captured = id);
  const dispose = bindMomentaryButton(element, {
    blocked: () => blocked,
    press: () => {
      if (accept) values.push(1);
      return accept;
    },
    release: () => values.push(0),
  });
  t.after(() => {
    dispose();
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  });
  function send(type, extra = {}, target = element) {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      button: 0,
      pointerId: 7,
      detail: 1,
      ...extra,
    });
    target.dispatchEvent(event);
    return event;
  }
  return { element, document, window, values, send, dispose };
}

test('pointer hold drives one press and release outside the control ends it without a second click pulse', (t) => {
  const f = fixture(t);
  assert.equal(f.send('pointerdown').defaultPrevented, true);
  assert.equal(f.element.captured, 7);
  assert.deepEqual(f.values, [1]);
  f.send('pointerup', { pointerId: 8 }, f.window);
  assert.deepEqual(f.values, [1], 'another pointer must not release this hold');
  f.send('pointerup', {}, f.window);
  f.send('pointerup');
  f.send('click');
  assert.deepEqual(f.values, [1, 0]);
});

test('canceled pointers, lost capture, element/window blur and hidden pages release once and permit a fresh press', (t) => {
  const f = fixture(t);
  for (const [type, target] of [
    ['pointercancel', f.element],
    ['lostpointercapture', f.element],
    ['blur', f.element],
    ['blur', f.window],
    ['visibilitychange', f.document],
  ]) {
    f.send('pointerdown');
    f.document.hidden = true;
    f.send(type, {}, target);
    f.send('pointerup');
    assert.deepEqual(f.values.slice(-2), [1, 0]);
    f.document.hidden = false;
  }
  assert.equal(f.values.length, 10);
});

test('Space and Enter hold until their matching release; autorepeat creates no additional edges', (t) => {
  const f = fixture(t);
  for (const key of [' ', 'Enter']) {
    assert.equal(f.send('keydown', { key }).defaultPrevented, true);
    f.send('keydown', { key, repeat: true });
    f.send('keydown', { key, repeat: true });
    f.send('keyup', { key: key === ' ' ? 'Enter' : ' ' });
    assert.equal(f.values.at(-1), 1);
    assert.equal(f.send('keyup', { key }).defaultPrevented, true);
    assert.deepEqual(f.values.slice(-2), [1, 0]);
  }
  assert.deepEqual(f.values, [1, 0, 1, 0]);
  assert.equal(f.send('keydown', { key: 'ArrowRight' }).defaultPrevented, false);
});

test('assistive activation makes a complete synchronous pulse and disposal clears a held source', (t) => {
  const f = fixture(t);
  f.send('click', { detail: 0 });
  assert.deepEqual(f.values, [1, 0]);
  f.send('pointerdown');
  f.dispose();
  assert.deepEqual(f.values, [1, 0, 1, 0]);
  f.send('pointerdown');
  f.send('click', { detail: 0 });
  assert.deepEqual(f.values, [1, 0, 1, 0]);
});

test('locked, disabled and rejected controls never create a partial press', (t) => {
  const f = fixture(t, { blocked: true });
  f.send('pointerdown');
  f.send('keydown', { key: ' ' });
  f.send('click', { detail: 0 });
  assert.deepEqual(f.values, []);
});

test('a source refusing a press or a disabled native control remains released', (t) => {
  const f = fixture(t, { accept: false });
  f.send('pointerdown');
  f.send('pointerup');
  f.send('click', { detail: 0 });
  f.element.disabled = true;
  f.send('keydown', { key: 'Enter' });
  assert.deepEqual(f.values, []);
});
