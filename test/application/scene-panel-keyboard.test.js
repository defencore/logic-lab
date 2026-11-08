import test from 'node:test';
import assert from 'node:assert/strict';
import { bindApplicationEvents } from '../../src/application/events.js';
import { createCommands } from '../../src/application/commands.js';
import { bindMomentaryButton } from '../../src/workbench/momentary-button.js';

function fixture(t) {
  const previous = { document: globalThis.document, window: globalThis.window };
  const document = new EventTarget(),
    elements = new Map();
  document.querySelector = (selector) => {
    if (!elements.has(selector))
      elements.set(selector, {
        open: false,
        classList: { contains: () => false },
        addEventListener() {},
      });
    return elements.get(selector);
  };
  globalThis.document = document;
  globalThis.window = new EventTarget();
  t.after(() => {
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  });
  const state = {
    project: {
      nodes: [
        { id: 'old-selection', type: 'switch', x: 40, y: 60, params: { value: 0 } },
        { id: 'scene', type: 'water_tank', x: 360, y: 60, params: {} },
      ],
      wires: [],
    },
    selected: new Set(['old-selection']),
    selectedWire: null,
    view: { x: 12, y: 24, zoom: 0.58 },
    tool: 'select',
    spaceHeld: false,
    shiftHeld: false,
    compactLayout: new EventTarget(),
  };
  const calls = { checkpoints: 0, changes: 0, tools: 0 };
  const actions = {
    onPointerMove() {},
    onPointerUp() {},
    cancelInteraction() {},
    persist() {},
    applyView() {},
    notify() {},
    updateTool: () => calls.tools++,
    checkpoint: () => calls.checkpoints++,
    changed: () => calls.changes++,
  };
  const services = {
    dialogs: { isOpen: () => false, handleKey: () => false },
    wiring: { keyDown: () => false },
    classroom: { allowEdit: () => true },
    learning: { renderLesson() {} },
  };
  Object.assign(actions, createCommands({ state, services, actions, t: (key) => key }));
  bindApplicationEvents({ state, services, actions, t: (key) => key });
  function target({ panel = false, native = false } = {}) {
    return {
      closest(selector) {
        if (selector === '#scene-panel' && panel) return this;
        if (selector === 'input,textarea,select,[contenteditable]' && native) return this;
        return null;
      },
    };
  }
  function key(target, key, options = {}) {
    const event = Object.assign(new Event('keydown', { cancelable: true }), { key, ...options });
    Object.defineProperty(event, 'target', { value: target });
    document.dispatchEvent(event);
    return event;
  }
  return { state, calls, key, target, document };
}

test('real document shortcuts protect the old circuit selection while a 3D panel control has focus', (t) => {
  const f = fixture(t),
    before = structuredClone(f.state.project),
    view = { ...f.state.view },
    selected = f.state.selected,
    panelControl = f.target({ panel: true });
  for (const key of ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    for (const options of [{}, { shiftKey: true }, { repeat: true }])
      assert.equal(f.key(panelControl, key, options).defaultPrevented, true);
  for (const options of [{ ctrlKey: true }, { metaKey: true }])
    for (const key of ['d', 'D'])
      assert.equal(f.key(panelControl, key, options).defaultPrevented, true);
  assert.deepEqual(f.state.project, before);
  assert.deepEqual(f.state.view, view);
  assert.equal(f.state.selected, selected);
  assert.deepEqual([...selected], ['old-selection']);
  assert.deepEqual(f.calls, { checkpoints: 0, changes: 0, tools: 0 });
});

test('native fields in the scene panel retain their own arrows, deletion and modified shortcuts', (t) => {
  const f = fixture(t),
    before = structuredClone(f.state.project),
    input = f.target({ panel: true, native: true });
  for (const key of ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    assert.equal(f.key(input, key).defaultPrevented, false);
  for (const options of [{ ctrlKey: true }, { metaKey: true }])
    assert.equal(f.key(input, 'd', options).defaultPrevented, false);
  assert.deepEqual(f.state.project, before);
  assert.deepEqual(f.calls, { checkpoints: 0, changes: 0, tools: 0 });
});

test('canvas shortcuts still nudge and delete the selected component through the real command', (t) => {
  const f = fixture(t),
    canvas = f.target();
  assert.equal(f.key(canvas, 'ArrowRight').defaultPrevented, true);
  assert.equal(f.state.project.nodes[0].x, 60);
  assert.equal(f.calls.checkpoints, 1);
  assert.equal(f.calls.changes, 1);
  assert.equal(f.key(canvas, 'Delete').defaultPrevented, true);
  assert.deepEqual(
    f.state.project.nodes.map(({ id }) => id),
    ['scene'],
  );
  assert.equal(f.state.selected.size, 0);
  assert.equal(f.calls.checkpoints, 2);
  assert.equal(f.calls.changes, 2);
});

test('a focused momentary source also protects the old selection outside the scene panel', (t) => {
  const f = fixture(t),
    before = structuredClone(f.state.project),
    control = new EventTarget();
  control.closest = () => null;
  const dispose = bindMomentaryButton(control, {
    press: () => assert.fail('editing shortcuts must not press the source'),
    release: () => assert.fail('there was no physical press to release'),
  });
  t.after(dispose);
  for (const [key, options] of [
    ...['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((key) => [
      key,
      {},
    ]),
    ['d', { ctrlKey: true }],
    ['D', { metaKey: true }],
  ]) {
    const event = Object.assign(new Event('keydown', { bubbles: true, cancelable: true }), {
      key,
      ...options,
    });
    Object.defineProperty(event, 'target', { value: control });
    control.dispatchEvent(event);
    assert.equal(event.cancelBubble, true);
    if (!event.cancelBubble) f.document.dispatchEvent(event);
  }
  assert.deepEqual(f.state.project, before);
  assert.deepEqual([...f.state.selected], ['old-selection']);
  assert.deepEqual(f.calls, { checkpoints: 0, changes: 0, tools: 0 });
});
