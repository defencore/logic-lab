import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudentReplacement } from '../../src/classroom/student-replacement.js';

function reviewFixture(saveDraft) {
  const buttons = new Map(
    ['student-replace-cancel', 'student-replace-save', 'student-replace-confirm'].map((id) => [
      id,
      { disabled: false },
    ]),
  );
  const events = [];
  const prior = globalThis.document;
  globalThis.document = {
    querySelector: (selector) => buttons.get(selector.slice(1)),
    querySelectorAll: () => [...buttons.values()],
  };
  const review = createStudentReplacement({
    adapter: {
      showModal() {
        events.push('review');
      },
      closeModal() {
        events.push('cancel');
      },
      getProject: () => ({ name: 'Student circuit' }),
    },
    state: { attempt: { journal: [{}] }, sequence: { actions: [{}] } },
    L: (ua) => ua,
    safe: (action) => action,
    operations: { run: async (action) => action() },
    guardEditableSession() {},
    saveDraft,
  });
  review({
    title: 'Restart?',
    description: 'Replace work',
    confirm: 'Restart without copy',
    apply: () => events.push('replace'),
  });
  return { buttons, events, restore: () => (globalThis.document = prior) };
}

test('replacement review keeps current work until a choice and saves a portable copy before replacement', async () => {
  let events;
  const f = reviewFixture(async () => events.push('saved'));
  events = f.events;
  try {
    assert.deepEqual(events, ['review']);
    await f.buttons.get('student-replace-save').onclick();
    assert.deepEqual(events, ['review', 'saved', 'replace']);
  } finally {
    f.restore();
  }
});

test('failed backup and cancel both preserve the existing attempt', async () => {
  const f = reviewFixture(async () => {
    throw new Error('Cannot export');
  });
  try {
    await assert.rejects(f.buttons.get('student-replace-save').onclick(), /Cannot export/);
    assert.deepEqual(f.events, ['review']);
    assert.ok([...f.buttons.values()].every((button) => !button.disabled));
    f.buttons.get('student-replace-cancel').onclick();
    assert.deepEqual(f.events, ['review', 'cancel']);
  } finally {
    f.restore();
  }
});
