import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionControls } from '../../src/classroom/action-controls.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import { node } from '../assessment/fixtures/lab-assessment.js';

function fixture(t, { many = false, assignment = null, example = null } = {}) {
  const previous = globalThis.document;
  const project = {
    version: 1,
    name: 'Record selected signals',
    wires: [],
    nodes: many
      ? Array.from({ length: 33 }, (_, i) => node(`source${i}`, 'switch'))
      : [node('source', 'switch'), node('memory', 'd_ff'), node('lamp', 'led')],
  };
  const original = finishSequence(createSequence(project), 2);
  appendAction(original, { at: 1, node: project.nodes[0].id, key: 'value', value: 1 });
  let runtime = createRuntime(),
    resets = 0,
    closed = 0,
    running = false,
    markup = '';
  simulate(project, runtime, 0);
  runtime.time = 3.25;
  let inputs = [];
  const elements = new Map();
  const notifications = [];
  globalThis.document = {
    querySelector: (selector) => elements.get(selector),
    querySelectorAll: (selector) =>
      selector === '[data-recording-probe]:checked'
        ? inputs.filter((input) => input.checked)
        : selector === '[data-recording-probe]'
          ? inputs
          : [],
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  const adapter = {
    getProject: () => project,
    getRuntime: () => runtime,
    getLanguage: () => 'en',
    getExample: () => example,
    resetForSequence() {
      resets++;
      runtime = createRuntime();
      simulate(project, runtime, 0);
    },
    setRunning: (value) => {
      running = value;
    },
    closeModal: () => closed++,
    notify: (message) => notifications.push(message),
    showModal(html) {
      markup = html;
      inputs = [...html.matchAll(/<input[^>]+data-recording-probe="([0-9]+)"([^>]*)>/g)].map(
        (match) => ({
          dataset: { recordingProbe: match[1] },
          checked: /\bchecked\b/.test(match[2]),
        }),
      );
      for (const id of [
        'recording-cancel',
        'recording-begin',
        'recording-probe-count',
        'recording-probe-feedback',
      ])
        elements.set('#' + id, { disabled: false, textContent: '' });
    },
  };
  const session = createActionSession(adapter, { sequence: original });
  const state = Object.assign(session.state, { assignment, busy: false });
  const controls = createActionControls({
    adapter,
    state,
    session,
    L: (_, en) => en,
    guardIdle: () => {
      if (state.busy) throw Error('Wait for the current operation.');
    },
  });
  return {
    project,
    state,
    controls,
    original,
    notifications,
    get inputs() {
      return inputs;
    },
    get runtime() {
      return runtime;
    },
    get resets() {
      return resets;
    },
    get closed() {
      return closed;
    },
    get running() {
      return running;
    },
    get markup() {
      return markup;
    },
    element: (id) => elements.get('#' + id),
  };
}

test('recording chooser recommends assignment outputs and records the exact confirmed signals', (t) => {
  const probes = [
    { node: 'memory', port: 'nq', side: 'outputs' },
    { node: 'lamp', port: 'in', side: 'inputs' },
  ];
  const f = fixture(t, { assignment: { probes } });
  const previousRuntime = f.runtime;
  f.controls.startRecording();
  assert.equal(f.inputs.length, 4, 'both memory outputs and the source remain available');
  assert.deepEqual(
    f.inputs.map((input) => input.checked),
    [false, false, true, true],
  );
  assert.match(f.markup, /assignment\)/);
  assert.match(f.element('recording-probe-count').textContent, /2\/32/);
  assert.equal(f.state.sequence, f.original);
  assert.equal(f.resets, 0);
  f.element('recording-begin').onclick();
  assert.deepEqual(f.state.sequence.probes, probes);
  assert.equal(f.state.recording, true);
  assert.equal(f.resets, 1);
  assert.notEqual(f.runtime, previousRuntime);
  assert.equal(f.running, true);
  assert.equal(f.closed, 1);
});

test('cancel leaves the previous recording, runtime and source values untouched', (t) => {
  const f = fixture(t);
  const previousRuntime = f.runtime,
    previousProject = structuredClone(f.project);
  const previousState = structuredClone(f.state);
  f.controls.startRecording();
  f.inputs.forEach((input) => {
    input.checked = false;
  });
  f.inputs[0].onchange();
  f.element('recording-cancel').onclick();
  assert.equal(f.closed, 1);
  assert.equal(f.state.sequence, f.original);
  assert.equal(f.runtime, previousRuntime);
  assert.deepEqual(f.project, previousProject);
  assert.deepEqual(f.state, previousState);
  assert.equal(f.resets, 0);
});

test('the chooser enforces 1–32 signals and rejects an invalid confirmation before resetting anything', (t) => {
  const f = fixture(t, { many: true });
  const previousRuntime = f.runtime;
  f.controls.startRecording();
  assert.equal(f.inputs.filter((input) => input.checked).length, 32);
  f.inputs[32].checked = true;
  f.inputs[32].onchange();
  assert.equal(f.inputs[32].checked, false, '33rd change is rolled back before confirmation');
  assert.equal(f.element('recording-begin').disabled, false);
  assert.match(f.element('recording-probe-count').textContent, /32\/32/);
  assert.match(f.element('recording-probe-feedback').textContent, /at most 32/);
  f.inputs.forEach((input) => {
    input.checked = false;
  });
  f.inputs[0].onchange();
  assert.equal(f.element('recording-begin').disabled, true);
  f.element('recording-begin').onclick();
  assert.equal(f.state.sequence, f.original);
  assert.equal(f.runtime, previousRuntime);
  assert.equal(f.resets, 0);
  f.inputs[32].checked = true;
  f.inputs[32].onchange();
  assert.equal(f.element('recording-begin').disabled, false);
  f.element('recording-begin').onclick();
  assert.deepEqual(f.state.sequence.probes, [{ node: 'source32', port: 'out', side: 'outputs' }]);
  assert.equal(f.resets, 1);
});

test('an operation that becomes busy after opening the chooser cannot start or reset a recording', (t) => {
  const f = fixture(t);
  f.controls.startRecording();
  f.state.busy = true;
  f.element('recording-begin').onclick();
  assert.equal(f.state.sequence, f.original);
  assert.equal(f.resets, 0);
  assert.equal(f.closed, 0);
  assert.match(f.notifications.at(-1), /Wait/);
});

test('without an assignment the learning example recommends its chosen signals; assignments take precedence', (t) => {
  const f = fixture(t, {
    example: { actionProbes: [{ node: 'lamp', port: 'in', side: 'inputs' }] },
  });
  f.controls.startRecording();
  assert.deepEqual(
    f.inputs.map((input) => input.checked),
    [false, false, false, true],
  );
  f.element('recording-begin').onclick();
  assert.deepEqual(f.state.sequence.probes, [{ node: 'lamp', port: 'in', side: 'inputs' }]);
});

test('missing assignment outputs are shown explicitly and cannot reset the current recording', (t) => {
  const f = fixture(t, {
    assignment: { probes: [{ node: 'removed', port: 'in', side: 'inputs' }] },
  });
  const originalRuntime = f.runtime;
  f.controls.startRecording();
  assert.match(f.markup, /\(missing\)/);
  assert.equal(f.inputs.at(-1).checked, true);
  assert.equal(
    f.inputs.slice(0, -1).some((item) => item.checked),
    false,
  );
  f.element('recording-begin').onclick();
  assert.match(f.notifications.at(-1), /Restore missing contacts/);
  assert.equal(f.state.sequence, f.original);
  assert.equal(f.runtime, originalRuntime);
  assert.equal(f.resets, 0);
});
