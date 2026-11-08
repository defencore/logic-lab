import test from 'node:test';
import assert from 'node:assert/strict';
import { hotkeyFixture, keyboardEvent } from './fixtures/hotkey.js';
import { bindApplicationEvents } from '../../src/application/events.js';

class Element extends EventTarget {
  open = false;
  classList = { contains: () => false, toggle() {} };
  closest() {
    return null;
  }
}
class Document extends Element {
  elements = new Map();
  querySelector(selector) {
    if (!this.elements.has(selector)) this.elements.set(selector, new Element());
    return this.elements.get(selector);
  }
}

test('assigned physical keys own keyboard events before actual editor shortcuts, while unassigned shortcuts and text entry keep their behavior', (t) => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const document = new Document(),
    window = new Element();
  globalThis.document = document;
  globalThis.window = window;
  t.after(() => {
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  });
  const f = hotkeyFixture('hold', 'KeyR');
  const calls = { run: 0, duplicate: 0, save: 0, checkpoint: 0 };
  const state = {
    project: f.project,
    selected: new Set(['lamp']),
    tool: 'select',
    view: { x: 0, y: 0, zoom: 1 },
    compactLayout: new Element(),
    spaceHeld: false,
    shiftHeld: false,
    lang: 'ua',
  };
  bindApplicationEvents({
    state,
    services: {
      hotkeys: f.controller,
      dialogs: { isOpen: () => false, handleKey: () => false },
      wiring: { keyDown: () => false },
      monitor: {},
    },
    actions: {
      onPointerMove() {},
      onPointerUp() {},
      updateTool() {},
      setToolsOpen() {},
      toggleRunning: () => calls.run++,
      duplicateSelection: () => calls.duplicate++,
      exportProject: () => calls.save++,
      checkpoint: () => calls.checkpoint++,
      changed() {},
      applyView() {},
      persist() {},
    },
    t: (key) => key,
  });
  const press = (code, extra) => {
    const e = keyboardEvent('keydown', code, extra);
    document.dispatchEvent(e);
    return e;
  };
  const up = (code, extra) => document.dispatchEvent(keyboardEvent('keyup', code, extra));
  assert.equal(press('KeyR').defaultPrevented, true);
  assert.equal(f.output(), 1);
  assert.equal(calls.run, 0);
  up('KeyR');
  assert.equal(f.output(), 0);
  for (const code of ['Space', 'ArrowRight', 'Delete']) {
    f.project.nodes[0].params.binding = code;
    f.controller.reconcile();
    assert.equal(press(code).defaultPrevented, true);
    up(code);
  }
  assert.equal(state.spaceHeld, false);
  assert.equal(f.project.nodes[1].x, 0);
  assert.equal(calls.checkpoint, 0);
  f.project.nodes[0].params.binding = 'KeyS';
  f.controller.reconcile();
  press('KeyS', { ctrlKey: true });
  up('KeyS', { ctrlKey: true });
  assert.equal(calls.save, 1, 'Ctrl+S remains Save when the physical S key is assigned');
  assert.equal(f.output(), 0);
  let captureCalls = 0;
  f.controller.beginCapture({
    nodeId: 'key',
    onCancel() {},
    onKey: () => {
      captureCalls++;
      return 'retry';
    },
  });
  assert.equal(press('KeyD', { ctrlKey: true }).defaultPrevented, true);
  assert.equal(calls.duplicate, 0);
  assert.equal(captureCalls, 1);
  f.controller.suspend();
  f.project.nodes[0].params.binding = '';
  f.controller.reconcile();
  press('KeyR');
  assert.equal(calls.run, 1);
  press('ArrowRight');
  assert.equal(f.project.nodes[1].x, 20);
  assert.equal(calls.checkpoint, 1);
});
