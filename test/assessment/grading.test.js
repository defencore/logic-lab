import { student, node, wire, fixture, submissionFixture } from './fixtures/lab-assessment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
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

test('teacher recomputes every action result, validates issued identity and passes the solved memory circuit', async () => {
  const { submission, key } = await submissionFixture();
  const result = await gradeSubmission(parseSubmission(serializeSubmission(submission)), key);
  assert.equal(result.passed, true);
  assert.equal(result.integrity, true);
  assert.equal(result.observationsMatch, true);
  assert.equal(result.mismatches.length, 0);
  assert.equal(result.checks, 10);
  assert.equal(result.evidence.constructionChanges, 1);
  assert.equal(result.evidence.selfReported, true);
  assert.match(result.evidence.limitation, /not proof/);
  const another = fixture().key;
  await assert.rejects(() => gradeSubmission(submission, another), /different assignment/);
  const swapped = structuredClone(submission);
  swapped.student.id = 's02';
  await assert.rejects(() => gradeSubmission(swapped, key), /different student/);
});

test('hidden teacher replay catches a wrong intermediate state although final output and honest recorded result match', async () => {
  const { project, sequence, key, assignment } = fixture();
  // Bypass the memory: final input/output is 0, but DATA must not drive the lamp between clocks.
  const bypass = structuredClone(project);
  bypass.wires.find((w) => w.id === 'q').from = { node: 'data', port: 'out' };
  const ownSequence = structuredClone(sequence);
  ownSequence.initialProject = bypass;
  const attempt = createAttempt(assignment, student);
  recordEdit(attempt, bypass, { at: 1 });
  const submission = await createSubmission({
    assignment,
    student,
    attempt,
    project: bypass,
    sequence: ownSequence,
  });
  const result = await gradeSubmission(submission, key);
  assert.equal(result.integrity, true);
  assert.equal(result.observationsMatch, true);
  assert.equal(result.passed, false);
  assert.ok(result.mismatches.some((m) => m.at < 0.07));
  assert.equal(result.observations.at(-1).values[0], 0);
});

test('cancelling a running teacher check aborts its bounded replay instead of returning a stale grade', async () => {
  const project = {
    version: 1,
    name: 'Timed check',
    nodes: [node('clock', 'clock', { frequency: 1000, duty: 0.2 }), node('counter', 'counter')],
    wires: [wire('tick', 'clock', 'out', 'counter', 'clk')],
  };
  const sequence = createSequence(project, { probes: [{ node: 'counter', port: 'out' }] });
  appendAction(sequence, { at: 0, node: 'clock', key: 'frequency', value: 1000 });
  finishSequence(sequence, 0.1);
  const key = createAssignment({ title: 'Timed', referenceProject: project, sequence });
  const assignment = issueAssignment(key, { studentId: student.id, seed: 'timed' });
  const submission = await createSubmission({
    assignment,
    student,
    attempt: createAttempt(assignment, student),
    project,
    sequence,
  });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 0);
  await assert.rejects(() => gradeSubmission(submission, key, { signal: controller.signal }), {
    name: 'AbortError',
  });
});
