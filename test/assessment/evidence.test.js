import { student, node, fixture, submissionFixture, resign } from './fixtures/lab-assessment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
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

test('construction journal ignores layout, naming, annotation and live source changes but records circuit changes', () => {
  const { assignment, project } = fixture();
  const attempt = createAttempt(assignment, student),
    copy = structuredClone(assignment.starterProject);
  copy.nodes.reverse();
  for (const n of copy.nodes) {
    n.x += 500;
    n.y -= 400;
    n.label = 'Changed';
    if (n.type === 'switch') n.params.value = 1;
  }
  assert.equal(recordEdit(attempt, copy, { at: 1 }), false);
  assert.equal(recordEdit(attempt, project, { at: 2, event: 'build' }), true);
  assert.equal(recordEdit(attempt, project, { at: 3 }), false);
  assert.equal(attempt.journal.length, 1);
});

test('tampering results still fails even when a student recalculates the unkeyed SHA256 digest', async () => {
  const { submission, key } = await submissionFixture();
  const altered = structuredClone(submission);
  altered.observations[2].values[0] = 0;
  await resign(altered);
  const result = await gradeSubmission(altered, key);
  assert.equal(result.integrity, true, 'digest is not an authenticity signature');
  assert.equal(result.observationsMatch, false);
  assert.equal(result.passed, false);
  assert.equal(
    result.functionalPassed,
    true,
    'reference circuit checks remain distinct from file evidence',
  );
  assert.equal(result.reviewRequired, true);
});

test('grading rejects unissued or modified variants and submissions must be recorded against the submitted circuit', async () => {
  const { submission, key, assignment, project, sequence } = await submissionFixture();
  const altered = structuredClone(submission);
  altered.assignment.variant.seed = 'tampered';
  await assert.rejects(() => gradeSubmission(altered, key), {
    code: 'assessment_variant_mismatch',
  });
  const bad = structuredClone(project);
  bad.wires.pop();
  await assert.rejects(
    () =>
      createSubmission({
        assignment,
        student,
        attempt: createAttempt(assignment, student),
        project: bad,
        sequence,
      }),
    /changed/,
  );
  assert.throws(() => parseSubmission('{"__proto__":{}}'), /unsafe/);
  assert.throws(
    () =>
      validateAssignment({
        ...assignment,
        probes: [{ node: 'lamp', port: 'bad', side: 'inputs' }],
      }),
    /missing/,
  );
  assert.throws(
    () => validateAssignmentKey({ ...key, issued: [...key.issued, ...key.issued] }),
    /Duplicate/,
  );
  await assert.rejects(
    () =>
      createSubmission({
        assignment,
        student: { ...student, id: 'another-student' },
        attempt: createAttempt(assignment, student),
        project,
        sequence,
      }),
    /different student/,
  );
});

test('attempt drafts resume only with matching task and a well-formed construction journal', () => {
  const { assignment, project, key } = fixture();
  const attempt = createAttempt(assignment, student);
  assert.deepEqual(validateAttempt(structuredClone(attempt), assignment), attempt);
  recordEdit(attempt, project, { at: 2, event: 'connect' });
  assert.deepEqual(validateAttempt(attempt), attempt);
  assert.throws(
    () => validateAttempt({ ...attempt, lastFingerprint: 'not-a-fingerprint' }),
    /fingerprint/,
  );
  assert.throws(() => validateAttempt({ ...attempt, startedAt: 'never' }), /date/);
  const other = issueAssignment(key, { seed: 'other' });
  assert.throws(() => validateAttempt(attempt, other), /different assignment/);
});
