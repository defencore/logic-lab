import test from 'node:test';
import assert from 'node:assert/strict';
import { trimFixture } from './fixtures/sequence-trim.js';
import { sequenceWork } from '../../src/experiments/replay-work-policy.js';
import { parseSequence } from '../../src/experiments/actions.js';

test('preview keeps the entire ordered same-time action group and counts removals in both languages', async (t) => {
  for (const language of ['en', 'ua'])
    await t.test(language, (t) => {
      const f = trimFixture(t, { language });
      const before = structuredClone(f.state.sequence),
        project = structuredClone(f.project),
        runtime = f.runtime;
      f.open();
      f.cutoff(1);
      assert.match(f.element('preview').textContent, /3\/4/);
      assert.match(
        f.element('preview').textContent,
        language === 'ua' ? /Вилучено 1|вилучено 1/ : /Remove 1/,
      );
      assert.equal(f.element('apply').disabled, false);
      assert.match(
        f.markup,
        language === 'ua' ? /Усі дії на цій часовій позначці/ : /All actions at that timestamp/,
      );
      f.cutoff(0);
      assert.match(f.element('preview').textContent, /1\/4/);
      assert.equal(f.element('apply').disabled, false, 'an initial action at0 can be retained');
      assert.deepEqual(f.state.sequence, before);
      assert.deepEqual(f.project, project);
      assert.equal(f.runtime, runtime);
      assert.equal(f.calls.length, 0);
    });
});

test('invalid cutoffs and cutoffs retaining no actions disable Apply without changing the sequence', async (t) => {
  const f = trimFixture(t);
  f.original.actions = f.original.actions.filter(({ at }) => at > 0);
  const before = structuredClone(f.original);
  f.open();
  for (const cutoff of ['', 'not-a-number', -1, 0, 0.5, 3, 4, Infinity]) {
    f.cutoff(cutoff);
    assert.equal(f.element('apply').disabled, true, String(cutoff));
    await f.element('apply').onclick();
  }
  assert.deepEqual(f.original, before);
  assert.equal(f.calls.length, 0);
  assert.equal(f.notifications.length, 0);
  assert.equal(f.closed, 0);
});

test('an otherwise valid retained prefix exceeding the actual replay-work policy cannot be applied', async (t) => {
  const f = trimFixture(t, { heavy: true });
  const work = sequenceWork(f.original);
  assert.equal(work.supported, false);
  assert.ok(work.maxDuration < f.original.duration);
  f.open();
  f.cutoff(f.original.duration - 0.001);
  assert.equal(f.element('apply').disabled, true);
  assert.match(f.element('preview').textContent, /checking budget/);
  await f.element('apply').onclick();
  assert.equal(f.calls.length, 0);
  assert.equal(f.state.sequence, f.original);
  f.cutoff(work.maxDuration);
  assert.equal(f.element('apply').disabled, false, 'the advertised supported prefix is actionable');
});

test('Apply performs the real detached trim under the operation lock and reports the actual shortened result', async (t) => {
  const f = trimFixture(t);
  const before = structuredClone(f.original),
    project = structuredClone(f.project),
    runtime = f.runtime;
  const journal = f.state.attempt.journal;
  f.open();
  f.cutoff(1);
  await f.element('apply').onclick();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].cutoff, 1);
  assert.equal(f.calls[0].locked, true);
  assert.deepEqual(f.locks, [true, false]);
  assert.equal(f.state.busy, false);
  assert.equal(f.state.sequence.duration, 1);
  assert.deepEqual(f.state.sequence.actions, before.actions.slice(0, 3));
  assert.deepEqual(f.original, before, 'the original remains available for backup');
  assert.deepEqual(f.project, project, 'trimming does not adopt its detached playback project');
  assert.equal(f.runtime, runtime);
  assert.equal(f.runtime.time, 7);
  assert.equal(f.adopted, 0);
  assert.equal(f.state.notes, 'Keep this explanation');
  assert.equal(f.state.attempt.journal, journal);
  assert.equal(f.closed, 1);
  assert.match(f.notifications.at(-1), /1\.000 s.*1/);
});

test('Cancel discards only the preview and Save original exports every untrimmed action', async (t) => {
  const f = trimFixture(t);
  const before = structuredClone(f.state),
    project = structuredClone(f.project),
    runtime = f.runtime;
  let blob,
    filename,
    clicks = 0;
  document.createElement = () => ({
    set download(value) {
      filename = value;
    },
    click() {
      clicks++;
    },
  });
  t.mock.method(URL, 'createObjectURL', (value) => {
    blob = value;
    return 'blob:trim-original';
  });
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.mock.method(globalThis, 'setTimeout', (callback) => callback());
  f.open();
  f.cutoff(1);
  f.element('copy').onclick();
  const saved = parseSequence(await blob.text());
  assert.equal(saved.duration, 3);
  assert.equal(saved.actions.length, 4);
  assert.deepEqual(saved, f.original);
  assert.equal(filename, 'Trim experiment.original.actions.json');
  assert.equal(clicks, 1);
  f.element('cancel').onclick();
  assert.equal(f.closed, 1);
  assert.deepEqual(f.state, before);
  assert.deepEqual(f.project, project);
  assert.equal(f.runtime, runtime);
  assert.equal(f.calls.length, 0);
});

test('busy or active recording/review sessions cannot open or apply a trim', async (t) => {
  const f = trimFixture(t);
  f.state.busy = true;
  assert.throws(f.open, /Wait/);
  f.state.busy = false;
  for (const field of ['recording', 'player', 'preview']) {
    f.state[field] = true;
    assert.throws(f.open, /Finish recording or replay/);
    f.state[field] = field === 'recording' ? false : null;
  }
  f.open();
  f.cutoff(1);
  f.state.busy = true;
  await f.element('apply').onclick();
  assert.equal(f.calls.length, 0);
  assert.equal(f.state.sequence, f.original);
  assert.match(f.notifications.at(-1), /Wait/);
  assert.equal(f.closed, 0);
});

test('Cancel, close icon, Escape and backdrop abort an in-flight trim without replacing any work or showing an error', async (t) => {
  for (const close of ['cancel', 'icon', 'escape', 'backdrop'])
    await t.test(close, async (t) => {
      let signal;
      const f = trimFixture(t, {
        trim({ options }) {
          signal = options.signal;
          return new Promise((_, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                const error = new Error('Cancelled');
                error.name = 'AbortError';
                reject(error);
              },
              { once: true },
            );
          });
        },
      });
      const before = structuredClone(f.state),
        project = structuredClone(f.project),
        runtime = f.runtime;
      f.open();
      f.cutoff(1);
      const promise = f.element('apply').onclick();
      assert.equal(f.operations.isBusy(), true);
      for (const id of ['until', 'copy', 'apply']) assert.equal(f.element(id).disabled, true);
      assert.equal(f.element('cancel').disabled, false);
      assert.equal(signal.aborted, false);
      if (close === 'cancel') f.element('cancel').onclick();
      if (close === 'icon') f.modalElement('#close-modal').onclick();
      if (close === 'escape') {
        const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
        f.modalElement('.modal').dispatchEvent(event);
        assert.equal(event.defaultPrevented, true);
      }
      if (close === 'backdrop') {
        const backdrop = f.modalElement('.modal-backdrop');
        backdrop.onclick({ target: {}, currentTarget: backdrop });
        assert.equal(signal.aborted, false, 'clicking modal content is not a cancellation');
        backdrop.onclick({ target: backdrop, currentTarget: backdrop });
      }
      await promise;
      assert.equal(signal.aborted, true);
      assert.equal(f.closed, 1);
      assert.equal(f.operations.isBusy(), false);
      assert.deepEqual(f.locks, [true, false]);
      assert.deepEqual(f.state, before);
      assert.deepEqual(f.project, project);
      assert.equal(f.runtime, runtime);
      assert.equal(f.adopted, 0);
      assert.deepEqual(f.notifications, []);
      assert.deepEqual(f.changes, []);
    });
});

test('failed detached recomputation preserves the original and re-enables this modal for retry', async (t) => {
  const f = trimFixture(t, {
    trim: async () => {
      throw new Error('Detached replay failed');
    },
  });
  const before = structuredClone(f.original),
    project = structuredClone(f.project),
    runtime = f.runtime;
  f.open();
  f.cutoff(1);
  await f.element('apply').onclick();
  assert.deepEqual(f.original, before);
  assert.equal(f.state.sequence, f.original);
  assert.deepEqual(f.project, project);
  assert.equal(f.runtime, runtime);
  assert.equal(f.closed, 0);
  assert.deepEqual(f.locks, [true, false]);
  assert.equal(f.element('until').disabled, false);
  assert.equal(f.element('copy').disabled, false);
  assert.equal(f.element('apply').disabled, false);
  assert.match(f.element('preview').textContent, /3\/4/);
  assert.deepEqual(f.notifications, ['Detached replay failed']);
});
