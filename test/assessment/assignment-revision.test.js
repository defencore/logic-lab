import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import {
  createAssignment,
  issueAssignment,
  assignmentForVariant,
  createAttempt,
  recordEdit,
  createSubmission,
  gradeSubmission,
} from '../../src/assessment/index.js';
import {
  reviseAssignmentMetadata,
  publicStarterPreview,
} from '../../src/assessment/assignment-revision.js';
import { sequenceFor } from '../classroom/fixtures/classroom-session.js';

test('metadata revision updates all public variants while preserving key and grading identities', () => {
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'A title',
    instructions: 'A instructions',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  const first = issueAssignment(key, { studentId: 's1', seed: 'one' });
  issueAssignment(key, { studentId: 's2', seed: 'two' });
  const before = structuredClone(key);
  const revised = reviseAssignmentMetadata(key, {
    title: 'B title',
    instructions: 'B instructions',
  });
  assert.equal(revised.key.id, key.id);
  assert.deepEqual(revised.key.issued, before.issued);
  assert.deepEqual(revised.key.referenceProject, before.referenceProject);
  assert.deepEqual(revised.key.sequence, before.sequence);
  assert.deepEqual(
    revised.assignments.map((task) => task.instructions),
    ['B instructions', 'B instructions'],
  );
  assert.equal(revised.assignments[0].id, first.id);
  assert.equal(assignmentForVariant(revised.key, first.id).title, 'B title');
  assert.deepEqual(key, before, 'revision is atomic and does not mutate the previous key');
});

test('public preview contains the exact chosen starter and excludes hidden reference payloads', () => {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({
    title: 'Preview',
    instructions: 'Build a register.',
    referenceProject: project,
    sequence,
    probes: [{ node: 'bit0', port: 'in', side: 'inputs' }],
  });
  const task = issueAssignment(key, { studentId: 's1' });
  assert.deepEqual(publicStarterPreview(key, task.id), task);
  const preview = publicStarterPreview(key);
  assert.equal(preview.starterProject.wires.length, 0);
  assert.ok(!preview.starterProject.nodes.some((node) => node.type === 'shift_register'));
  for (const name of ['sequence', 'referenceProject', 'issued', 'expected'])
    assert.equal(Object.hasOwn(preview, name), false);
  assert.equal(key.issued.length, 1, 'preview does not issue another identity');
});

test('previously distributed work still grades against a metadata-only revision', async () => {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({
    title: 'Old title',
    instructions: 'Old instructions',
    referenceProject: project,
    sequence,
  });
  const assignment = issueAssignment(key, { studentId: 's1' });
  const student = { name: 'Student', id: 's1', group: 'A' };
  const attempt = createAttempt(assignment, student);
  recordEdit(attempt, project, { at: 1 });
  const submission = await createSubmission({
    assignment,
    student,
    attempt,
    project,
    sequence,
    notes: 'Checked storage.',
  });
  const revised = reviseAssignmentMetadata(key, {
    title: 'New title',
    instructions: 'Clarified instructions',
  });
  const grade = await gradeSubmission(submission, revised.key);
  assert.equal(grade.functionalPassed, true);
  assert.equal(grade.integrity, true);
});
