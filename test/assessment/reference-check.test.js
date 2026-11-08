import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, submissionFixture } from './fixtures/lab-assessment.js';
import { buildReferenceCheck, gradeSubmission } from '../../src/assessment/index.js';

test('an older valid key missing an issued variant produces a typed recovery error before any grading', async () => {
  const f = await submissionFixture();
  const oldKey = structuredClone(f.key);
  oldKey.issued = [];
  const before = structuredClone(oldKey);
  const expected = {
    code: 'assessment_variant_missing',
    keyId: oldKey.id,
    variantId: f.assignment.id,
  };
  assert.throws(() => buildReferenceCheck(f.submission, oldKey), expected);
  await assert.rejects(gradeSubmission(f.submission, oldKey), expected);
  assert.deepEqual(oldKey, before);
});

test('reference replay and grading retain distinct strict task, variant-data and student identity checks', async () => {
  const f = await submissionFixture();
  const mismatchedVariant = structuredClone(f.key);
  mismatchedVariant.issued[0].seed = 'different-seed';
  const mismatchedStudent = structuredClone(f.submission);
  mismatchedStudent.student.id = 'different-student';
  for (const [submission, key, code] of [
    [f.submission, fixture().key, 'assessment_assignment_mismatch'],
    [f.submission, mismatchedVariant, 'assessment_variant_mismatch'],
    [mismatchedStudent, f.key, 'assessment_student_mismatch'],
  ]) {
    assert.throws(() => buildReferenceCheck(submission, key), { code });
    await assert.rejects(gradeSubmission(submission, key), { code });
  }
});

test('the authoritative reference sequence applies the issued inputs and observed signals without mutating source files', async () => {
  const f = await submissionFixture();
  const before = structuredClone({ submission: f.submission, key: f.key });
  const check = buildReferenceCheck(f.submission, f.key);
  assert.equal(check.submission.id, f.submission.id);
  assert.equal(check.variant.id, f.assignment.id);
  assert.deepEqual(check.sequence.probes, f.key.probes);
  for (const source of f.assignment.variant.sourceValues)
    assert.equal(
      check.sequence.initialProject.nodes.find((node) => node.id === source.node).params[
        source.key
      ],
      source.value,
    );
  check.sequence.actions[0].value = 999;
  assert.deepEqual({ submission: f.submission, key: f.key }, before);
});
