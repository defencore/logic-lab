import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { validateProject, parseProject, serializeProject } from '../../../src/circuits/project.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
  parseSequence,
  serializeSequence,
} from '../../../src/experiments/actions.js';
import { filterExamples } from '../../../src/learning/views/guides.js';
import { findHotkeyConflict } from '../../../src/components/catalog/hotkey-bindings.js';

test('keyboard lab starts with three distinct physical bindings and independent one-bit LED outputs', () => {
  const project = createExample('keyboard-inputs');
  assert.deepEqual(validateProject(project), project);
  assert.deepEqual(parseProject(serializeProject(project)), project);
  const sources = project.nodes.filter(({ type }) => type === 'hotkey');
  assert.deepEqual(
    sources.map(({ id, params }) => [id, params.binding, params.mode]),
    [
      ['hold', 'KeyA', 'hold'],
      ['inverted', 'KeyS', 'inverted'],
      ['toggle', 'KeyD', 'toggle'],
    ],
  );
  for (const source of sources) {
    assert.equal(findHotkeyConflict(project, source.params.binding, source.id), null);
    const connection = project.wires.find(({ from }) => from.node === source.id);
    assert.equal(connection.width, 1);
    assert.equal(connection.from.port, 'out');
    assert.equal(connection.to.node, `${source.id}-lamp`);
  }
  const runtime = createRuntime();
  const outputs = () => ['hold', 'inverted', 'toggle'].map((id) => runtime.inputs[`${id}-lamp`].in);
  simulate(project, runtime, 0);
  assert.deepEqual(outputs(), [0, 1, 0]);
  for (const [id, expected] of [
    ['hold', [1, 1, 0]],
    ['inverted', [0, 0, 0]],
    ['toggle', [0, 1, 1]],
  ]) {
    const node = sources.find((candidate) => candidate.id === id);
    node.params.value = 1;
    simulate(project, runtime, 0);
    assert.deepEqual(outputs(), expected, id);
    node.params.value = 0;
    simulate(project, runtime, 0);
  }
});

test('the portable keyboard preset reproduces every stated mode transition without physical events', () => {
  const example = EXAMPLES.find(({ id }) => id === 'keyboard-inputs');
  const sequence = createSequence(example.create(), { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, Math.max(...example.actionPreset.map(({ at }) => at)) + 0.1);
  const result = replaySequence(parseSequence(serializeSequence(sequence)));
  assert.equal(sequence.actions.length, 7);
  assert.deepEqual(
    result.observations.map(({ values }) => values),
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 1],
    ],
  );
  assert.equal(result.done, true);
  assert.deepEqual(result.runtime.diagnostics, []);
  assert.deepEqual(
    sequence.initialProject.nodes
      .filter(({ type }) => type === 'hotkey')
      .map(({ params }) => params.value),
    [0, 0, 0],
  );
});

test('the keyboard lab remains discoverable bilingually and its conflict exercise uses an actual occupied binding', () => {
  for (const query of ['keyboard inputs', 'клавіатурні входи'])
    assert.deepEqual(
      filterExamples(EXAMPLES, { query }).map(({ id }) => id),
      ['keyboard-inputs'],
    );
  const project = createExample('keyboard-inputs');
  assert.equal(findHotkeyConflict(project, 'KeyS', 'hold')?.id, 'inverted');
  assert.equal(findHotkeyConflict(project, 'Shift+KeyK', 'hold'), null);
  const example = EXAMPLES.find(({ id }) => id === 'keyboard-inputs');
  for (const language of ['en', 'ua']) {
    const tasks = example.lab.tasks[language].join(' ');
    assert.match(tasks, /KeyA/);
    assert.match(tasks, /KeyS/);
    assert.match(tasks, /KeyD/);
    assert.match(tasks, /Shift\+KeyK/);
    assert.match(tasks, /0,1,1/);
  }
});
