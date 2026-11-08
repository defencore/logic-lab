import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommands } from '../../src/application/commands.js';
import { createSimulation } from '../../src/application/simulation.js';
import { createView } from '../../src/application/view.js';
import { createBoardController } from '../../src/workbench/board-controller.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createExample } from '../../examples/index.js';

function fixture(t, project) {
  const previous = globalThis.document;
  const document = new EventTarget(),
    elements = new Map(),
    cards = new Map(),
    events = [],
    history = [];
  const classes = () => ({ toggle() {}, remove() {}, add() {} });
  const element = () => ({
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    classList: classes(),
  });
  document.querySelector = (selector) => {
    const node = selector.match(/^\[data-node="([^"]+)"\]\.circuit-node$/)?.[1];
    if (node) return cards.get(node) || null;
    if (selector.startsWith('[data-wire=')) return null;
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  document.querySelectorAll = () => [];
  globalThis.document = document;
  t.after(() => {
    globalThis.document = previous;
  });
  const state = {
    project,
    runtime: createRuntime(),
    running: false,
    timeBase: 1,
    selected: new Set([project.nodes[0].id]),
    selectedWire: 'old-wire',
    pending: { node: 'old' },
    highlighted: new Set(['old']),
    lessonStep: 5,
    lessonOpen: false,
  };
  let rendered = project,
    closes = 0;
  function render() {
    rendered = state.project;
    cards.clear();
    for (const node of state.project.nodes) {
      const parts = new Map([
        ['.node-readout', element()],
        ['.scene-node-state', element()],
      ]);
      if (node.type === 'led') {
        const properties = new Map();
        parts.set('.led-bulb', {
          style: { setProperty: (key, value) => properties.set(key, value) },
          properties,
        });
        parts.set('.led-text', element());
      }
      if (node.type === 'hotkey') parts.set('.hotkey-widget', { classList: classes() });
      if (node.type === 'button')
        parts.set('[data-momentary]', {
          ...element(),
          setAttribute() {},
          querySelector: () => element(),
        });
      if (node.type === 'stepper') parts.set('.stepper-rotor', { style: {} });
      if (['position_sensor', 'limit_switch'].includes(node.type))
        for (const key of ['.sensor-light', '.sensor-status']) parts.set(key, element());
      cards.set(node.id, {
        dataset: {},
        querySelector: (selector) => parts.get(selector) || null,
        querySelectorAll: () => [],
      });
    }
    events.push(['render', state.project]);
  }
  const services = {
    classroom: { allowEdit: () => true, isPlaying: () => false, observeEdit() {} },
    monitor: { updateUi() {}, stopCapture() {}, draw() {} },
    inspector: { render() {}, updateSignals() {} },
    learning: { renderLesson() {}, updateGuideSignals() {}, updateLessonSignals() {} },
    dialogs: { close: () => closes++ },
  };
  const actions = {
    setWorkspaceView() {},
    cancelInteraction() {},
    cancelWire() {},
    fit() {},
    updateHistoryControls() {},
    persist() {},
    checkpoint: () => history.push(structuredClone(state.project)),
  };
  const context = { state, services, actions, t: (key) => key };
  const board = createBoardController(state, {
    t: context.t,
    title: (definition) => definition.label,
    applyView() {},
    primarySignal: () => 0,
  });
  services.board = {
    render,
    updateCounts() {},
    updateSignals() {
      events.push(['signals', state.project, rendered]);
      board.updateSignals();
    },
  };
  Object.assign(actions, createSimulation(context));
  Object.assign(actions, createView(context));
  const commands = createCommands(context);
  simulate(state.project, state.runtime, 0);
  render();
  return {
    state,
    commands,
    cards,
    events,
    history,
    services,
    elements,
    get closes() {
      return closes;
    },
  };
}

test('replacing the project renders same-ID components of a different type before the real signal updater or Run observes them', (t) => {
  const first = {
    version: 1,
    name: 'Source',
    nodes: [{ id: 'shared', type: 'switch', x: 0, y: 0, params: { value: 0 } }],
    wires: [],
  };
  const next = {
    version: 1,
    name: 'Indicator',
    nodes: [
      { id: 'shared', type: 'led', x: 200, y: 0, params: { color: '#ffaa00' } },
      { id: 'supply', type: 'vcc', x: 0, y: 0, params: {} },
    ],
    wires: [
      { id: 'light', from: { node: 'supply', port: 'out' }, to: { node: 'shared', port: 'in' } },
    ],
  };
  const f = fixture(t, first),
    previousRuntime = f.state.runtime;
  assert.doesNotThrow(() => f.commands.replaceProject(next));
  assert.equal(f.state.project, next);
  assert.notEqual(f.state.runtime, previousRuntime);
  assert.equal(f.state.runtime.inputs.shared.in, 1);
  const lamp = f.cards.get('shared').querySelector('.led-bulb');
  assert.equal(lamp.properties.get('--led-color'), '#ffaa00');
  assert.equal(lamp.className, 'led-bulb high');
  assert.equal(f.cards.get('shared').querySelector('.led-text').textContent, 'one');
  assert.equal(f.state.running, true);
  assert.equal(f.state.selected.size, 0);
  assert.equal(f.state.selectedWire, null);
  assert.equal(f.state.pending, null);
  assert.equal(f.state.highlighted.size, 0);
  assert.equal(f.state.lessonStep, 0);
  assert.equal(f.state.lessonOpen, true);
  assert.equal(f.elements.get('#project-name').value, 'Indicator');
  assert.equal(f.closes, 1);
  assert.deepEqual(f.history, [first]);
  for (const [kind, project, rendered] of f.events)
    if (kind === 'signals') assert.equal(rendered, project);
});

test('the real code-lock and elevator examples can replace each other despite reused IDs with different component types', (t) => {
  const lock = createExample('keypad-code-lock'),
    elevator = createExample('elevator-logic');
  const types = new Map(lock.nodes.map(({ id, type }) => [id, type]));
  assert.ok(elevator.nodes.some(({ id, type }) => types.has(id) && types.get(id) !== type));
  const f = fixture(t, lock);
  assert.doesNotThrow(() => f.commands.replaceProject(elevator));
  assert.doesNotThrow(() => f.commands.replaceProject(lock));
  assert.equal(f.state.project, lock);
  assert.equal(f.state.running, true);
  assert.equal(f.closes, 2);
  for (const [kind, project, rendered] of f.events)
    if (kind === 'signals') assert.equal(rendered, project);
});
