import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnections } from '../../src/application/connections.js';
import {
  activateContactKey,
  contactTarget,
  focusContact,
} from '../../src/workbench/contact-interaction.js';

const endpoint = (node, port, side) => ({ node, port, side });
const project = () => ({
  version: 1,
  name: 'Keyboard circuit',
  nodes: [
    { id: 'source', type: 'switch', params: { value: 1 }, x: 0, y: 0 },
    { id: 'lamp', type: 'led', params: {}, x: 300, y: 0 },
    { id: 'analog', type: 'dac', params: {}, x: 0, y: 200 },
  ],
  wires: [],
});
function pin(value) {
  const classes = new Set();
  return {
    dataset: { node: value.node, pin: value.port, side: value.side },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
    },
    setAttribute() {},
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 10, height: 10 }),
    focus() {
      this.focused = true;
    },
  };
}
function key(currentTarget, value, options = {}) {
  return {
    currentTarget,
    key: value,
    repeat: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
    ...options,
  };
}

test('contact highlighting follows actual compatibility, orientation and duplicate connection rules', () => {
  const circuit = project(),
    source = endpoint('source', 'out', 'out');
  assert.equal(contactTarget(circuit, source, source), 'selected');
  assert.equal(contactTarget(circuit, source, endpoint('lamp', 'in', 'in')), 'compatible');
  assert.equal(contactTarget(circuit, source, endpoint('analog', 'out', 'out')), 'incompatible');
  assert.equal(
    contactTarget(circuit, endpoint('analog', 'out', 'out'), endpoint('lamp', 'in', 'in')),
    'incompatible',
  );
  circuit.wires.push({
    id: 'existing',
    from: { node: 'source', port: 'out' },
    to: { node: 'lamp', port: 'in' },
  });
  assert.equal(contactTarget(circuit, source, endpoint('lamp', 'in', 'in')), 'incompatible');
  assert.equal(contactTarget(circuit, null, source), null);
});

test('Enter then Space uses the pointer transaction validation and creates one undoable wire', (t) => {
  const previous = globalThis.document;
  const output = pin(endpoint('source', 'out', 'out')),
    input = pin(endpoint('lamp', 'in', 'in'));
  const elements = new Map([
    ['#draft', { setAttribute() {} }],
    ['#canvas-tip', { textContent: '', innerHTML: '' }],
    ['#connection-status', { hidden: true, textContent: '' }],
  ]);
  globalThis.document = {
    querySelector: (selector) => elements.get(selector),
    querySelectorAll: (selector) => (selector === '.pin' ? [output, input] : []),
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  let checkpoints = 0,
    changes = 0;
  const state = { project: project(), pending: null };
  const actions = { checkpoint: () => checkpoints++, changed: () => changes++, notify() {} };
  const controller = createConnections({
    state,
    actions,
    services: { wiring: { pinPointerDown: () => false } },
    t: (value) => value,
  });
  Object.assign(actions, controller);
  const first = key(output, 'Enter');
  activateContactKey(first, controller.pinPointerDown);
  assert.equal(first.defaultPrevented, true);
  assert.equal(first.stopped, true);
  assert.equal(state.pending.node, 'source');
  assert.equal(checkpoints, 0, 'choosing an endpoint is only a preview');
  activateContactKey(key(input, ' '), controller.pinPointerDown);
  assert.equal(state.pending, null);
  assert.equal(state.project.wires.length, 1);
  assert.deepEqual(state.project.wires[0].from, { node: 'source', port: 'out' });
  assert.deepEqual(state.project.wires[0].to, { node: 'lamp', port: 'in' });
  assert.equal(checkpoints, 1);
  assert.equal(changes, 1);
  assert.equal(input.focused, true);
  activateContactKey(key(input, ' ', { repeat: true }), controller.pinPointerDown);
  assert.equal(state.project.wires.length, 1, 'held keys do not start a second transaction');
});

test('contact keyboard activation leaves ordinary keys and modified shortcuts untouched', () => {
  const target = pin(endpoint('source', 'out', 'out'));
  let activated = 0;
  for (const event of [
    key(target, 'a'),
    key(target, 'Enter', { ctrlKey: true }),
    key(target, ' ', { metaKey: true }),
  ]) {
    assert.equal(
      activateContactKey(event, () => activated++),
      false,
    );
    assert.equal(event.defaultPrevented, undefined);
  }
  assert.equal(activated, 0);
});

test('focus restoration identifies the replacement contact after a board render', () => {
  const replacement = pin(endpoint('lamp', 'in', 'in'));
  assert.equal(
    focusContact(endpoint('lamp', 'in', 'in'), { querySelectorAll: () => [replacement] }),
    true,
  );
  assert.equal(replacement.focused, true);
  assert.equal(
    focusContact(endpoint('removed', 'out', 'out'), { querySelectorAll: () => [replacement] }),
    false,
  );
});
