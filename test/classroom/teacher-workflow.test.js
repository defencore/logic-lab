import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import {
  createAssignment,
  issueAssignment,
  serializeAssignmentKey,
} from '../../src/assessment/index.js';
import { createTeacherWorkspace, probeKey } from '../../src/classroom/teacher-workspace.js';
import { sanitizeTeacherForm, createClassroomStorage } from '../../src/classroom/storage.js';
import { createClassroomView } from '../../src/classroom/view.js';
import { sequenceFor } from './fixtures/classroom-session.js';

function fixture() {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({
    title: 'Title A',
    instructions: 'Instructions A',
    referenceProject: project,
    sequence,
  });
  const task = issueAssignment(key, { studentId: 'old', seed: 'original' });
  const state = {
    teacherKey: key,
    sequence,
    issued: [task],
    teacherForm: sanitizeTeacherForm({
      title: key.title,
      instructions: key.instructions,
      starterMode: key.starterMode,
      probes: key.probes.map(probeKey),
      studentIds: 'new',
    }),
    referenceWarnings: {},
    batch: [],
    pairs: [],
    batchErrors: [],
  };
  return { project, sequence, key, task, state, teacher: createTeacherWorkspace(state) };
}

test('A→edit B→issue cannot silently issue A; Apply updates old and new variant files', () => {
  const { state, teacher, task } = fixture();
  state.teacherForm.title = 'Title B';
  state.teacherForm.instructions = 'Instructions B';
  assert.equal(teacher.status().metadataChanged, true);
  assert.throws(() => teacher.issueVariants(), /unapplied changes/);
  assert.equal(state.teacherKey.issued.length, 1);
  teacher.applyChanges();
  teacher.issueVariants();
  assert.deepEqual(
    state.issued.map((entry) => entry.instructions),
    ['Instructions B', 'Instructions B'],
  );
  assert.equal(state.issued[0].id, task.id);
  assert.equal(teacher.status().dirty, false);
  assert.equal(teacher.status().keyNeedsDownload, true);
  teacher.markKeyDownloaded();
  assert.equal(teacher.status().keyNeedsDownload, false);
  state.teacherForm.studentIds = 'another';
  teacher.issueVariants();
  assert.equal(
    teacher.status().keyNeedsDownload,
    true,
    'the updated issued registry needs a new key download',
  );
});

test('changing probes or starter requires a separate new key and retains the previous issued key', async () => {
  const { state, teacher, project, key, task } = fixture();
  state.teacherForm.starterMode = 'components';
  assert.equal(teacher.status().structuralChanged, true);
  assert.throws(() => teacher.applyChanges(), /new reference key/);
  assert.throws(() => teacher.issueVariants(), /unapplied changes/);
  await teacher.createKey(key.probes, project);
  assert.notEqual(state.teacherKey.id, key.id);
  assert.equal(state.teacherKey.issued.length, 0);
  assert.equal(state.teacherArchives[0].key.id, key.id);
  assert.equal(state.teacherArchives[0].key.issued[0].id, task.id);
});

test('a changed reference cannot masquerade as the applied key; an explicit saved-reference choice is visible and expires', async () => {
  const { state, teacher, project, key } = fixture();
  await teacher.importKey(serializeAssignmentKey(key), project);
  const oldBaseline = state.teacherSequenceBaseline;
  state.sequence = structuredClone(state.sequence);
  state.sequence.duration += 0.1;
  assert.equal(teacher.status(project).referenceChanged, true);
  state.teacherForm.studentIds = 'new';
  assert.throws(() => teacher.issueVariants(project), /unapplied/);
  teacher.discardChanges(project);
  assert.equal(state.teacherSequenceBaseline, oldBaseline);
  assert.equal(teacher.status(project).referenceChanged, true);
  assert.equal(teacher.status(project).usingSavedReference, true);
  teacher.issueVariants(project);
  assert.equal(state.teacherKey.sequence.duration, key.sequence.duration);
  state.sequence.duration += 0.1;
  assert.equal(teacher.status(project).usingSavedReference, false);
  assert.throws(() => teacher.issueVariants(project), /unapplied/);
});

test('new reference creation rejects a circuit changed after its recording', async () => {
  const { teacher, project, key, state } = fixture();
  project.wires.pop();
  await assert.rejects(teacher.createKey(key.probes, project), /changed after recording/);
  assert.equal(state.teacherKey.id, key.id);
});

test('probe checkbox order alone does not invalidate an imported grading reference', () => {
  const { state, teacher } = fixture();
  state.teacherForm.probes.reverse();
  assert.equal(teacher.status().structuralChanged, false);
  state.teacherForm.instructions = 'Metadata only';
  teacher.applyChanges();
  assert.equal(state.teacherKey.instructions, 'Metadata only');
});

test('private active and archived keys are never written with the locally saved form', () => {
  const { state } = fixture();
  const values = new Map();
  const storage = createClassroomStorage({
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
  });
  state.teacherArchives = [{ key: state.teacherKey }];
  storage.saveDraft(state);
  const saved = [...values.values()].join('');
  assert.doesNotMatch(saved, /logic-lab-assignment-key/);
  assert.ok(!saved.includes(state.teacherKey.id));
  assert.ok(!saved.includes(state.teacherKey.issued[0].seed));
});

test('an imported key keeps its own selected probe context when the editor contains another circuit', async () => {
  const { teacher, state, key } = fixture();
  const unrelated = createExample('half-adder');
  state.sequence = null;
  await teacher.importKey(serializeAssignmentKey(key), unrelated);
  const view = createClassroomView({
    state: { ...state, mode: 'teacher', observations: [] },
    language: 'en',
    project: unrelated,
  });
  const candidates = view.possibleProbes();
  assert.ok(
    key.probes.every((probe) =>
      candidates.some((candidate) => probeKey(candidate) === probeKey(probe)),
    ),
  );
  state.teacherForm.instructions = 'Clarified instructions';
  assert.equal(teacher.status(unrelated).structuralChanged, false);
  teacher.applyChanges(unrelated);
  assert.equal(state.teacherKey.instructions, 'Clarified instructions');
});
