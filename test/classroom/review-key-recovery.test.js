import test from 'node:test';
import assert from 'node:assert/strict';
import { submissionFixture, student } from '../assessment/fixtures/lab-assessment.js';
import { issueAssignment, createAttempt, createSubmission } from '../../src/assessment/index.js';
import { createTeacherWorkspace } from '../../src/classroom/teacher-workspace.js';
import { fileErrorMessage } from '../../src/classroom/file-error-messages.js';
import { sanitizeTeacherForm } from '../../src/classroom/storage.js';

function loadedFile(submission) {
  const source = JSON.stringify(submission);
  let reads = 0;
  return {
    file: {
      name: `${submission.student.id}.json`,
      size: source.length,
      text: async () => {
        reads++;
        return source;
      },
    },
    reads: () => reads,
  };
}

test('opening a current key can retry all previously loaded works without reselecting their files', async () => {
  const f = await submissionFixture();
  const oldKey = structuredClone(f.key);
  const anotherStudent = { ...student, id: 's02', name: 'Learner Two' };
  const assignment = issueAssignment(f.key, {
    studentId: anotherStudent.id,
    seed: 'second-variant',
  });
  const second = await createSubmission({
    assignment,
    student: anotherStudent,
    attempt: createAttempt(assignment, anotherStudent),
    project: f.project,
    sequence: f.sequence,
  });
  const one = loadedFile(f.submission),
    two = loadedFile(second);
  const state = {
    teacherKey: oldKey,
    teacherForm: sanitizeTeacherForm({ title: oldKey.title, instructions: oldKey.instructions }),
    batch: [],
    pairs: [],
    batchErrors: [],
  };
  const workspace = createTeacherWorkspace(state, {
    formatError: (error) => fileErrorMessage(error, { language: 'ua', mode: 'teacher' }),
  });
  await workspace.reviewFiles([one.file, two.file]);
  assert.equal(state.teacherKey, oldKey);
  assert.equal(state.batch.length, 1);
  assert.equal(state.batch[0].result.passed, true);
  assert.equal(state.batchErrors.length, 1);
  assert.match(state.batchErrors[0], /У цьому ключі немає виданого варіанта/);
  assert.match(state.batchErrors[0], /збережену після формування варіантів/);
  assert.doesNotMatch(state.batchErrors[0], /списув|cheat|copying/i);
  assert.deepEqual(state.reviewKeyRecovery, {
    fileCount: 2,
    missingVariantCount: 1,
    keyChanged: false,
  });
  assert.equal(one.reads(), 1);
  assert.equal(two.reads(), 1);
  const beforeInvalidImport = structuredClone(state);
  await assert.rejects(workspace.importKey('{'), { code: 'file_invalid_json' });
  assert.deepEqual(state, beforeInvalidImport);
  await workspace.importKey(JSON.stringify(f.key));
  assert.deepEqual(state.reviewKeyRecovery, {
    fileCount: 2,
    missingVariantCount: 1,
    keyChanged: true,
  });
  assert.equal(one.reads(), 1);
  assert.equal(two.reads(), 1);
  await workspace.retryReview();
  assert.equal(one.reads(), 2);
  assert.equal(two.reads(), 2);
  assert.equal(state.batch.length, 2);
  assert.equal(state.batchErrors.length, 0);
  assert.equal(
    state.batch.every((item) => item.result.passed),
    true,
  );
  assert.equal(state.reviewKeyRecovery, null);
});

test('retrying with the same incomplete key keeps the explicit recovery state instead of grading the unissued variant', async () => {
  const f = await submissionFixture();
  const oldKey = structuredClone(f.key);
  oldKey.issued = [];
  const { file } = loadedFile(f.submission);
  const state = { teacherKey: oldKey };
  const workspace = createTeacherWorkspace(state);
  await workspace.reviewFiles([file]);
  await workspace.retryReview();
  assert.equal(state.batch.length, 0);
  assert.equal(state.teacherKey, oldKey);
  assert.deepEqual(state.reviewKeyRecovery, {
    fileCount: 1,
    missingVariantCount: 1,
    keyChanged: false,
  });
});

test('typed key recovery wording is localized and does not accuse the student', () => {
  const error = { code: 'assessment_variant_missing' };
  const ua = fileErrorMessage(error, { language: 'ua', mode: 'teacher' });
  const en = fileErrorMessage(error, { language: 'en', mode: 'teacher' });
  assert.match(ua, /У цьому ключі немає виданого варіанта/);
  assert.match(ua, /актуальну копію ключа, збережену після формування варіантів/);
  assert.match(en, /key copy saved after generating the variants/);
  assert.doesNotMatch(ua + en, /списув|cheat|copying/i);
});
