import test from 'node:test';
import assert from 'node:assert/strict';
import { bindApplicationEvents } from '../../src/application/events.js';
import { createCommands } from '../../src/application/commands.js';
import { createConnections } from '../../src/application/connections.js';
import { createContactNavigation } from '../../src/workbench/contact-interaction.js';

/** Native Event flags determine whether a control's event reaches document shortcuts. */
class Control extends EventTarget {
  constructor(root, kind = '') {
    super();
    this.root = root;
    this.kind = kind;
  }
  dispatchEvent(event) {
    const result = super.dispatchEvent(event);
    if (event.bubbles && !event.cancelBubble) this.root.dispatchEvent(event);
    return result;
  }
  closest(selector) {
    if (this.kind === 'pin' && ['.pin', 'button,a,summary'].includes(selector)) return this;
    if (this.kind === 'input' && selector === 'input,textarea,select,[contenteditable]')
      return this;
    return null;
  }
}

function fixture(t) {
  const previousDocument = globalThis.document,
    previousWindow = globalThis.window;
  const root = new EventTarget();
  const classes = () => ({ add() {}, remove() {}, toggle() {}, contains: () => false });
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) {
      const value = new Control(root);
      Object.assign(value, { open: false, classList: classes(), setAttribute() {}, focus() {} });
      elements.set(selector, value);
    }
    return elements.get(selector);
  }
  element('#viewport').getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  root.querySelector = element;
  const state = {
    project: {
      version: 1,
      name: 'Selected A, focused contact B',
      nodes: [
        { id: 'a', type: 'switch', x: 40, y: 40, params: { value: 0 } },
        { id: 'b', type: 'led', x: 300, y: 40, params: {} },
      ],
      wires: [],
    },
    selected: new Set(['a']),
    selectedWire: null,
    pending: null,
    view: { x: 0, y: 0, zoom: 0.58 },
    tool: 'select',
    spaceHeld: false,
    shiftHeld: false,
    compactLayout: new EventTarget(),
    undoStack: [],
  };
  globalThis.document = root;
  globalThis.window = new EventTarget();
  t.after(() => {
    if (previousDocument) globalThis.document = previousDocument;
    else delete globalThis.document;
    if (previousWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
  });
  let checkpoints = 0,
    documentKeys = 0,
    undo = 0;
  const actions = {
    onPointerMove() {},
    onPointerUp() {},
    cancelGesture() {},
    persist() {},
    updateTool() {},
    setToolsOpen() {},
    notify() {},
    applyView() {},
    changed() {},
    checkpoint: () => checkpoints++,
    undo: () => undo++,
  };
  const services = {
    dialogs: { isOpen: () => false, handleKey: () => false },
    wiring: { keyDown: () => false, pinPointerDown: () => false },
    classroom: { allowEdit: () => true },
  };
  Object.assign(actions, createCommands({ state, services, actions, t: (value) => value }));
  const connections = createConnections({ state, services, actions, t: (value) => value });
  Object.assign(actions, connections, { cancelInteraction: connections.cancelWire });
  const navigation = createContactNavigation(state, actions.applyView, root);
  function pin(node, port, side) {
    const value = new Control(root, 'pin');
    Object.assign(value, {
      dataset: { node, pin: port, side },
      classList: classes(),
      setAttribute() {},
      querySelector: () => null,
      getBoundingClientRect: () => ({ left: 100, top: 100, width: 10, height: 10 }),
      focus() {
        root.activeElement = value;
        value.dispatchEvent(new Event('focus'));
      },
    });
    navigation.bind(value, connections.pinPointerDown);
    return value;
  }
  const output = pin('a', 'out', 'out'),
    input = pin('b', 'in', 'in');
  root.querySelectorAll = (selector) => (selector === '.pin' ? [output, input] : []);
  bindApplicationEvents({ state, services, actions, t: (value) => value });
  root.addEventListener('keydown', () => documentKeys++);
  function key(target, key, options = {}) {
    const event = Object.assign(new Event('keydown', { bubbles: true, cancelable: true }), {
      key,
      ...options,
    });
    Object.defineProperty(event, 'target', { value: target });
    target.dispatchEvent(event);
    return event;
  }
  return {
    state,
    root,
    input,
    output,
    key,
    canvas: element('#viewport'),
    nativeInput: new Control(root, 'input'),
    get checkpoints() {
      return checkpoints;
    },
    get documentKeys() {
      return documentKeys;
    },
    get undo() {
      return undo;
    },
  };
}

test('focused contact editing keys stop before real document shortcuts can modify a different selection', (t) => {
  const f = fixture(t),
    before = structuredClone(f.state.project),
    view = { ...f.state.view };
  f.input.focus();
  const selected = f.state.selected;
  for (const key of ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    for (const options of [{}, { shiftKey: true }, { repeat: true }]) {
      const event = f.key(f.input, key, options);
      assert.equal(event.defaultPrevented, true);
      assert.equal(event.cancelBubble, true);
    }
  for (const options of [{ ctrlKey: true }, { metaKey: true }]) f.key(f.input, 'd', options);
  assert.equal(f.documentKeys, 0);
  assert.deepEqual(f.state.project, before);
  assert.equal(f.state.selected, selected);
  assert.deepEqual([...f.state.selected], ['a']);
  assert.deepEqual(f.state.view, view);
  assert.equal(f.state.pending, null);
  assert.equal(f.checkpoints, 0);
  f.key(f.canvas, 'ArrowRight');
  assert.equal(
    f.state.project.nodes[0].x,
    before.nodes[0].x + 20,
    'the real canvas shortcut still works',
  );
  assert.equal(f.checkpoints, 1);
});

test('contact Tab, Escape, Undo and activation retain their contextual document behavior', (t) => {
  const f = fixture(t);
  assert.equal(f.key(f.input, 'Tab').defaultPrevented, false);
  assert.equal(f.documentKeys, 1);
  f.key(f.output, 'Enter');
  assert.equal(f.state.pending.node, 'a');
  f.key(f.input, 'Delete');
  assert.equal(f.state.pending.node, 'a', 'selection keys do not disturb the pending connection');
  f.key(f.input, 'Escape');
  assert.equal(f.state.pending, null);
  assert.equal(f.root.activeElement, f.output);
  f.key(f.input, 'z', { ctrlKey: true });
  assert.equal(f.undo, 1);
  f.key(f.output, 'Enter');
  f.key(f.input, ' ');
  assert.equal(f.state.project.wires.length, 1);
  assert.equal(f.checkpoints, 1);
  assert.deepEqual([...f.state.selected], ['a']);
});

test('native text inputs retain Delete, Backspace and arrow defaults without editing the selected circuit node', (t) => {
  const f = fixture(t),
    before = structuredClone(f.state.project);
  for (const key of ['Delete', 'Backspace', 'ArrowLeft', 'ArrowRight'])
    assert.equal(f.key(f.nativeInput, key).defaultPrevented, false);
  assert.deepEqual(f.state.project, before);
  assert.equal(f.checkpoints, 0);
});
