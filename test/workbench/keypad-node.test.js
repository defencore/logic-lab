import test from 'node:test';
import assert from 'node:assert/strict';
import { keypadNodeMarkup } from '../../src/workbench/keypad-node.js';
import { keypadDomFixture } from './fixtures/keypad.js';

test('both languages expose all twelve native keys with row/column labels and an explicit mode caption', () => {
  for (const lang of ['en', 'ua']) {
    const hold = keypadNodeMarkup({ id: 'pad', label: '<Pad&>', params: { mode: 'hold' } }, lang);
    const toggle = keypadNodeMarkup({ id: 'pad', params: { mode: 'toggle' } }, lang);
    assert.equal((hold.match(/<button /g) || []).length, 12);
    assert.match(hold, /&lt;Pad&amp;&gt;/);
    assert.doesNotMatch(hold, /aria-label="<Pad/);
    assert.deepEqual(
      [...hold.matchAll(/data-keypad-key="(\d+)"/g)].map((match) => +match[1]),
      Array.from({ length: 12 }, (_, index) => index),
    );
    assert.match(hold, /aria-label="\* · R4 C1"/);
    assert.match(hold, /aria-label="0 · R4 C2"/);
    assert.match(hold, /aria-label="# · R4 C3"/);
    assert.match(hold, lang === 'ua' ? /Утримання/ : /Hold/);
    assert.match(toggle, lang === 'ua' ? /Фіксація/ : /Latch/);
  }
});

test('two fingers hold two actual keys across focus changes and each outside release clears only its own bit', (t) => {
  const f = keypadDomFixture(t);
  f.send(0, 'pointerdown', { pointerId: 21 });
  assert.equal(document.activeElement, f.buttons[0]);
  f.send(1, 'pointerdown', { pointerId: 22, isPrimary: false });
  assert.equal(document.activeElement, f.buttons[1]);
  assert.equal(f.node().params.keys, 3);
  assert.deepEqual(f.runtime.outputs.pad, { col0: 1, col1: 1, col2: 0 });
  f.send('window', 'pointerup', { pointerId: 21 });
  assert.equal(f.node().params.keys, 2);
  f.send('window', 'pointerup', { pointerId: 22, isPrimary: false });
  f.send(0, 'click');
  f.send(1, 'click');
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [1, 3, 2, 0],
  );
});

test('Space/Enter produce one hold each; arrows navigate the grid and release a keyboard hold without generating input', (t) => {
  const f = keypadDomFixture(t);
  f.buttons[4].focus();
  f.send(4, 'keydown', { key: ' ' });
  f.send(4, 'keydown', { key: ' ', repeat: true });
  assert.equal(f.node().params.keys, 16);
  assert.equal(f.send(4, 'keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.equal(document.activeElement, f.buttons[5]);
  assert.equal(f.node().params.keys, 0, 'keyboard holds release on blur even within this keypad');
  f.send(4, 'keyup', { key: ' ' });
  f.send(5, 'keydown', { key: 'ArrowRight' });
  assert.equal(document.activeElement, f.buttons[5], 'horizontal navigation stays in the row');
  f.send(5, 'keydown', { key: 'ArrowDown' });
  assert.equal(document.activeElement, f.buttons[8]);
  f.send(8, 'keydown', { key: 'ArrowLeft' });
  assert.equal(document.activeElement, f.buttons[7]);
  f.send(7, 'keydown', { key: 'ArrowUp' });
  assert.equal(document.activeElement, f.buttons[4]);
  f.send(4, 'keydown', { key: 'End' });
  assert.equal(document.activeElement, f.buttons[11]);
  f.send(11, 'keydown', { key: 'Home' });
  assert.equal(document.activeElement, f.buttons[0]);
  f.send(0, 'keydown', { key: 'Enter' });
  f.send(0, 'keydown', { key: 'Enter', repeat: true });
  f.send(0, 'keyup', { key: 'Enter' });
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [16, 0, 1, 0],
  );
});

test('latching mode changes once per press, retains state on release and supports assistive click activation', (t) => {
  const f = keypadDomFixture(t, 'toggle');
  f.send(4, 'pointerdown');
  f.send(4, 'pointerup');
  f.send(4, 'click');
  assert.equal(f.node().params.keys, 16);
  f.send(4, 'keydown', { key: 'Enter' });
  f.send(4, 'keydown', { key: 'Enter', repeat: true });
  f.send(4, 'keyup', { key: 'Enter' });
  assert.equal(f.node().params.keys, 0);
  f.send(11, 'click', { detail: 0 });
  assert.equal(f.node().params.keys, 2048);
  f.send(11, 'click', { detail: 0 });
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [16, 0, 2048, 0],
  );
});

test('readouts patch only accessibility state, block locked/disabled presses and clear live holds on outside blur or teardown', (t) => {
  const f = keypadDomFixture(t);
  f.send(2, 'pointerdown');
  f.update();
  assert.equal(f.buttons[2].attributes.get('aria-pressed'), 'true');
  const button = f.buttons[2];
  f.focusOutside();
  f.update();
  assert.equal(f.node().params.keys, 0);
  assert.equal(f.buttons[2], button);
  assert.equal(button.attributes.get('aria-pressed'), 'false');
  f.update(true);
  assert.ok(f.buttons.every((key) => key.disabled));
  f.send(1, 'pointerdown');
  f.send(1, 'click', { detail: 0 });
  assert.equal(f.node().params.keys, 0);
  f.node().enabled = false;
  f.update(false);
  assert.ok(f.buttons.every((key) => key.disabled));
  f.node().enabled = true;
  f.update(false);
  f.send(1, 'pointerdown');
  f.dispose();
  assert.equal(f.node().params.keys, 0);
  f.send(1, 'pointerdown');
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [4, 0, 2, 0],
  );
});

test('page hiding clears each pointer binder so a new press works after visibility returns', (t) => {
  const f = keypadDomFixture(t);
  f.send(0, 'pointerdown', { pointerId: 30 });
  f.send(3, 'pointerdown', { pointerId: 31, isPrimary: false });
  document.hidden = true;
  f.send('document', 'visibilitychange');
  assert.equal(f.node().params.keys, 0);
  document.hidden = false;
  f.send(0, 'pointerdown', { pointerId: 32 });
  assert.equal(f.node().params.keys, 1);
  f.send(0, 'pointercancel', { pointerId: 32 });
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [1, 9, 8, 0, 1, 0],
  );
});
