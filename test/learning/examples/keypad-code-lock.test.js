import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { KEYPAD_KEYS } from '../../../src/components/keypad.js';
import { validateProject, parseProject, serializeProject } from '../../../src/circuits/project.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  parseSequence,
  serializeSequence,
  replaySequence,
} from '../../../src/experiments/actions.js';

const mask = (label) => KEYPAD_KEYS.find((key) => key.label === label).mask;
const output = (context, id, port = 'out') => context.runtime.signals.outputs[id][port];
function open() {
  const project = createExample('keypad-code-lock'),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}
function advance(context, duration) {
  const count = Math.ceil(duration / 0.0005);
  for (let index = 0; index < count; index++) {
    simulate(context.project, context.runtime, duration / count);
    assert.deepEqual(context.runtime.diagnostics, []);
  }
}
function setKeys(context, keys) {
  context.project.nodes.find(({ id }) => id === 'keypad').params.keys = keys;
  simulate(context.project, context.runtime, 0);
}
function press(context, label, held = 0.05) {
  setKeys(context, mask(label));
  advance(context, held);
  setKeys(context, 0);
  advance(context, 0.02);
}
function enter(context, text) {
  for (const key of text) press(context, key);
}

test('the lock exposes real matrix wiring, an external key-map ROM and a separate editable secret', () => {
  const context = open(),
    { project } = context;
  assert.deepEqual(validateProject(project), project);
  assert.deepEqual(parseProject(serializeProject(project)), project);
  assert.ok(project.nodes.length <= 200);
  const keypad = project.nodes.find(({ id }) => id === 'keypad');
  assert.deepEqual(keypad.params, { mode: 'hold', keys: 0 });
  for (const row of [0, 1, 2, 3]) {
    const wire = project.wires.find(({ to }) => to.node === 'keypad' && to.port === `row${row}`);
    assert.equal(wire.from.node, `row${row}`);
    assert.equal(wire.width, 1);
  }
  assert.equal(
    project.nodes
      .find(({ id }) => id === 'secret')
      .params.data.split(',')
      .slice(0, 4)
      .join(''),
    '2580',
  );
  assert.equal(
    project.nodes.find(({ id }) => id === 'key-map').params.data,
    '1,2,3,255,4,5,6,255,7,8,9,255,10,0,11,255',
  );
  for (const key of KEYPAD_KEYS) {
    const trial = open();
    setKeys(trial, key.mask);
    advance(trial, 0.04);
    const expected = key.label === '*' ? 10 : key.label === '#' ? 11 : Number(key.label);
    assert.equal(output(trial, 'key-map'), expected, key.label);
    assert.equal(output(trial, 'scan') & 3, key.row);
    assert.equal(output(trial, 'valid'), 1);
  }
});

test('four correct captured comparisons progress once per released key and require # to unlock', () => {
  const context = open();
  for (const [index, key] of [...'2580'].entries()) {
    press(context, key);
    assert.equal(output(context, 'progress'), index + 1);
    assert.equal(output(context, 'last-key'), Number(key));
    assert.equal(output(context, 'unlocked', 'q'), 0);
    assert.equal(output(context, 'alarm', 'q'), 0);
  }
  assert.equal(context.runtime.inputs.ready.in, 1);
  press(context, '#');
  assert.equal(output(context, 'unlocked', 'q'), 1);
  assert.equal(output(context, 'alarm', 'q'), 0);
  assert.equal(output(context, 'progress'), 4);
  press(context, '*');
  assert.equal(output(context, 'progress'), 0);
  assert.equal(output(context, 'unlocked', 'q'), 0);
  assert.equal(output(context, 'alarm', 'q'), 0);
  assert.equal(output(context, 'last-key'), 0);
});

test('holding a key across many scan periods creates one event and release permits a new independent press', () => {
  const context = open();
  setKeys(context, mask('2'));
  advance(context, 0.04);
  const row = output(context, 'scan');
  advance(context, 0.3);
  assert.equal(output(context, 'scan'), row);
  assert.equal(output(context, 'progress'), 1);
  assert.equal(output(context, 'alarm', 'q'), 0);
  setKeys(context, 0);
  advance(context, 0.02);
  press(context, '2');
  assert.equal(output(context, 'progress'), 0, 'A second2 is wrong when SECRET expects5.');
  assert.equal(output(context, 'alarm', 'q'), 1);
});

test('wrong digits, early confirmation, extra digits and conflicting columns all reject without unlocking', () => {
  for (const attempt of ['29', '25#', '25800']) {
    const context = open();
    enter(context, attempt);
    assert.equal(output(context, 'progress'), 0, attempt);
    assert.equal(output(context, 'unlocked', 'q'), 0, attempt);
    assert.equal(output(context, 'alarm', 'q'), 1, attempt);
    press(context, '*');
    assert.equal(output(context, 'alarm', 'q'), 0);
  }
  const chord = open();
  setKeys(chord, mask('1') | mask('2'));
  advance(chord, 0.04);
  assert.equal(output(chord, 'multi'), 1);
  assert.equal(output(chord, 'valid'), 0);
  assert.equal(output(chord, 'progress'), 0);
  assert.equal(output(chord, 'alarm', 'q'), 1);
});

test('editing SECRET changes the accepted code while preserving the physical keyboard map', () => {
  const context = open();
  const map = context.project.nodes.find(({ id }) => id === 'key-map').params.data;
  context.project.nodes.find(({ id }) => id === 'secret').params.data =
    '1,3,7,9,0,0,0,0,0,0,0,0,0,0,0,0';
  enter(context, '1379#');
  assert.equal(output(context, 'unlocked', 'q'), 1);
  press(context, '*');
  enter(context, '2580#');
  assert.equal(output(context, 'unlocked', 'q'), 0);
  assert.equal(output(context, 'alarm', 'q'), 1);
  assert.equal(context.project.nodes.find(({ id }) => id === 'key-map').params.data, map);
});

test('the recorded matrix masks replay a correct attempt with independent source releases and unchanged initial memory', () => {
  const example = EXAMPLES.find(({ id }) => id === 'keypad-code-lock');
  const sequence = createSequence(example.create(), { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, 1.4);
  const initial = structuredClone(sequence.initialProject);
  const result = replaySequence(parseSequence(serializeSequence(sequence)));
  assert.equal(result.done, true);
  assert.equal(sequence.actions.length, 10);
  assert.equal(result.runtime.signals.outputs.progress.out, 4);
  assert.equal(result.runtime.outputs.unlocked.q, 1);
  assert.equal(result.runtime.outputs.alarm.q, 0);
  assert.equal(result.project.nodes.find(({ id }) => id === 'keypad').params.keys, 0);
  assert.deepEqual(result.runtime.diagnostics, []);
  assert.deepEqual(sequence.initialProject, initial);
});
