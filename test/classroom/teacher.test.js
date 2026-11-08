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
import { createClassroomView } from '../../src/classroom/view.js';
import { createTeacherWorkspace, inspectReference } from '../../src/classroom/teacher-workspace.js';
import { serializeAssignmentKey } from '../../src/assessment/index.js';

test('teacher forms and accessible tabs render saved choices without leaking reference data', () => {
  const state = {
    mode: 'teacher',
    student: { name: '', id: '', group: '' },
    assignment: null,
    teacherKey: {
      title: 'Imported task',
      id: 'task-key',
      referenceProject: createExample('shift-register-sequence'),
    },
    referenceWarnings: [],
    issued: [],
    attempt: null,
    sequence: null,
    observations: [],
    recording: false,
    player: null,
    playbackRunning: false,
    busy: false,
    notes: '',
    batch: [],
    pairs: [],
    batchErrors: [],
    teacherForm: sanitizeTeacherForm({
      title: 'My task',
      instructions: 'Retain me',
      starterMode: 'components',
      studentIds: 's1\ns2',
      probes: [],
    }),
  };
  const view = createClassroomView({
    state,
    language: 'en',
    project: createExample('shift-register-sequence'),
    example: null,
  });
  const markup = view.mainMarkup('teacher');
  assert.match(markup, /value="My task"/);
  assert.match(markup, /Retain me/);
  assert.match(markup, /<option value="components" selected>/);
  assert.match(markup, /s1\ns2/);
  assert.equal((markup.match(/data-task-probe="\d+" checked/g) || []).length, 0);
  assert.match(markup, /role="tabpanel" aria-labelledby="class-tab-teacher"/);
  assert.match(markup, /id="class-tab-teacher"[^>]*tabindex="0"[^>]*aria-selected="true"/);
});

test('imported teacher keys restore issued student files and invalidate an older review', async () => {
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Restored task',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  const task = issueAssignment(key, { studentId: 's1' });
  const state = {
    teacherForm: sanitizeTeacherForm(),
    teacherKey: null,
    referenceWarnings: [],
    issued: [],
    batch: [{ old: true }],
    pairs: [{}],
    batchErrors: ['old'],
  };
  const workspace = createTeacherWorkspace(state);
  await workspace.importKey(serializeAssignmentKey(key));
  assert.equal(state.issued.length, 1);
  assert.equal(state.issued[0].id, task.id);
  assert.ok(!Object.hasOwn(state.issued[0], 'referenceProject'));
  assert.deepEqual(state.batch, []);
  assert.deepEqual(state.pairs, []);
  assert.deepEqual(state.batchErrors, []);
  assert.equal(workspace.report().taskId, key.id);
  const previous = state.teacherKey;
  await assert.rejects(workspace.importKey('{}'), /Unsupported/);
  assert.equal(state.teacherKey, previous);
});

test('variant batches are atomic when the teacher registry has insufficient capacity', () => {
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Task',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  for (let i = 0; i < 199; i++) issueAssignment(key, { studentId: 's' + i });
  const state = {
    teacherKey: key,
    issued: [],
    teacherForm: sanitizeTeacherForm({
      title: key.title,
      instructions: key.instructions,
      starterMode: key.starterMode,
      probes: key.probes.map(({ node, side, port }) => `${node}:${side}:${port}`),
      studentIds: 'new-a\nnew-b',
    }),
  };
  const workspace = createTeacherWorkspace(state);
  assert.throws(() => workspace.issueVariants(), /200/);
  assert.equal(state.teacherKey.issued.length, 199);
  assert.equal(state.issued.length, 0);
  assert.equal(state.teacherForm.studentIds, 'new-a\nnew-b');
});

test('reference inspection distinguishes a changing result from a constant criterion', async () => {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const probes = [{ node: 'shift', port: 'out', side: 'outputs' }];
  const key = createAssignment({ title: 'Task', referenceProject: project, sequence, probes });
  assert.deepEqual(await inspectReference(key), { constant: false, undefined: false });
  const constant = structuredClone(key);
  constant.sequence.actions = [{ at: 0, node: 'ser', key: 'value', value: 1 }];
  assert.deepEqual(await inspectReference(constant), { constant: true, undefined: false });
});
