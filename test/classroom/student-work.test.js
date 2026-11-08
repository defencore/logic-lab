import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, submissionFixture, student } from '../assessment/fixtures/lab-assessment.js';
import {
  createAttempt,
  recordEdit,
  createSubmission,
  serializeSubmission,
  gradeSubmission,
} from '../../src/assessment/index.js';
import {
  createStudentWork,
  serializeStudentWork,
  parseStudentWork,
} from '../../src/classroom/student-work-files.js';
import { createClassroomStorage } from '../../src/classroom/storage.js';
import { memoryStorage } from './fixtures/classroom-session.js';

test('a submitted work file resumes its actual assignment, identity and journal without minting evidence', async () => {
  const f = await submissionFixture();
  f.submission.notes = 'Пояснення роботи';
  // Export through the domain API so the explanation is covered by the checksum.
  const saved = await createSubmission({
    ...f,
    student,
    attempt: f.attempt,
    notes: 'Пояснення роботи',
  });
  const resumed = await parseStudentWork(serializeSubmission(saved));
  assert.equal(resumed.attempt.id, saved.attempt.id);
  assert.equal(resumed.attempt.startedAt, saved.attempt.startedAt);
  assert.deepEqual(resumed.attempt.journal, saved.attempt.journal);
  assert.deepEqual(resumed.assignment, saved.assignment);
  assert.deepEqual(resumed.student, saved.student);
  assert.deepEqual(resumed.project, saved.project);
  assert.deepEqual(resumed.sequence, saved.sequence);
  assert.equal(resumed.notes, 'Пояснення роботи');
  assert.deepEqual(resumed.origin, { id: saved.id, digest: saved.integrity.digest });
  const exportedAgain = await createSubmission({ ...resumed, attempt: resumed.attempt });
  assert.deepEqual(exportedAgain.attempt, saved.attempt);
  assert.equal((await gradeSubmission(exportedAgain, f.key)).functionalPassed, true);
});

test('portable unfinished drafts preserve work and the unchanged construction journal', async () => {
  const f = fixture();
  const attempt = createAttempt(f.assignment, student);
  recordEdit(attempt, f.project, { at: 1, event: 'build' });
  const work = await createStudentWork({
    ...f,
    student,
    attempt,
    sequence: null,
    notes: 'Not finished',
    teacherKey: f.key,
  });
  const source = serializeStudentWork(work);
  assert.ok(!source.includes('referenceProject'));
  assert.ok(!source.includes('teacherKey'));
  const resumed = await parseStudentWork(source);
  assert.equal(resumed.saveKind, 'draft');
  assert.equal(resumed.sequence, null);
  assert.equal(resumed.notes, 'Not finished');
  assert.deepEqual(resumed.attempt, attempt);
  assert.deepEqual(resumed.project, f.project);
});

test('a damaged or edited student file is rejected instead of silently rewriting its evidence', async () => {
  const f = await submissionFixture();
  const changed = structuredClone(f.submission);
  changed.attempt.journal[0].event = 'forged';
  await assert.rejects(parseStudentWork(JSON.stringify(changed)), /checksum/i);
  const draft = await createStudentWork({ ...f, student, attempt: f.attempt });
  draft.notes = 'Changed after export';
  await assert.rejects(parseStudentWork(JSON.stringify(draft)), /checksum/i);
  await assert.rejects(parseStudentWork(JSON.stringify(f.key)), {
    code: 'file_wrong_kind',
    actual: 'teacher-key',
  });
});

test('student identity and unfinished notes survive local reload together with readiness state', async () => {
  const f = await submissionFixture();
  const storage = memoryStorage();
  const store = createClassroomStorage(storage);
  const state = {
    ...f,
    student,
    attempt: f.attempt,
    notes: 'п'.repeat(18000),
    studentBuildReady: true,
    studentDirty: false,
    studentLastSaveKind: 'submission',
    studentSavedAt: '2026-11-08',
    workOrigin: { id: f.submission.id, digest: f.submission.integrity.digest },
  };
  store.saveProfile(state);
  assert.equal(store.saveDraft(state), true);
  const restored = createClassroomStorage(storage).load();
  assert.deepEqual(restored.student, student);
  assert.equal(restored.notes, state.notes);
  assert.equal(restored.studentDirty, false);
  assert.equal(restored.studentLastSaveKind, 'submission');
  assert.deepEqual(restored.workOrigin, state.workOrigin);
  assert.deepEqual(restored.attempt.journal, state.attempt.journal);
});
