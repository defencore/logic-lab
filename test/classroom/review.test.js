import { sequenceFor } from './fixtures/classroom-session.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import {
  createAssignment,
  issueAssignment,
  createAttempt,
  recordEdit,
} from '../../src/assessment/index.js';
import {
  createClassroomStorage,
  readClassroomStorage,
  sanitizeTeacherForm,
} from '../../src/classroom/storage.js';
import { createReviewView } from '../../src/classroom/review-view.js';
import { createTeacherWorkspace, inspectReference } from '../../src/classroom/teacher-workspace.js';
import { createSubmission, serializeSubmission } from '../../src/assessment/index.js';

test('teacher review separates functional correctness from corrupted evidence and defers similarity while busy', () => {
  const project = createExample('shift-register-sequence');
  const submission = {
    student: { name: 'Student', id: 's1' },
    assignment: { variant: { id: 'variant-id' } },
  };
  const result = {
    functionalPassed: true,
    passed: false,
    reviewRequired: true,
    workEvidenceMissing: false,
    matched: 3,
    totalChecks: 3,
    mismatches: [],
    integrity: false,
    structureMatches: true,
    observationsMatch: false,
    evidence: { constructionChanges: 2, actions: 3, studentBound: true },
  };
  const state = {
    teacherKey: { referenceProject: project },
    batch: [{ submission, result }],
    pairs: [],
    batchErrors: [],
    busy: true,
  };
  const markup = createReviewView({ state, language: 'en' }).reviewMarkup();
  assert.match(markup, /Checks passed/);
  assert.match(markup, /Instructor review needed/);
  assert.match(markup, /The file checksum does not match/);
  assert.match(markup, /results stored in the file differ/);
  assert.match(markup, /Similarity comparison will be available/);
  assert.doesNotMatch(markup, /No significant structural/);
});

test('cancelled batch checking keeps completed rows and cannot claim a completed similarity report', async () => {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({ title: 'Task', referenceProject: project, sequence });
  const assignment = issueAssignment(key, { studentId: 's1' });
  const student = { name: 'Student', id: 's1', group: 'g' };
  const attempt = createAttempt(assignment, student);
  recordEdit(attempt, project, { at: 1 });
  const submission = await createSubmission({
    assignment,
    student,
    attempt,
    project,
    sequence,
    notes: 'Observed the edge.',
  });
  const source = serializeSubmission(submission);
  const state = {
    teacherKey: key,
    teacherForm: sanitizeTeacherForm(),
    batch: [],
    pairs: [],
    batchErrors: [],
  };
  const workspace = createTeacherWorkspace(state, {
    onProgress: () => {
      if (state.batch.length === 1) workspace.cancelReview();
    },
  });
  const result = await workspace.reviewFiles([
    { name: 'one.json', size: source.length, text: async () => source },
    { name: 'two.json', size: source.length, text: async () => source },
  ]);
  assert.equal(result.cancelled, true);
  assert.equal(state.batch.length, 1);
  assert.equal(state.reviewing, false);
  assert.equal(state.reviewComparisonComplete, false);
  assert.equal(workspace.report().complete, false);
  assert.equal(workspace.report().comparisonComplete, false);
  const markup = createReviewView({
    state: { ...state, busy: false },
    language: 'en',
  }).reviewMarkup();
  assert.match(markup, /Checking was stopped/);
  assert.match(markup, /Comparison of this batch was not completed/);
  assert.doesNotMatch(markup, /No significant structural/);
});

test('review cards expose explanations, actual work actions and recomputed student observations', () => {
  const project = createExample('shift-register-sequence');
  const state = {
    teacherKey: { referenceProject: project },
    pairs: [],
    batchErrors: [],
    busy: false,
    batch: [
      {
        submission: {
          student: { name: 'Learner', id: 's1', group: 'A' },
          assignment: { variant: { id: 'variant' } },
          notes: '<script>explanation</script>',
          project,
          sequence: { probes: [{ node: 'shift', port: 'out', side: 'outputs' }], actions: [] },
          observations: [{ at: 0, after: -1, values: [999] }],
        },
        result: {
          functionalPassed: true,
          passed: true,
          matched: 1,
          totalChecks: 1,
          mismatches: [],
          integrity: true,
          structureMatches: true,
          observationsMatch: true,
          studentObservations: [{ at: 0, after: -1, values: [1] }],
          evidence: {},
        },
      },
    ],
  };
  const markup = createReviewView({ state, language: 'en' }).reviewMarkup();
  assert.match(markup, /&lt;script&gt;explanation&lt;\/script&gt;/);
  assert.match(markup, /data-review-open="0"/);
  assert.match(markup, /data-review-replay="0"/);
  assert.match(markup, /Recomputed experiment/);
  assert.match(markup, /<td>1<\/td>/);
  assert.doesNotMatch(markup, /999/);
  state.reviewQuery = 'no match';
  assert.match(createReviewView({ state, language: 'en' }).cardsMarkup(), /No submissions match/);
  state.reviewQuery = 'learner';
  state.reviewFilter = 'passed';
  assert.match(createReviewView({ state, language: 'en' }).cardsMarkup(), /Submissions shown/);
});
