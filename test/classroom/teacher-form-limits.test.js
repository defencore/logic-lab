import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomStorage, sanitizeTeacherForm } from '../../src/classroom/storage.js';
import { memoryStorage } from './fixtures/classroom-session.js';

const contacts = (count) =>
  Array.from({ length: count }, (_, index) => `gate_${index}:outputs:out`);

test('all32 selected contacts survive the teacher form and a33rd fails without changing the previous selection', () => {
  const selected = contacts(32),
    input = { title: 'Keep all criteria', probes: selected };
  const result = sanitizeTeacherForm(input);
  assert.deepEqual(result.probes, selected);
  assert.notEqual(result.probes, selected);
  assert.throws(() => sanitizeTeacherForm({ ...input, probes: contacts(33) }), {
    code: 'teacher_probe_limit',
  });
  assert.deepEqual(result.probes, selected);
  for (const probes of [
    ['not a contact'],
    [selected[0], selected[0]],
    [selected[0], null],
    'gate:outputs:out',
  ])
    assert.throws(() => sanitizeTeacherForm({ probes }), { code: 'teacher_probe_invalid' });
  assert.deepEqual(sanitizeTeacherForm({ probes: [] }).probes, []);
  assert.equal(sanitizeTeacherForm().probes, null);
});

test('saving an invalid criterion list never overwrites a valid saved classroom draft', () => {
  const storage = memoryStorage();
  let failures = 0;
  const store = createClassroomStorage(storage, () => failures++);
  assert.equal(
    store.saveDraft({ notes: 'Preserve evidence', teacherForm: { probes: contacts(32) } }),
    true,
  );
  const before = storage.getItem('logic-lab.classroom-draft');
  assert.equal(
    store.saveDraft({ notes: 'Bad replacement', teacherForm: { probes: contacts(33) } }),
    false,
  );
  assert.equal(store.saveDraft({ teacherForm: { probes: ['invalid'] } }), false);
  assert.equal(storage.getItem('logic-lab.classroom-draft'), before);
  assert.equal(failures, 1);
  assert.deepEqual(store.load().teacherForm.probes, contacts(32));
});

test('a previously oversize saved teacher form is explicitly recoverable while unrelated student work survives', () => {
  const storage = memoryStorage();
  const raw = JSON.stringify({
    notes: 'Keep this explanation',
    teacherForm: { title: 'Old criteria', probes: contacts(33) },
  });
  storage.setItem('logic-lab.classroom-draft', raw);
  const store = createClassroomStorage(storage),
    restored = store.load();
  assert.equal(restored.notes, 'Keep this explanation');
  assert.equal(restored.teacherForm.probes, null);
  assert.match(store.recovery().reason, /Teacher form:.*32/);
  assert.equal(store.recovery().raw, raw);
  assert.equal(storage.getItem('logic-lab.classroom-draft'), raw);
  assert.equal(store.saveDraft({ notes: 'Do not overwrite original' }), false);
});
