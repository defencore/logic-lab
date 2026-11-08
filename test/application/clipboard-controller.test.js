import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClipboardController,
  FRAGMENT_MIME,
} from '../../src/application/clipboard-controller.js';
import { bindApplicationEvents } from '../../src/application/events.js';

function element({ field = false, node = null } = {}) {
  const component = node ? { dataset: { node } } : null;
  return {
    closest(selector) {
      if (selector === 'input,textarea,select,[contenteditable]') return field ? this : null;
      if (selector === '.circuit-node') return component;
      return null;
    },
  };
}
function event({
  target = element(),
  data = {},
  missing = false,
  failWrite = '',
  prevented = false,
} = {}) {
  const reads = [],
    writes = [];
  return {
    target,
    defaultPrevented: prevented,
    reads,
    writes,
    clipboardData: missing
      ? null
      : {
          setData(type, source) {
            writes.push([type, source]);
            if (type === failWrite) throw new Error('Clipboard type unavailable');
          },
          getData(type) {
            reads.push(type);
            return data[type] || '';
          },
        },
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}
function fixture({ selected = ['a'], source = '{"kind":"logic-lab-fragment"}' } = {}) {
  const calls = [],
    listeners = new Map();
  const state = {
    project: { nodes: [{ id: 'a' }, { id: 'b' }], wires: [] },
    selected: new Set(selected),
    selectedWire: 'old-wire',
    compactLayout: { addEventListener() {} },
  };
  let modal = false,
    selectedText = '',
    locked = false;
  const root = {
    activeElement: element(),
    getSelection: () => ({ toString: () => selectedText }),
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    querySelector: () => ({ addEventListener() {} }),
  };
  const context = {
    state,
    services: { dialogs: { isOpen: () => modal } },
    actions: {
      selectionChanged: () => calls.push(['selectionChanged']),
      copySelection: () => {
        calls.push(['copy', [...state.selected]]);
        return source;
      },
      pasteSelection: (text) => {
        calls.push(['paste', text, locked]);
        return !locked;
      },
      notify: (message) => calls.push(['notify', message]),
    },
    t: (key) =>
      ({ selectionCopied: 'Copied {count}', clipboardUnavailable: 'Clipboard unavailable' })[key] ||
      key,
  };
  const controller = createClipboardController(context, root);
  context.services.clipboard = controller;
  return {
    context,
    state,
    root,
    controller,
    calls,
    listeners,
    setModal: (value) => {
      modal = value;
    },
    setText: (value) => {
      selectedText = value;
    },
    setLocked: (value) => {
      locked = value;
    },
  };
}

test('copy writes portable plain text and custom MIME while preserving a focused selected group', () => {
  const f = fixture({ selected: ['a', 'b'] });
  f.root.activeElement = element({ node: 'a' });
  const copy = event();
  assert.equal(f.controller.copy(copy), true);
  assert.equal(copy.defaultPrevented, true);
  assert.deepEqual(copy.writes, [
    ['text/plain', '{"kind":"logic-lab-fragment"}'],
    [FRAGMENT_MIME, '{"kind":"logic-lab-fragment"}'],
  ]);
  assert.deepEqual([...f.state.selected], ['a', 'b']);
  assert.equal(f.state.selectedWire, 'old-wire');
  assert.deepEqual(f.calls, [
    ['copy', ['a', 'b']],
    ['notify', 'Copied 2'],
  ]);
});

test('copying an unselected keyboard-focused component selects that component before serializing', () => {
  const f = fixture({ selected: ['a'] });
  f.root.activeElement = element({ node: 'b' });
  const copy = event();
  assert.equal(f.controller.copy(copy), true);
  assert.deepEqual([...f.state.selected], ['b']);
  assert.equal(f.state.selectedWire, null);
  assert.deepEqual(f.calls.slice(0, 2), [['selectionChanged'], ['copy', ['b']]]);
});

test('native text fields, contenteditable descendants, dialogs and existing handlers keep copy and paste', () => {
  for (const condition of [
    'target-field',
    'focused-field',
    'fallback-focused-field',
    'modal',
    'prevented',
  ]) {
    const f = fixture(),
      copy = event(),
      paste = event({ data: { 'text/plain': 'fragment' } });
    if (condition === 'target-field') copy.target = paste.target = element({ field: true });
    if (condition === 'focused-field') f.root.activeElement = element({ field: true });
    if (condition === 'fallback-focused-field') {
      f.root.activeElement = element({ field: true });
      copy.target = paste.target = {};
    }
    if (condition === 'modal') f.setModal(true);
    if (condition === 'prevented') copy.defaultPrevented = paste.defaultPrevented = true;
    assert.equal(f.controller.copy(copy), false, condition);
    assert.equal(f.controller.paste(paste), false, condition);
    assert.deepEqual(f.calls, [], condition);
    assert.deepEqual(copy.writes, []);
    assert.deepEqual(paste.reads, []);
    if (condition !== 'prevented') {
      assert.equal(copy.defaultPrevented, false);
      assert.equal(paste.defaultPrevented, false);
    }
  }
});

test('selected native DOM text including whitespace takes priority over circuit copy', () => {
  for (const text of ['Selected help text', '   ']) {
    const f = fixture();
    f.setText(text);
    const copy = event();
    assert.equal(f.controller.copy(copy), false);
    assert.equal(copy.defaultPrevented, false);
    assert.deepEqual(f.calls, []);
    assert.deepEqual(copy.writes, []);
  }
});

test('missing selection or clipboard data leaves native clipboard behavior untouched', () => {
  const f = fixture({ selected: [], source: null });
  const copy = event();
  assert.equal(f.controller.copy(copy), false);
  assert.equal(copy.defaultPrevented, false);
  assert.deepEqual(copy.writes, []);
  assert.deepEqual(f.calls, [['copy', []]]);
  f.calls.length = 0;
  assert.equal(f.controller.copy(event({ missing: true })), false);
  assert.equal(f.controller.paste(event({ missing: true })), false);
  const empty = event();
  assert.equal(f.controller.paste(empty), false);
  assert.equal(empty.defaultPrevented, false);
  assert.deepEqual(f.calls, []);
});

test('custom MIME rejection retains successful plain-text copy while plain-text failure is reported', () => {
  const portable = fixture(),
    copy = event({ failWrite: FRAGMENT_MIME });
  assert.equal(portable.controller.copy(copy), true);
  assert.equal(copy.defaultPrevented, true);
  assert.deepEqual(portable.calls.at(-1), ['notify', 'Copied 1']);
  const failed = fixture(),
    blocked = event({ failWrite: 'text/plain' });
  assert.equal(failed.controller.copy(blocked), false);
  assert.equal(blocked.defaultPrevented, false);
  assert.deepEqual(
    blocked.writes.map(([type]) => type),
    ['text/plain'],
  );
  assert.deepEqual(failed.calls.at(-1), ['notify', 'Clipboard unavailable']);
});

test('paste prefers custom MIME and falls back to plain text without asynchronous permission access', () => {
  const f = fixture();
  const custom = event({
    data: { [FRAGMENT_MIME]: 'custom-fragment', 'text/plain': 'different-text' },
  });
  assert.equal(f.controller.paste(custom), true);
  assert.equal(custom.defaultPrevented, true);
  assert.deepEqual(custom.reads, [FRAGMENT_MIME]);
  assert.deepEqual(f.calls.at(-1), ['paste', 'custom-fragment', false]);
  const plain = event({ data: { 'text/plain': 'plain-fragment' } });
  assert.equal(f.controller.paste(plain), true);
  assert.deepEqual(plain.reads, [FRAGMENT_MIME, 'text/plain']);
  assert.deepEqual(f.calls.at(-1), ['paste', 'plain-fragment', false]);
});

test('read-only copying stays available while locked paste is delegated to the guarded edit command', () => {
  const f = fixture();
  f.setLocked(true);
  f.context.services.classroom = {
    allowEdit() {
      throw new Error('Copy must not request edit permission');
    },
  };
  const original = structuredClone(f.state.project),
    copy = event();
  assert.equal(f.controller.copy(copy), true);
  const paste = event({ data: { 'text/plain': 'fragment' } });
  assert.equal(f.controller.paste(paste), false);
  assert.equal(paste.defaultPrevented, true);
  assert.deepEqual(f.calls.at(-1), ['paste', 'fragment', true]);
  assert.deepEqual(f.state.project, original);
});

test('application document copy and paste listeners delegate real event data to the clipboard controller', (t) => {
  const f = fixture(),
    priorDocument = globalThis.document,
    priorWindow = globalThis.window;
  globalThis.document = f.root;
  globalThis.window = { addEventListener() {} };
  t.after(() => {
    globalThis.document = priorDocument;
    globalThis.window = priorWindow;
  });
  bindApplicationEvents(f.context);
  const copy = event();
  assert.equal(f.listeners.get('copy').length, 1);
  assert.equal(f.listeners.get('copy')[0](copy), true);
  assert.equal(copy.defaultPrevented, true);
  const paste = event({ data: { 'text/plain': 'native-fragment' } });
  assert.equal(f.listeners.get('paste')[0](paste), true);
  assert.deepEqual(f.calls.at(-1), ['paste', 'native-fragment', false]);
});
