import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomOperations, readClassroomFile } from '../../src/classroom/files.js';

test('asynchronous classroom operations reject overlaps and unlock after failure', async () => {
  const transitions = [];
  const gate = createClassroomOperations((busy) => transitions.push(busy));
  let release;
  const pending = gate.run(() => new Promise((resolve) => (release = resolve)));
  assert.equal(gate.isBusy(), true);
  await assert.rejects(
    gate.run(() => {}),
    /Wait/,
  );
  release('done');
  assert.equal(await pending, 'done');
  await assert.rejects(
    gate.run(() => {
      throw Error('invalid file');
    }),
    /invalid file/,
  );
  assert.equal(gate.isBusy(), false);
  assert.deepEqual(transitions, [true, false, true, false]);
});

test('operation lock is released if updating its busy indicator fails', async () => {
  const gate = createClassroomOperations((busy) => {
    if (busy) throw Error('detached view');
  });
  await assert.rejects(
    gate.run(() => {}),
    /detached view/,
  );
  assert.equal(gate.isBusy(), false);
});

test('classroom file reads enforce the actual 10 MB import contract before reading', async () => {
  let read = false;
  await assert.rejects(
    readClassroomFile({
      size: 10000001,
      text: () => {
        read = true;
        return '{}';
      },
    }),
    /10 MB/,
  );
  assert.equal(read, false);
  assert.equal(await readClassroomFile({ size: 2, text: async () => '{}' }), '{}');
});
