import { sequenceFor, memoryStorage } from './fixtures/classroom-session.js';
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

test('draft restoration isolates invalid sections and never writes private teacher keys', () => {
  const storage = memoryStorage();
  const store = createClassroomStorage(storage);
  const sequence = sequenceFor(createExample('shift-register-sequence'));
  store.saveProfile({
    mode: 'teacher',
    student: { name: 'Name', id: 'x'.repeat(200), group: 'g' },
  });
  store.saveDraft({
    assignment: { kind: 'bad' },
    attempt: { kind: 'bad' },
    sequence,
    notes: 'Keep notes',
    teacherForm: { title: 'Draft title', starterMode: 'components', probes: ['shift:outputs:out'] },
    teacherKey: { secret: 'never store' },
  });
  const restored = store.load();
  assert.equal(restored.mode, 'teacher');
  assert.equal(restored.student.id.length, 100);
  assert.equal(restored.assignment, null);
  assert.equal(restored.attempt, null);
  assert.equal(restored.sequence.actions.length, 2);
  assert.equal(restored.notes, 'Keep notes');
  assert.equal(restored.teacherForm.title, 'Draft title');
  assert.ok(!storage.getItem('logic-lab.classroom-draft').includes('never store'));
  storage.setItem('logic-lab.classroom-profile', 'not-json');
  assert.equal(readClassroomStorage(storage).mode, 'student');
});

test('saved attempts retain their identity and construction journal after reload', () => {
  const storage = memoryStorage();
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Task',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  const assignment = issueAssignment(key, { studentId: 's1' });
  const attempt = createAttempt(assignment, { name: 'Name', id: 's1', group: 'g' });
  recordEdit(attempt, project, { at: 1, event: 'wire' });
  const store = createClassroomStorage(storage);
  store.saveDraft({ assignment, attempt, sequence: sequenceFor(project), notes: 'Result' });
  const restored = store.load();
  assert.equal(restored.attempt.id, attempt.id);
  assert.deepEqual(restored.attempt.journal, attempt.journal);
});

test('storage failure is reported once until a successful save', () => {
  let fail = true;
  let warnings = 0;
  const store = createClassroomStorage(
    {
      setItem: () => {
        if (fail) throw Error('full');
      },
    },
    () => warnings++,
  );
  store.saveProfile({ mode: 'student', student: {} });
  store.saveProfile({ mode: 'student', student: {} });
  assert.equal(warnings, 1);
  fail = false;
  store.saveProfile({ mode: 'student', student: {} });
  fail = true;
  store.saveProfile({ mode: 'student', student: {} });
  assert.equal(warnings, 2);
});

test('valid long assignment instructions survive the saved instructor form without truncation', () => {
  const instructions = 'Full laboratory condition. '.repeat(600);
  const storage = memoryStorage();
  const store = createClassroomStorage(storage);
  store.saveDraft({ teacherForm: { instructions } });
  assert.equal(store.load().teacherForm.instructions, instructions);
});
