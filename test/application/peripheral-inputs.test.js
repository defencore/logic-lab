import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommands } from '../../src/application/commands.js';
import { createMomentaryController } from '../../src/application/momentary-controller.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import {
  createSequence,
  parseSequence,
  serializeSequence,
  replaySequence,
} from '../../src/experiments/actions.js';
import {
  bindPeripheralInput,
  updatePeripheralInput,
  peripheralInputMarkup,
} from '../../src/workbench/peripheral-input-nodes.js';

const node = (id, type, params = {}) => ({ id, type, params, enabled: true, x: 0, y: 0 });
const wire = (id, from, to) => ({
  id,
  from: { node: from, port: 'out' },
  to: { node: to, port: 'in' },
});

function fixture(t, nodes, wires) {
  const prior = { document: globalThis.document, window: globalThis.window };
  const cleanups = [];
  globalThis.document = new EventTarget();
  globalThis.window = new EventTarget();
  t.after(() => {
    cleanups.reverse().forEach((dispose) => dispose());
    globalThis.document = prior.document;
    globalThis.window = prior.window;
  });
  const state = {
    project: { version: 1, name: 'Peripheral experiment', nodes, wires },
    runtime: createRuntime(),
  };
  const checkpoints = [];
  const actions = {
    checkpoint: () => checkpoints.push(structuredClone(state.project)),
    updateSignals() {},
    persist() {},
  };
  const services = {};
  const commands = createCommands({ state, services, actions, t: (key) => key });
  simulate(state.project, state.runtime, 0);
  return {
    state,
    actions,
    services,
    commands,
    checkpoints,
    cleanup: (dispose) => cleanups.push(dispose),
  };
}

function control() {
  const element = new EventTarget(),
    attributes = new Map();
  return Object.assign(element, {
    attributes,
    setAttribute: (key, value) => attributes.set(key, value),
    focus: () => {
      document.activeElement = element;
    },
    setPointerCapture() {},
    disabled: false,
  });
}
const pointer = (type) =>
  Object.assign(new Event(type, { cancelable: true }), {
    button: 0,
    pointerId: 5,
    isPrimary: true,
  });

test('the actual contact control holds only while pressed or retains its position when latched', (t) => {
  const contact = node('contact', 'contact_switch', { mode: 'momentary', value: 0 });
  const f = fixture(
    t,
    [contact, node('ground', 'gnd'), node('pull', 'pullup'), node('lamp', 'led')],
    [
      wire('ground', 'ground', 'contact'),
      wire('contact', 'contact', 'lamp'),
      wire('pull', 'pull', 'lamp'),
    ],
  );
  const button = control(),
    status = { textContent: '' };
  const root = {
    querySelector: (selector) => (selector === '[data-contact-control]' ? button : status),
  };
  f.actions.updateSignals = () =>
    updatePeripheralInput(root, contact, f.state.runtime, false, 'en');
  const momentary = createMomentaryController({
    getProject: () => f.state.project,
    canPress: () => true,
    canWrite: () => true,
    writeValue(node, value) {
      node.params.value = value;
      simulate(f.state.project, f.state.runtime, 0);
      f.actions.updateSignals();
    },
  });
  f.services.buttons = momentary;
  f.cleanup(momentary.dispose);
  let unbind = bindPeripheralInput(root, contact, f.commands);
  f.cleanup(() => unbind());
  f.actions.updateSignals();
  assert.equal(status.textContent, 'Open');
  button.dispatchEvent(pointer('pointerdown'));
  assert.equal(f.state.runtime.inputs.lamp.in, 0);
  assert.equal(status.textContent, 'Closed');
  assert.equal(button.attributes.get('aria-pressed'), 'true');
  window.dispatchEvent(pointer('pointerup'));
  assert.equal(f.state.runtime.inputs.lamp.in, 1);
  assert.equal(status.textContent, 'Open');
  unbind();
  contact.params.mode = 'toggle';
  unbind = bindPeripheralInput(root, contact, f.commands);
  button.dispatchEvent(pointer('pointerdown'));
  button.dispatchEvent(pointer('pointerup'));
  assert.equal(f.state.runtime.inputs.lamp.in, 0);
  assert.equal(status.textContent, 'Closed');
  assert.equal(document.activeElement, button);
  button.dispatchEvent(pointer('pointerdown'));
  button.dispatchEvent(pointer('pointerup'));
  assert.equal(f.state.runtime.inputs.lamp.in, 1);
  assert.equal(status.textContent, 'Open');
  assert.equal(f.checkpoints.length, 2);
});

test('live slider edits retain focus and record exact fractional voltages for ADC replay', (t) => {
  const knob = node('knob', 'potentiometer', { value: 2.5 });
  const f = fixture(t, [knob, node('adc', 'adc')], [wire('measure', 'knob', 'adc')]);
  const slider = control(),
    output = { textContent: '' };
  const root = {
    querySelector: (selector) => (selector === '[data-potentiometer-control]' ? slider : output),
  };
  const session = createActionSession({
    getProject: () => f.state.project,
    getRuntime: () => f.state.runtime,
    resetForSequence() {
      f.state.runtime = simulate(f.state.project, createRuntime(), 0);
    },
    setRunning() {},
    adoptPlayback(project, runtime) {
      f.state.project = project;
      f.state.runtime = runtime;
    },
    refreshPlayback() {},
  });
  const allowInput = () => !session.isLocked() || session.state.recording;
  f.services.classroom = { allowInput, inputChanged: session.inputChanged };
  f.actions.updateSignals = () =>
    updatePeripheralInput(root, f.state.project.nodes[0], f.state.runtime, !allowInput(), 'ua');
  f.cleanup(bindPeripheralInput(root, knob, f.commands));
  f.actions.updateSignals();
  assert.equal(slider.value, '2.5');
  assert.match(peripheralInputMarkup(knob, 'ua'), /type="range"[^>]+min="0" max="5" step="any"/);
  session.startRecording({ probes: [{ node: 'adc', port: 'out', side: 'outputs' }] });
  slider.focus();
  for (const voltage of [0.1375, 2.71828]) {
    slider.value = String(voltage);
    slider.dispatchEvent(new Event('input'));
    simulate(f.state.project, f.state.runtime, 0.05);
    assert.equal(document.activeElement, slider);
    assert.equal(f.state.runtime.inputs.adc.in, voltage);
  }
  assert.equal(output.textContent, '2.718 V');
  assert.equal(f.checkpoints.length, 1, 'a continuous drag has one undo checkpoint');
  slider.dispatchEvent(new Event('change'));
  slider.value = '3.2';
  slider.dispatchEvent(new Event('input'));
  assert.equal(f.checkpoints.length, 2);
  session.stopRecording();
  const recorded = parseSequence(serializeSequence(session.state.sequence));
  assert.deepEqual(
    recorded.actions.map(({ value }) => value),
    [0.1375, 2.71828, 3.2],
  );
  assert.deepEqual(
    replaySequence(recorded).observations.map(({ values }) => values),
    [[128], [7], [139], [163]],
  );
  session.replay();
  f.actions.updateSignals();
  assert.equal(slider.disabled, true);
  assert.equal(f.commands.setPotentiometer('knob', 5), false);
  assert.equal(f.state.project.nodes[0].params.value, 2.5);
});

test('opening a live circuit releases saved holds before the first clock edge and preserves recorded baselines', (t) => {
  const f = fixture(t, [], []);
  Object.assign(f.state, { selected: new Set(), highlighted: new Set() });
  Object.assign(f.actions, {
    setWorkspaceView() {},
    cancelInteraction() {},
    cancelWire() {},
    fit() {},
    newRuntime: createRuntime,
    changed: () => simulate(f.state.project, f.state.runtime, 0),
    setRunning: (running) => {
      f.state.running = running;
    },
  });
  f.services.learning = { renderLesson() {} };
  f.services.dialogs = { close() {} };
  document.querySelector = () => ({ value: '' });
  const initial = {
    version: 1,
    name: 'Saved physical contact',
    nodes: [
      node('hold', 'contact_switch', { mode: 'momentary', value: 1 }),
      node('latch', 'contact_switch', { mode: 'toggle', value: 1 }),
      node('power', 'vcc'),
      node('pull', 'pulldown'),
      node('count', 'counter'),
    ],
    wires: [
      wire('power', 'power', 'hold'),
      ...['hold', 'pull'].map((id) => ({
        id,
        from: { node: id, port: 'out' },
        to: { node: 'count', port: 'clk' },
      })),
    ],
  };
  f.commands.replaceProject(initial);
  assert.equal(f.state.runtime.inputs.count.clk, 0);
  assert.equal(f.state.runtime.state.count.q, 0, 'no saved hold is simulated as a new press');
  assert.equal(f.state.project.nodes[0].params.value, 0);
  assert.equal(f.state.project.nodes[1].params.value, 1);
  assert.equal(initial.nodes[0].params.value, 1);
  const recorded = createSequence(initial, {
    probes: [{ node: 'count', port: 'out', side: 'outputs' }],
  });
  const playback = replaySequence(recorded);
  assert.equal(playback.project.nodes[0].params.value, 1);
  assert.equal(playback.runtime.state.count.q, 1, 'replay retains its actual baseline');
});
