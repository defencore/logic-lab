import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
  parseSequence,
  serializeSequence,
} from '../../src/experiments/actions.js';
import {
  createAssignment,
  issueAssignment,
  createAttempt,
  createSubmission,
  gradeSubmission,
  graphFingerprint,
} from '../../src/assessment/index.js';

function project(mode = 'hold', value = 0) {
  return {
    version: 1,
    name: 'Keyboard experiment',
    nodes: [
      {
        id: 'key',
        type: 'hotkey',
        x: 0,
        y: 0,
        params: { ...getDefinition('hotkey').defaults, binding: 'KeyK', mode, value },
      },
      { id: 'lamp', type: 'led', x: 200, y: 0, params: {} },
    ],
    wires: [
      {
        id: 'wire',
        from: { node: 'key', port: 'out' },
        to: { node: 'lamp', port: 'in' },
        width: 1,
      },
    ],
  };
}
function sequenceFor(circuit, values) {
  const sequence = createSequence(circuit, {
    probes: [
      { node: 'key', port: 'out', side: 'outputs' },
      { node: 'lamp', port: 'in', side: 'inputs' },
    ],
  });
  values.forEach((value, index) =>
    appendAction(sequence, { at: index / 100, node: 'key', key: 'value', value }),
  );
  return finishSequence(sequence, values.length / 100 + 0.01);
}

test('recorded hold, inverted and toggle raw values replay deterministically without keyboard events', () => {
  for (const [mode, values, expected] of [
    ['hold', [1, 0, 1, 0], [0, 1, 0, 1, 0, 0]],
    ['inverted', [1, 0, 1, 0], [1, 0, 1, 0, 1, 1]],
    ['toggle', [1, 1, 0, 1], [0, 1, 1, 0, 1, 1]],
  ]) {
    const circuit = project(mode),
      sequence = sequenceFor(circuit, values);
    const parsed = parseSequence(serializeSequence(sequence));
    const candidate = structuredClone(circuit);
    candidate.nodes[0].params.value = 1;
    const result = replaySequence(parsed, { project: candidate });
    assert.deepEqual(
      result.observations.map(({ values }) => values),
      expected.map((value) => [value, value]),
      mode,
    );
    assert.equal(result.project.nodes[0].params.value, values.at(-1));
    assert.equal(sequence.initialProject.nodes[0].params.value, 0);
    assert.deepEqual(result.observations, replaySequence(parsed).observations);
  }
});

test('recordings permit only binary raw-value actions and retain the saved toggle baseline', () => {
  const sequence = createSequence(project('toggle', 1));
  assert.deepEqual(
    replaySequence(finishSequence(sequence, 0.1)).observations.map(({ values }) => values),
    [
      [1, 1],
      [1, 1],
    ],
  );
  for (const value of [-1, 0.5, 2, NaN])
    assert.throws(
      () => appendAction(sequence, { at: 0, node: 'key', key: 'value', value }),
      /supported range/,
    );
  for (const [key, value] of [
    ['mode', 'toggle'],
    ['binding', 'KeyA'],
  ])
    assert.throws(
      () => appendAction(sequence, { at: 0, node: 'key', key, value }),
      /supported input source/,
    );
});

test('live raw-value changes are excluded from construction fingerprints while binding and mode remain semantic', () => {
  const original = project(),
    next = structuredClone(original);
  const fingerprint = (value) => graphFingerprint(value, { ignoreSourceValues: true });
  next.nodes[0].params.value = 1;
  assert.equal(fingerprint(next), fingerprint(original));
  next.nodes[0].params.binding = 'Shift+KeyK';
  assert.notEqual(fingerprint(next), fingerprint(original));
  next.nodes[0].params.binding = 'KeyK';
  next.nodes[0].params.mode = 'inverted';
  assert.notEqual(fingerprint(next), fingerprint(original));
});

test('assignment variants retain keyboard interfaces and replay their reference inputs without random inversion', async () => {
  const referenceProject = project('inverted'),
    sequence = sequenceFor(referenceProject, [1, 0]);
  const key = createAssignment({ title: 'Keyboard lab', referenceProject, sequence });
  const student = { id: 's1', name: 'Learner' };
  for (const seed of ['first', 'second']) {
    const assignment = issueAssignment(key, { studentId: student.id, seed });
    assert.deepEqual(assignment.variant.sourceValues, []);
    assert.equal(assignment.starterProject.nodes.find(({ id }) => id === 'key').params.value, 0);
    assert.equal(
      assignment.starterProject.nodes.find(({ id }) => id === 'key').params.mode,
      'inverted',
    );
    const submission = await createSubmission({
      assignment,
      student,
      project: referenceProject,
      sequence,
      attempt: createAttempt(assignment, student),
    });
    const result = await gradeSubmission(submission, key);
    assert.equal(result.functionalPassed, true);
    assert.deepEqual(
      result.studentObservations.map(({ values }) => values[0]),
      [1, 0, 1, 1],
    );
  }
});
