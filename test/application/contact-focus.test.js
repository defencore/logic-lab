import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnections } from '../../src/application/connections.js';
import { createContactNavigation, focusContact } from '../../src/workbench/contact-interaction.js';

function fixture(t) {
  const previous = globalThis.document;
  const initialView = { x: -84.8, y: -23.64, zoom: 0.58 };
  const state = {
    view: { ...initialView },
    project: {
      version: 1,
      name: 'Contact focus',
      nodes: [
        { id: 'source', type: 'switch', params: { value: 0 }, x: 0, y: 0 },
        { id: 'lamp', type: 'led', params: {}, x: 300, y: 0 },
      ],
      wires: [],
    },
    pending: null,
  };
  const root = new EventTarget();
  root.activeElement = null;
  let pins = [];
  const elements = new Map([
    ['#viewport', { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) }],
    ['#draft', { setAttribute() {} }],
    ['#canvas-tip', { textContent: '', innerHTML: '' }],
    ['#connection-status', { hidden: true, textContent: '' }],
  ]);
  root.querySelector = (selector) => elements.get(selector);
  root.querySelectorAll = (selector) => (selector === '.pin' ? pins : []);
  globalThis.document = root;
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  let viewUpdates = 0,
    checkpoints = 0;
  const navigation = createContactNavigation(state, () => viewUpdates++, root);
  const actions = {
    checkpoint: () => checkpoints++,
    changed: () => {
      const focused = root.activeElement?.dataset;
      renderPins();
      if (focused)
        focusContact({ node: focused.node, port: focused.pin, side: focused.side }, root);
    },
    notify() {},
  };
  const connections = createConnections({
    state,
    actions,
    services: { wiring: { pinPointerDown: () => false } },
    t: (value) => value,
  });
  Object.assign(actions, connections);
  function makePin(node, port, side, x) {
    const pin = new EventTarget();
    pin.dataset = { node, pin: port, side };
    pin.classList = { add() {}, remove() {}, toggle() {} };
    pin.setAttribute = () => {};
    pin.querySelector = () => null;
    pin.getBoundingClientRect = () => ({
      left: x * state.view.zoom + state.view.x - 5,
      top: 58 * state.view.zoom + state.view.y - 5,
      width: 10,
      height: 10,
    });
    pin.focus = () => {
      if (root.activeElement === pin) return;
      root.activeElement = pin;
      pin.dispatchEvent(new Event('focus'));
    };
    navigation.bind(pin, connections.pinPointerDown);
    return pin;
  }
  function renderPins() {
    pins = [makePin('source', 'out', 'out', 160), makePin('lamp', 'in', 'in', 300)];
  }
  function dispatch(type, pin, properties) {
    root.dispatchEvent(Object.assign(new Event(type), properties));
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    pin.dispatchEvent(event);
    return event;
  }
  renderPins();
  return {
    state,
    root,
    initialView,
    connections,
    get output() {
      return pins[0];
    },
    get input() {
      return pins[1];
    },
    get viewUpdates() {
      return viewUpdates;
    },
    get checkpoints() {
      return checkpoints;
    },
    pointer: (pin) => dispatch('pointerdown', pin, { button: 0, clientX: 8, clientY: 10 }),
    key: (pin, key, options = {}) => dispatch('keydown', pin, { key, ...options }),
    tab(pin) {
      root.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Tab' }));
      pin.focus();
    },
  };
}

test('mouse contact selection and wire completion keep 58% zoom and pan, including focus restoration', (t) => {
  const f = fixture(t);
  f.pointer(f.output);
  assert.equal(f.state.pending.node, 'source');
  assert.deepEqual(f.state.view, f.initialView);
  f.pointer(f.input);
  assert.equal(f.state.pending, null);
  assert.equal(f.state.project.wires.length, 1);
  assert.equal(f.checkpoints, 1);
  assert.equal(f.root.activeElement, f.input, 'the replacement endpoint retains focus');
  assert.deepEqual(f.state.view, f.initialView);
  assert.equal(f.viewUpdates, 0);
});

test('Tab reveals a contact at 85% and Enter/Space still complete one validated undoable wire', (t) => {
  const f = fixture(t);
  f.tab(f.output);
  assert.equal(f.state.view.zoom, 0.85);
  assert.ok(f.viewUpdates > 0);
  assert.equal(f.state.pending, null, 'focus alone does not begin wiring');
  f.key(f.output, 'Enter');
  f.tab(f.input);
  f.key(f.input, ' ');
  assert.equal(f.state.project.wires.length, 1);
  assert.equal(f.checkpoints, 1);
  assert.equal(f.state.pending, null);
  assert.equal(f.root.activeElement, f.input);
  assert.equal(f.state.view.zoom, 0.85);
  f.key(f.input, ' ', { repeat: true });
  assert.equal(f.state.pending, null);
  assert.equal(f.checkpoints, 1);
});

test('Enter after mouse focus reveals before capturing endpoint coordinates; modified and held keys do not', (t) => {
  const f = fixture(t);
  f.pointer(f.output);
  f.connections.cancelWire();
  f.key(f.output, 'Enter', { ctrlKey: true });
  f.key(f.output, 'Enter', { isComposing: true });
  f.key(f.output, 'Enter', { repeat: true });
  assert.deepEqual(f.state.view, f.initialView);
  assert.equal(f.state.pending, null);
  f.key(f.output, 'Enter');
  assert.equal(f.state.view.zoom, 0.85);
  const bounds = f.output.getBoundingClientRect();
  assert.equal(f.state.pending.startX, bounds.left + bounds.width / 2);
  assert.equal(f.state.pending.startY, bounds.top + bounds.height / 2);
  assert.equal(f.checkpoints, 0);
});

test('a later pointer interaction cancels keyboard reveal for programmatic endpoint focus', (t) => {
  const f = fixture(t);
  f.tab(f.output);
  f.state.view = { ...f.initialView };
  f.root.dispatchEvent(new Event('pointerdown'));
  f.input.focus();
  assert.deepEqual(f.state.view, f.initialView);
});
