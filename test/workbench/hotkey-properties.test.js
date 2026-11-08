import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHotkeyProperties,
  hotkeyPropertiesMarkup,
} from '../../src/workbench/hotkey-properties.js';

function fixture(t) {
  const node = { id: 'key', type: 'hotkey', params: { binding: 'KeyB', mode: 'hold', value: 0 } };
  let locked = false,
    request,
    captureActive = false,
    cancels = 0,
    writes = 0;
  const checkpoints = [];
  const state = {
    lang: 'ua',
    project: { nodes: [node] },
    selected: new Set([node.id]),
    inspectorTab: 'properties',
    runtime: { outputs: { key: { out: 0 } } },
    classroom: { isLocked: () => locked, allowEdit: () => !locked },
  };
  const elements = new Map(
    ['record', 'clear', 'cancel', 'mode', 'binding', 'value', 'status'].map((key) => {
      const attributes = new Map();
      return [
        `[data-hotkey-${key}]`,
        {
          disabled: false,
          hidden: false,
          textContent: '',
          value: '',
          setAttribute: (name, value) => attributes.set(name, value),
          getAttribute: (name) => attributes.get(name),
        },
      ];
    }),
  );
  let panel = {
    dataset: { hotkeyProperties: node.id },
    querySelector: (selector) => elements.get(selector) || null,
  };
  const previous = globalThis.document;
  globalThis.document = {
    querySelector: (selector) => (selector === '[data-hotkey-properties]' ? panel : null),
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  const controller = createHotkeyProperties(state, {
    checkpoint: () => checkpoints.push(structuredClone(node.params)),
    changed() {
      writes++;
      controller.cancel();
      controller.update();
    },
    beginHotkeyCapture(value) {
      request = value;
      captureActive = true;
      return () => {
        if (!captureActive) return;
        captureActive = false;
        cancels++;
        value.onCancel();
      };
    },
  });
  controller.bind(node);
  return {
    state,
    node,
    controller,
    checkpoints,
    element: (key) => elements.get(`[data-hotkey-${key}]`),
    start: () => elements.get('[data-hotkey-record]').onclick(),
    key: (event) => request.onKey(event),
    writes: () => writes,
    cancels: () => cancels,
    active: () => captureActive,
    lock: (value) => {
      locked = value;
    },
    removePanel: () => {
      panel = null;
    },
  };
}

test('binding capture commits one undo checkpoint after acceptance and survives inspector cancellation during changed()', (t) => {
  const f = fixture(t);
  f.start();
  assert.equal(f.active(), true);
  assert.equal(f.element('cancel').hidden, false);
  assert.equal(f.element('record').getAttribute('aria-pressed'), 'true');
  assert.equal(f.key({ code: 'KeyA', key: 'Ф', shiftKey: true }), 'accepted');
  assert.equal(f.node.params.binding, 'Shift+KeyA');
  assert.equal(f.node.params.value, 0);
  assert.equal(f.checkpoints.length, 1);
  assert.equal(f.checkpoints[0].binding, 'KeyB');
  assert.equal(f.writes(), 1);
  assert.equal(f.cancels(), 1);
  assert.equal(f.active(), false);
  assert.equal(f.element('binding').textContent, 'Shift + A');
  assert.equal(f.element('cancel').hidden, true);
  assert.doesNotMatch(f.element('status').textContent, /скасовано/);
});

test('reserved shortcuts, duplicate bindings, modifier-only keys and repeats never commit a partial assignment', (t) => {
  const f = fixture(t);
  f.state.project.nodes.push({
    id: 'other',
    type: 'hotkey',
    label: 'Лампа',
    params: { binding: 'KeyK' },
  });
  f.start();
  assert.equal(f.key({ code: 'KeyL', ctrlKey: true }), 'retry');
  assert.match(f.element('status').textContent, /системне або браузерне/);
  assert.equal(f.key({ code: 'KeyK' }), 'retry');
  assert.match(f.element('status').textContent, /Лампа/);
  assert.equal(f.key({ code: 'ShiftLeft', shiftKey: true }), 'retry');
  assert.equal(f.key({ code: 'KeyJ', repeat: true }), 'retry');
  assert.equal(f.node.params.binding, 'KeyB');
  assert.equal(f.checkpoints.length, 0);
  assert.equal(f.writes(), 0);
  assert.equal(f.active(), true);
  assert.equal(f.key({ code: 'KeyJ', shiftKey: true }), 'accepted');
  assert.equal(f.node.params.binding, 'Shift+KeyJ');
  assert.equal(f.checkpoints.length, 1);
});

test('Escape, explicit cancellation and a removed inspector preserve the prior binding and ignore stale capture callbacks', (t) => {
  const f = fixture(t);
  f.start();
  assert.equal(f.key({ code: 'Escape', key: 'Escape' }), 'cancel');
  assert.equal(f.key({ code: 'KeyA' }), 'cancel');
  assert.equal(f.node.params.binding, 'KeyB');
  f.start();
  f.element('cancel').onclick();
  assert.equal(f.active(), false);
  f.start();
  f.removePanel();
  assert.doesNotThrow(() => f.controller.cancel());
  assert.equal(f.active(), false);
  assert.equal(f.checkpoints.length, 0);
  assert.equal(f.writes(), 0);
});

test('clear and mode changes use one checkpoint each and reset raw state, while locked or deselected controls cannot edit', (t) => {
  const f = fixture(t);
  f.node.params.value = 1;
  f.element('clear').onclick();
  assert.deepEqual(f.node.params, { binding: '', mode: 'hold', value: 0 });
  assert.equal(f.checkpoints.length, 1);
  f.node.params.value = 1;
  f.element('mode').onchange({ target: { value: 'inverted' } });
  assert.deepEqual(f.node.params, { binding: '', mode: 'inverted', value: 0 });
  assert.equal(f.checkpoints.length, 2);
  f.lock(true);
  f.controller.update();
  assert.equal(f.element('record').disabled, true);
  assert.equal(f.element('mode').disabled, true);
  f.start();
  f.element('mode').onchange({ target: { value: 'toggle' } });
  assert.equal(f.node.params.mode, 'inverted');
  assert.equal(f.checkpoints.length, 2);
  f.lock(false);
  f.start();
  f.state.selected.clear();
  f.controller.update();
  assert.equal(f.active(), false);
  assert.equal(f.key({ code: 'KeyA' }), 'cancel');
  assert.equal(f.writes(), 2);
});

test('properties explain the physical-key contract and expose source signal read-only in both languages', () => {
  const node = {
    id: 'key',
    type: 'hotkey',
    params: { binding: 'Space', mode: 'toggle', value: 0 },
  };
  const ua = hotkeyPropertiesMarkup(node, 'ua'),
    en = hotkeyPropertiesMarkup(node, 'en');
  assert.match(ua, /Призначити клавішу/);
  assert.match(ua, /фізичній клавіші/);
  assert.match(ua, /<output data-hotkey-value>/);
  assert.match(en, /Assign a key/);
  assert.doesNotMatch(ua, /data-param="(?:binding|mode|value)"/);
  assert.equal(hotkeyPropertiesMarkup({ type: 'switch' }, 'ua'), '');
});
