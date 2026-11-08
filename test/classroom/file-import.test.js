import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, submissionFixture, student } from '../assessment/fixtures/lab-assessment.js';
import { createAttempt } from '../../src/assessment/index.js';
import { FileImportError } from '../../src/shared/file-errors.js';
import { fileErrorMessage } from '../../src/classroom/file-error-messages.js';
import { parseClassroomImport } from '../../src/classroom/import-file.js';
import { createStudentActions } from '../../src/classroom/student-actions.js';
import { createStudentWork, parseStudentWork } from '../../src/classroom/student-work-files.js';
import { createTeacherWorkspace } from '../../src/classroom/teacher-workspace.js';
import { readClassroomFile } from '../../src/classroom/files.js';

function editing(f = fixture()) {
  const state = {
    ...f,
    student: { ...student },
    attempt: createAttempt(f.assignment, student),
    notes: 'Preserve this explanation',
    observations: [],
    studentDirty: false,
    studentLastSaveKind: 'submission',
  };
  const before = structuredClone(state);
  const project = f.project;
  let mutations = 0;
  const changed = () => mutations++;
  const actions = createStudentActions({
    state,
    adapter: {
      getProject: () => project,
      getRuntime: () => ({ time: 12 }),
      loadProject: changed,
      closeModal: changed,
      setRunning: changed,
      notify: changed,
      getLanguage: () => 'ua',
    },
    session: { projectToSave: () => project },
    store: { saveProfile: changed },
    L: (ua) => ua,
    guardEditableSession() {},
    operations: { run: (action) => action() },
    review: changed,
    changed,
  });
  return { state, before, project, actions, mutations: () => mutations };
}

test('Open my work identifies assignments, circuit projects, keys and action sequences and explains the correct destination in both languages', async () => {
  const f = fixture();
  for (const [value, actual, ua, en] of [
    [f.assignment, 'assignment', /Відкрити завдання викладача/, /Open instructor assignment/],
    [f.project, 'project', /«Файли проєкту» → «Імпорт проєкту»/, /Project files → Import project/],
    [
      f.sequence,
      'sequence',
      /«Сценарій дій» → «Відкрити сценарій»/,
      /Action sequence → Open sequence/,
    ],
    [f.key, 'teacher-key', /лише в режимі «Викладач»/, /only in Instructor/],
  ]) {
    await assert.rejects(parseStudentWork(JSON.stringify(value)), (error) => {
      assert.equal(error.code, 'file_wrong_kind');
      assert.equal(error.actual, actual);
      assert.match(fileErrorMessage(error, { language: 'ua' }), ua);
      assert.match(fileErrorMessage(error, { language: 'en' }), en);
      return true;
    });
  }
});

test('wrong file kinds and malformed JSON cannot change a student attempt, circuit, recording, explanation or saved status', async () => {
  const c = editing();
  for (const source of [
    JSON.stringify(c.state.assignment),
    JSON.stringify(c.project),
    JSON.stringify(c.state.key),
    JSON.stringify(c.state.sequence),
    '{"kind":',
    'null',
  ]) {
    await assert.rejects(c.actions.importWork(source), FileImportError);
    assert.deepEqual(c.state, c.before);
    assert.equal(c.state.project, c.project);
    assert.equal(c.mutations(), 0);
  }
  assert.throws(() => c.actions.importAssignment(JSON.stringify(c.project)), {
    code: 'file_wrong_kind',
    actual: 'project',
  });
  assert.deepEqual(c.state, c.before);
  assert.equal(c.mutations(), 0);
});

test('corrupt JSON and edited draft/submission checksums explain recovery and leave current work untouched', async () => {
  const f = await submissionFixture();
  const c = editing(f);
  const draft = await createStudentWork({ ...c.state, project: c.project });
  draft.notes = 'Edited after exporting';
  const submission = structuredClone(f.submission);
  submission.notes = 'Edited after exporting';
  for (const [source, code, reason] of [
    ['{"kind":', 'file_invalid_json', /JSON/],
    [JSON.stringify(draft), 'file_checksum', /цілісності/],
    [JSON.stringify(submission), 'file_checksum', /цілісності/],
  ]) {
    await assert.rejects(c.actions.importWork(source), (error) => {
      assert.equal(error.code, code);
      const ua = fileErrorMessage(error, { language: 'ua' });
      assert.match(ua, reason);
      assert.match(ua, /оригінальним файлом/);
      assert.match(ua, /Поточну роботу не змінено/);
      assert.match(fileErrorMessage(error, { language: 'en' }), /original file/);
      return true;
    });
    assert.deepEqual(c.state, c.before);
    assert.equal(c.mutations(), 0);
  }
});

test('unsupported instructor keys request a current key in instructor mode and a newly issued assignment in student mode', async () => {
  const f = fixture();
  const state = { teacherKey: f.key, issued: [f.assignment], batch: ['Keep review'] };
  const before = structuredClone(state);
  let saves = 0;
  const teacher = createTeacherWorkspace(state, { onSave: () => saves++ });
  for (const version of [0, 2, '1', undefined]) {
    const source = JSON.stringify({ ...f.key, version });
    await assert.rejects(teacher.importKey(source), (error) => {
      assert.equal(error.code, 'file_unsupported_version');
      assert.equal(error.actual, 'teacher-key');
      const ua = fileErrorMessage(error, { language: 'ua', mode: 'teacher' });
      assert.match(ua, /актуальний ключ/);
      assert.match(ua, /«Викладач» → «Відкрити ключ викладача»/);
      assert.match(
        fileErrorMessage(error, { language: 'en', mode: 'teacher' }),
        /Get a current key/,
      );
      assert.match(
        fileErrorMessage(error, { language: 'ua', mode: 'student' }),
        /видати вам новий файл завдання/,
      );
      return true;
    });
    assert.deepEqual(state, before);
    assert.equal(saves, 0);
  }
});

test('schema validation errors retain their cause and become localized import errors without partial fallback', () => {
  const f = fixture();
  const error = new Error('Missing required component');
  assert.throws(
    () =>
      parseClassroomImport(JSON.stringify(f.assignment), 'assignment', () => {
        throw error;
      }),
    (failure) => {
      assert.equal(failure.code, 'file_invalid_data');
      assert.equal(failure.cause, error);
      assert.match(
        fileErrorMessage(failure, { language: 'ua' }),
        /пошкоджені або непідтримувані дані/,
      );
      return true;
    },
  );
  assert.equal(
    fileErrorMessage(new Error('Unrelated error'), { language: 'ua' }),
    'Unrelated error',
  );
});

test('a version-one instructor key with obsolete reference data requests a fresh key without replacing the active one', async () => {
  const f = fixture();
  const state = { teacherKey: f.key, issued: [f.assignment] };
  const before = structuredClone(state);
  const obsolete = structuredClone(f.key);
  obsolete.referenceProject.nodes[0].type = 'legacy-source';
  const teacher = createTeacherWorkspace(state);
  await assert.rejects(teacher.importKey(JSON.stringify(obsolete)), (error) => {
    assert.equal(error.code, 'file_invalid_data');
    assert.equal(error.actual, 'teacher-key');
    assert.match(
      fileErrorMessage(error, { language: 'ua', mode: 'teacher' }),
      /Отримайте актуальний ключ/,
    );
    assert.match(fileErrorMessage(error, { language: 'en', mode: 'teacher' }), /Get a current key/);
    assert.match(
      fileErrorMessage(error, { language: 'ua', mode: 'student' }),
      /видати вам новий файл завдання/,
    );
    return true;
  });
  assert.deepEqual(state, before);
});

test('file read failures and size limits have explicit localized reasons', async () => {
  await assert.rejects(readClassroomFile({ size: 10_000_001 }), { code: 'file_too_large' });
  await assert.rejects(
    readClassroomFile({
      size: 10,
      text: async () => {
        throw new Error('Disk unavailable');
      },
    }),
    (error) => {
      assert.equal(error.code, 'file_unreadable');
      assert.match(fileErrorMessage(error, { language: 'ua' }), /Не вдалося прочитати файл/);
      assert.match(fileErrorMessage(error, { language: 'en' }), /could not be read/);
      return true;
    },
  );
});
