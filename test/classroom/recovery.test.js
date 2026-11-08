import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { createSequence, finishSequence } from '../../src/experiments/actions.js';
import { createAssignment, issueAssignment } from '../../src/assessment/index.js';
import { createClassroomStorage, CLASSROOM_RECOVERY_KEY } from '../../src/classroom/storage.js';
import { memoryStorage, sequenceFor } from './fixtures/classroom-session.js';

const DRAFT = 'logic-lab.classroom-draft';
function oldServo() {
  return {
    id: 'old-servo',
    type: 'servo',
    x: 0,
    y: 0,
    enabled: true,
    params: { minDuty: 0.18, maxDuty: 0.82, range: 180 },
  };
}
function legacySequence() {
  const sequence = finishSequence(createSequence(createExample('pwm-servos')), 0.1);
  const servo = sequence.initialProject.nodes.find((node) => node.type === 'servo');
  servo.params = oldServo().params;
  for (const wire of sequence.initialProject.wires)
    if (wire.to.node === servo.id) wire.from.port = 'duty';
  return sequence;
}
const encoded = (value) => JSON.stringify(value, null, 2) + '\n';

test('incompatible embedded servo sequences retain the exact local draft until recovery is handled', () => {
  const storage = memoryStorage();
  const raw = encoded({
    sequence: legacySequence(),
    notes: 'Пояснення студента',
    teacherForm: { title: 'Servo experiment' },
  });
  storage.setItem(DRAFT, raw);
  const store = createClassroomStorage(storage);
  const restored = store.load();
  assert.equal(restored.sequence, null);
  assert.equal(restored.notes, 'Пояснення студента');
  assert.equal(restored.teacherForm.title, 'Servo experiment');
  const recovery = store.recovery();
  assert.equal(recovery.raw, raw);
  assert.equal(recovery.kind, 'classroom-draft');
  assert.equal(recovery.backedUp, true);
  assert.equal(recovery.handled, false);
  assert.match(recovery.reason, /servo|duty|pulse/i);
  assert.equal(store.saveDraft({ ...restored, notes: 'Changed' }), false);
  assert.equal(storage.getItem(DRAFT), raw);
  assert.equal(store.acknowledgeRecovery('a different file'), false);
  assert.equal(store.acknowledgeRecovery(raw), true);
  assert.equal(store.saveDraft({ ...restored, notes: 'Changed' }), true);
  const backup = JSON.parse(storage.getItem(CLASSROOM_RECOVERY_KEY));
  assert.equal(backup.raw, raw);
  assert.equal(backup.handled, true);
  assert.equal(store.load().notes, 'Changed');
});

test('invalid assignment sections are recoverable while valid sequence and notes still restore', () => {
  const storage = memoryStorage();
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({ title: 'Task', referenceProject: project, sequence });
  const assignment = issueAssignment(key, { studentId: 's01' });
  assignment.starterProject.nodes.push(oldServo());
  const raw = encoded({ assignment, sequence, notes: 'Keep all original evidence.' });
  storage.setItem(DRAFT, raw);
  const store = createClassroomStorage(storage);
  const restored = store.load();
  assert.equal(restored.assignment, null);
  assert.equal(restored.sequence.actions.length, 2);
  assert.equal(restored.notes, 'Keep all original evidence.');
  assert.equal(store.recovery().raw, raw);
  assert.match(store.recovery().reason, /Assignment:/);
  assert.equal(storage.getItem(DRAFT), raw);
});

test('a full backup store prevents draft replacement, including a save without prior load', () => {
  const storage = memoryStorage();
  const raw = encoded({ sequence: legacySequence(), notes: 'Original' });
  storage.setItem(DRAFT, raw);
  const write = storage.setItem;
  let full = true;
  storage.setItem = (key, value) => {
    if (full && key === CLASSROOM_RECOVERY_KEY) throw new Error('quota');
    write(key, value);
  };
  let failures = 0;
  const store = createClassroomStorage(storage, () => failures++);
  assert.equal(store.saveDraft({ notes: 'New' }), false);
  assert.equal(store.recovery().backedUp, false);
  assert.equal(store.acknowledgeRecovery(raw), false);
  assert.equal(store.saveDraft({ notes: 'New' }), false);
  assert.equal(failures, 1);
  assert.equal(storage.getItem(DRAFT), raw);
  full = false;
  assert.equal(store.recovery().backedUp, true);
  assert.equal(store.acknowledgeRecovery(raw), true);
  assert.equal(store.saveDraft({ notes: 'New' }), true);
  assert.equal(JSON.parse(storage.getItem(CLASSROOM_RECOVERY_KEY)).raw, raw);
});

test('pending backups survive reload and a different invalid draft cannot overwrite them', () => {
  const storage = memoryStorage();
  const first = 'malformed draft one\n';
  const second = 'malformed draft two\n';
  storage.setItem(DRAFT, first);
  createClassroomStorage(storage).load();
  const reloaded = createClassroomStorage(storage);
  assert.equal(reloaded.recovery().raw, first);
  storage.setItem(DRAFT, second);
  assert.equal(reloaded.recovery().raw, first);
  assert.equal(reloaded.saveDraft({ notes: 'Replacement' }), false);
  assert.equal(JSON.parse(storage.getItem(CLASSROOM_RECOVERY_KEY)).raw, first);
  assert.equal(storage.getItem(DRAFT), second);
  assert.equal(reloaded.acknowledgeRecovery(first), true);
  assert.equal(JSON.parse(storage.getItem(CLASSROOM_RECOVERY_KEY)).raw, first);
  const next = reloaded.recovery();
  assert.equal(next.raw, second);
  assert.equal(next.handled, false);
  assert.equal(reloaded.saveDraft({ notes: 'Replacement' }), false);
  assert.equal(reloaded.acknowledgeRecovery(second), true);
  assert.equal(reloaded.saveDraft({ notes: 'Replacement' }), true);
});

test('valid draft saves keep teacher keys private and do not invent recovery files', () => {
  const storage = memoryStorage();
  const store = createClassroomStorage(storage);
  const sequence = sequenceFor(createExample('shift-register-sequence'));
  assert.equal(
    store.saveDraft({ sequence, notes: 'Result', teacherKey: { private: 'SECRET' } }),
    true,
  );
  assert.equal(store.recovery(), null);
  assert.ok(!storage.getItem(DRAFT).includes('SECRET'));
  assert.equal(storage.getItem(CLASSROOM_RECOVERY_KEY), null);
});

test('an unreadable original draft cannot be overwritten through a writable storage API', () => {
  let writes = 0;
  const storage = {
    getItem: () => {
      throw new Error('read denied');
    },
    setItem: () => writes++,
  };
  const store = createClassroomStorage(storage);
  assert.equal(store.load().sequence, null);
  assert.equal(store.saveDraft({ notes: 'Replacement' }), false);
  assert.equal(writes, 0);
});
