import { student, node, fixture } from './fixtures/lab-assessment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import ramExample from '../../examples/ram-addressing/circuit.json' with { type: 'json' };
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import {
  createAssignment,
  issueAssignment,
  assignmentForVariant,
  validateAssignmentKey,
  validateAssignment,
  parseAssignmentKey,
  serializeAssignmentKey,
  parseAssignment,
  serializeAssignment,
  createAttempt,
  validateAttempt,
  recordEdit,
  createSubmission,
  gradeSubmission,
  compareSubmissions,
  compareSubmissionsAsync,
  graphFingerprint,
  parseSubmission,
  serializeSubmission,
} from '../../src/assessment/index.js';

test('public task keeps only input/output interfaces and no solution, secret actions or expected results', () => {
  const { key, assignment } = fixture();
  assert.equal(
    assignment.starterProject.nodes.some((n) => n.id === 'ff'),
    false,
  );
  assert.equal(assignment.starterProject.wires.length, 0);
  for (const field of ['referenceProject', 'sequence', 'actions', 'expected', 'issued'])
    assert.equal(Object.hasOwn(assignment, field), false);
  assert.equal(assignment.variant.studentId, 's01');
  assert.equal(key.issued.length, 1);
  assert.deepEqual(parseAssignment(serializeAssignment(assignment)), assignment);
  assert.deepEqual(parseAssignmentKey(serializeAssignmentKey(key)), key);
});

test('student variants change byte input values reproducibly while keeping teacher test data private', () => {
  const { project, sequence } = fixture();
  project.nodes.push(node('address', 'bus_input', { value: 3 }));
  sequence.initialProject = structuredClone(project);
  const key = createAssignment({ title: 'Address task', referenceProject: project, sequence });
  const a = issueAssignment(key, { seed: 'first' }),
    b = issueAssignment(key, { seed: 'second' });
  assert.notEqual(a.id, b.id);
  assert.notDeepEqual(a.variant.sourceValues, b.variant.sourceValues);
  assert.equal(
    a.starterProject.nodes.find((n) => n.id === 'address').params.value,
    a.variant.sourceValues.find((source) => source.node === 'address').value,
  );
  assert.equal(a.referenceProject, undefined);
});

test('an imported teacher key recreates each issued public assignment without issuing another variant', () => {
  const { key, assignment } = fixture();
  const restored = parseAssignmentKey(serializeAssignmentKey(key));
  assert.deepEqual(assignmentForVariant(restored, assignment.id), assignment);
  assert.equal(restored.issued.length, 1);
  assert.throws(() => assignmentForVariant(restored, 'unissued'), /not issued/);
  assert.equal(assignmentForVariant(restored, assignment.id).referenceProject, undefined);
});

test('switch-only variants alter serial data while preserving reset and clock source baselines and edges', async () => {
  const { key } = fixture();
  let pair;
  for (let a = 0; a < 8 && !pair; a++)
    for (let b = a + 1; b < 8 && !pair; b++) {
      const first = issueAssignment(key, { seed: `serial${a}` }),
        second = issueAssignment(key, { seed: `serial${b}` });
      if (first.variant.sourceValues[0]?.value !== second.variant.sourceValues[0]?.value)
        pair = [first, second];
    }
  assert.ok(pair, 'different binary data variants exist');
  for (const assignment of pair) {
    assert.deepEqual(
      assignment.variant.sourceValues.map((source) => source.node),
      ['data'],
    );
    assert.equal(assignment.starterProject.nodes.find((n) => n.id === 'clk').params.value, 0);
    assert.equal(assignment.starterProject.nodes.find((n) => n.id === 'rst').params.value, 0);
  }
  const reports = [];
  for (const assignment of pair) {
    const nextStudent = { name: 'Learner', id: 'any' };
    const attempt = createAttempt(assignment, nextStudent);
    const sequence = structuredClone(key.sequence);
    const submission = await createSubmission({
      assignment,
      student: nextStudent,
      attempt,
      project: key.referenceProject,
      sequence,
    });
    reports.push(await gradeSubmission(submission, key));
  }
  assert.notDeepEqual(
    reports[0].observations.map((o) => o.values),
    reports[1].observations.map((o) => o.values),
  );
  assert.equal(
    reports.every((r) => r.functionalPassed),
    true,
  );
  assert.equal(
    reports.every((r) => r.reviewRequired && r.workEvidenceMissing),
    true,
  );
});

test('memory variants personalize address and data without inverting clock, chip-select, write or read controls', () => {
  const sequence = createSequence(ramExample, { probes: [{ node: 'memory', port: 'out' }] });
  const key = createAssignment({
    title: 'Addressed memory',
    referenceProject: ramExample,
    sequence,
  });
  const assignment = issueAssignment(key, { seed: 'memory-controls' });
  assert.deepEqual(
    assignment.variant.sourceValues.map((source) => source.node),
    ['address', 'data'],
  );
  for (const id of ['clock', 'write', 'chip', 'read'])
    assert.deepEqual(
      assignment.starterProject.nodes.find((node) => node.id === id).params,
      key.referenceProject.nodes.find((node) => node.id === id).params,
    );
});
