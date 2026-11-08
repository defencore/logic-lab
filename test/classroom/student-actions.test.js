import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, submissionFixture, student } from '../assessment/fixtures/lab-assessment.js';
import {
  createAttempt,
  serializeAssignment,
  serializeSubmission,
} from '../../src/assessment/index.js';
import { createStudentActions } from '../../src/classroom/student-actions.js';

function context(f = fixture()) {
  let project = f.project;
  const runtime = { time: 10 };
  let loads = 0,
    review;
  const state = {
    ...f,
    student: { ...student },
    attempt: createAttempt(f.assignment, student),
    notes: 'Keep explanation',
    observations: [],
    studentDirty: false,
  };
  const adapter = {
    getProject: () => project,
    getRuntime: () => runtime,
    isRunning: () => false,
    loadProject: (p) => {
      project = p;
      loads++;
    },
    adoptPlayback: (p) => (project = p),
    setRunning() {},
    closeModal() {},
    notify() {},
    getLanguage: () => 'ua',
  };
  const actions = createStudentActions({
    adapter,
    state,
    session: { projectToSave: () => project },
    store: { saveProfile() {} },
    L: (ua) => ua,
    guardEditableSession() {},
    operations: { run: async (action) => action() },
    review: (value) => (review = value),
    changed() {},
  });
  return {
    state,
    adapter,
    actions,
    get project() {
      return project;
    },
    get loads() {
      return loads;
    },
    get review() {
      return review;
    },
  };
}

test('Continue keeps the existing circuit, attempt, recording and explanation intact', () => {
  const c = context();
  const before = structuredClone(c.state),
    project = c.project;
  const previous = globalThis.document;
  globalThis.document = { querySelector: () => null };
  try {
    c.actions.continueWork();
  } finally {
    globalThis.document = previous;
  }
  assert.equal(c.loads, 0);
  assert.equal(c.project, project);
  assert.deepEqual(c.state, before);
});

test('Restart requires an explicit review before changing any student work', () => {
  const c = context(),
    before = structuredClone(c.state);
  c.actions.restartAttempt();
  assert.deepEqual(c.state, before);
  assert.equal(c.loads, 0);
  assert.match(c.review.description, /журнал/);
  assert.match(c.review.confirm, /без збереження/);
  c.review.apply();
  assert.notEqual(c.state.attempt.id, before.attempt.id);
  assert.deepEqual(c.state.attempt.journal, []);
  assert.equal(c.state.sequence, null);
  assert.equal(c.state.notes, '');
  assert.deepEqual(c.project, c.state.assignment.starterProject);
});

test('reopening the same assignment continues instead of silently resetting the attempt', () => {
  const c = context(),
    before = structuredClone(c.state);
  c.actions.importAssignment(serializeAssignment(c.state.assignment));
  assert.deepEqual(c.state, before);
  assert.equal(c.review, undefined);
  assert.equal(c.loads, 0);
});

test('opening submitted work validates first and replaces project and evidence only after review', async () => {
  const f = await submissionFixture(),
    c = context();
  const before = structuredClone(c.state),
    project = c.project;
  await c.actions.importWork(serializeSubmission(f.submission));
  assert.deepEqual(c.state, before);
  assert.equal(c.project, project);
  assert.equal(c.loads, 0);
  c.review.apply();
  assert.deepEqual(c.project, f.submission.project);
  assert.equal(c.state.attempt.id, f.attempt.id);
  assert.deepEqual(c.state.attempt.journal, f.attempt.journal);
  assert.deepEqual(c.state.student, f.submission.student);
  assert.deepEqual(c.state.workOrigin, {
    id: f.submission.id,
    digest: f.submission.integrity.digest,
  });
  assert.equal(c.state.studentDirty, false);
});

test('failed project installation leaves the previous student evidence and circuit intact', async () => {
  const f = await submissionFixture(),
    c = context(),
    before = structuredClone(c.state),
    project = c.project;
  await c.actions.importWork(serializeSubmission(f.submission));
  c.adapter.loadProject = () => {
    throw new Error('Cannot install');
  };
  assert.throws(() => c.review.apply(), /Cannot install/);
  assert.deepEqual(c.state, before);
  assert.equal(c.project, project);
});

test('saving a draft after reopening completed work clearly returns to the instructor export step', async (t) => {
  const { studentProgress, progressMessage } = await import(
    '../../src/classroom/student-progress.js'
  );
  const c = context();
  c.state.studentDirty = false;
  c.state.studentLastSaveKind = 'submission';
  assert.equal(studentProgress(c.state, c.project).saved, true);
  const previous = globalThis.document;
  let downloads = 0;
  globalThis.document = {
    createElement: () => ({
      click() {
        downloads++;
      },
    }),
  };
  t.mock.method(globalThis, 'setTimeout', (callback) => {
    callback();
    return 0;
  });
  try {
    await c.actions.saveDraft();
  } finally {
    globalThis.document = previous;
  }
  const progress = studentProgress(c.state, c.project);
  assert.equal(downloads, 1);
  assert.equal(c.state.studentLastSaveKind, 'draft');
  assert.equal(progress.ready, true);
  assert.equal(progress.saved, false);
  assert.equal(progress.steps[4], false);
  assert.match(progressMessage(progress, 'ua'), /Чернетку збережено/);
  assert.match(progressMessage(progress, 'ua'), /для викладача/);
});
