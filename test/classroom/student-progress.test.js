import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, student } from '../assessment/fixtures/lab-assessment.js';
import { createAttempt } from '../../src/assessment/index.js';
import {
  sequenceIsStale,
  studentProgress,
  progressMessage,
} from '../../src/classroom/student-progress.js';
import { studentPanel, studentWorkflow } from '../../src/classroom/student-view.js';

function ready() {
  const f = fixture();
  return {
    ...f,
    student,
    attempt: createAttempt(f.assignment, student),
    notes: 'I predicted the output and compared the result.',
    studentDirty: true,
  };
}

test('recording staleness ignores layout, labels and source operation but catches actual circuit changes', () => {
  const f = fixture(),
    project = structuredClone(f.project);
  project.nodes.reverse();
  project.nodes[0].x += 400;
  project.nodes[0].label = 'Renamed';
  project.nodes.find((n) => n.type === 'switch').params.value = 1;
  project.wires[0].points = [{ x: 20, y: 30 }];
  assert.equal(sequenceIsStale(f.sequence, project), false);
  project.wires.pop();
  assert.equal(sequenceIsStale(f.sequence, project), true);
});

test('each incomplete student stage gives a localized next action and blocks premature submission', () => {
  const state = ready(),
    project = state.project;
  assert.equal(studentProgress(state, project).ready, true);
  for (const [changes, code] of [
    [{ assignment: null }, 'task'],
    [{ student: { ...student, name: '' } }, 'identity'],
    [{ student: { ...student, id: 'wrong' } }, 'identityMismatch'],
    [{ attempt: null }, 'start'],
    [{ sequence: null, studentBuildReady: true }, 'record'],
    [{ notes: '' }, 'explain'],
    [{ recording: true }, 'recording'],
    [{ preview: {} }, 'playing'],
  ]) {
    const progress = studentProgress({ ...state, ...changes }, project);
    assert.equal(progress.code, code);
    assert.equal(progress.ready, false);
    assert.ok(progressMessage(progress, 'ua').length > 20);
    assert.notEqual(progressMessage(progress, 'ua'), progressMessage(progress, 'en'));
  }
  const changed = structuredClone(project);
  changed.wires.pop();
  const stale = studentProgress(state, changed);
  assert.equal(stale.code, 'stale');
  assert.match(progressMessage(stale, 'ua'), /Схему змінено/);
});

test('the student UI names Continue separately from Restart and explains a disabled export', () => {
  const state = ready();
  state.notes = '';
  const panel = studentPanel({ state, project: state.project, language: 'ua' });
  assert.match(panel, /Продовжити роботу/);
  assert.match(panel, /Почати заново/);
  assert.match(panel, /Відкрити мою роботу/);
  assert.match(panel, /Зберегти чернетку/);
  assert.match(
    panel,
    /id="student-submit"[^>]*aria-describedby="student-export-reason"[^>]*disabled/,
  );
  assert.match(panel, /Поясніть, що перевіряли/);
  const workflow = studentWorkflow({
    state,
    language: 'ua',
    progress: studentProgress(state, state.project),
  });
  for (const label of ['Завдання', 'Побудова', 'Запис перевірки', 'Пояснення', 'Збереження'])
    assert.ok(workflow.includes(label));
  assert.match(workflow, /data-student-condition/);
  assert.match(workflow, /Add|Додати пояснення/);
});

test('reviewing another student sequence never marks the original saved work dirty or stale', async () => {
  const { createStudentProgressController } = await import(
    '../../src/classroom/student-progress-controller.js'
  );
  const state = ready();
  state.studentDirty = false;
  state.studentLastSaveKind = 'submission';
  const original = state.sequence;
  const reviewed = structuredClone(original);
  reviewed.initialProject.wires.pop();
  const previous = globalThis.document;
  globalThis.document = { querySelector: () => null };
  let saves = 0;
  try {
    const controller = createStudentProgressController({
      adapter: { getLanguage: () => 'ua' },
      state,
      session: { projectToSave: () => state.project, sequenceToSave: () => original },
      actions: {},
      controls: {},
      open() {},
      safe: (action) => action,
      persistDraft: () => saves++,
    });
    state.reviewMode = 'replay';
    state.player = {};
    state.sequence = reviewed;
    const reviewing = controller.update();
    assert.equal(reviewing.stale, false);
    assert.equal(reviewing.code, 'playing');
    assert.equal(state.studentDirty, false);
    assert.equal(saves, 0);
    state.reviewMode = null;
    state.player = null;
    state.sequence = original;
    assert.equal(controller.update().saved, true);
    assert.equal(state.studentDirty, false);
    assert.equal(saves, 0);
  } finally {
    globalThis.document = previous;
  }
});
