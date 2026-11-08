import test from 'node:test';
import assert from 'node:assert/strict';
import { keypadFixture } from './fixtures/keypad.js';
import { KEYPAD_KEYS } from '../../src/components/keypad.js';
import { createExample } from '../../examples/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { advanceRuntime } from '../../src/simulation/advance.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { replaySequence, parseSequence, serializeSequence } from '../../src/experiments/actions.js';
import { KEYPAD_QUEUE_LIMIT } from '../../src/application/keypad-controller.js';

function move(f, at) {
  simulate(f.project, f.runtime, at - f.runtime.time);
  f.controller.reconcile();
}
const values = (f) => f.writes.map(({ keys }) => keys);
function tap(f, id, index) {
  assert.equal(f.controller.press(id, index), true);
  assert.equal(
    f.controller.release(id, index),
    false,
    'pulse duration is independent of pointerup',
  );
}
function openLock(f) {
  f.project = createExample('keypad-code-lock');
  f.project.nodes.find(({ id }) => id === 'keypad').params = {
    mode: 'pulse',
    keys: 0,
    pulseDuration: 0.04,
  };
  f.runtime = createRuntime();
  simulate(f.project, f.runtime, 0);
  f.controller.reconcile();
}
function runLock(f, seconds, frame = 0.005) {
  const target = f.runtime.time + seconds;
  while (f.runtime.time < target - 1e-10) {
    const step = Math.min(frame, target - f.runtime.time);
    assert.equal(advanceRuntime(f.project, f.runtime, step, { maxSteps: 5000 }).reached, true);
    f.controller.reconcile();
  }
}

test('zero-time taps queue distinct contacts with a complete released gap, including a repeated key', (t) => {
  const f = keypadFixture(t, 'pulse');
  tap(f, 'pad', 1);
  tap(f, 'pad', 1);
  tap(f, 'pad', 4);
  assert.deepEqual(f.controller.status('pad'), { pending: 2, active: true });
  assert.deepEqual(values(f), [2]);
  move(f, 0.039);
  assert.equal(f.node().params.keys, 2);
  move(f, 0.04);
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(f.controller.status('pad'), { pending: 2, active: false });
  move(f, 0.049);
  assert.equal(f.node().params.keys, 0);
  move(f, 0.05);
  assert.equal(f.node().params.keys, 2);
  move(f, 0.09);
  move(f, 0.1);
  assert.equal(f.node().params.keys, 16);
  move(f, 0.14);
  assert.deepEqual(values(f), [2, 0, 2, 0, 16, 0]);
  assert.deepEqual(f.controller.status('pad'), { pending: 0, active: false });
});

test('paused input stays visibly pending and slow model time controls pulse expiry without wall timers', (t) => {
  const f = keypadFixture(t, 'pulse');
  tap(f, 'pad', 0);
  tap(f, 'pad', 4);
  for (let frame = 0; frame < 200; frame++) f.controller.reconcile();
  assert.equal(f.runtime.time, 0);
  assert.deepEqual(values(f), [1]);
  assert.deepEqual(f.controller.status('pad'), { pending: 1, active: true });
  // Twenty 20ms wall frames at0.1× advance only40ms in the model.
  for (let frame = 1; frame < 20; frame++) move(f, frame * 0.02 * 0.1);
  assert.equal(f.node().params.keys, 1);
  move(f, 0.04);
  assert.equal(f.node().params.keys, 0);
  move(f, 0.05);
  assert.equal(f.node().params.keys, 16);
  move(f, 0.09);
  assert.deepEqual(values(f), [1, 0, 16, 0]);
});

test('a delayed frame records actual transition times and cannot replay queued contacts as backdated zero-width pulses', (t) => {
  const f = keypadFixture(t, 'pulse');
  tap(f, 'pad', 0);
  tap(f, 'pad', 1);
  move(f, 1);
  assert.deepEqual(values(f), [1, 0]);
  assert.deepEqual(f.controller.status('pad'), { pending: 1, active: false });
  move(f, 1.009);
  assert.equal(f.node().params.keys, 0);
  move(f, 1.01);
  move(f, 1.05);
  assert.deepEqual(
    f.writes.map(({ at }) => at),
    [0, 1, 1.01, 1.05],
  );
});

test('the queue is bounded to128 outstanding activations and a rejected extra tap changes no contact', (t) => {
  const f = keypadFixture(t, 'pulse');
  for (let index = 0; index < KEYPAD_QUEUE_LIMIT; index++) tap(f, 'pad', index % 12);
  assert.deepEqual(f.controller.status('pad'), { pending: 127, active: true });
  const before = [...f.writes];
  assert.equal(f.controller.press('pad', 11), false);
  assert.deepEqual(f.writes, before);
  f.controller.suspend();
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(f.controller.status('pad'), { pending: 0, active: false });
});

test('live cancellation, configuration changes and teardown clear active contacts and queued future work', async (t) => {
  for (const reason of [
    'suspend',
    'blur',
    'hidden',
    'disabled',
    'mode',
    'lock',
    'backwards',
    'dispose',
  ])
    await t.test(reason, (t) => {
      const f = keypadFixture(t, 'pulse');
      move(f, 0.1);
      tap(f, 'pad', 0);
      tap(f, 'pad', 4);
      if (reason === 'suspend') f.controller.suspend();
      if (reason === 'blur') window.dispatchEvent(new Event('blur'));
      if (reason === 'hidden') {
        document.hidden = true;
        document.dispatchEvent(new Event('visibilitychange'));
      }
      if (reason === 'disabled') f.node().enabled = false;
      if (reason === 'mode') f.node().params.mode = 'toggle';
      if (reason === 'lock') f.flags.writable = false;
      if (reason === 'backwards') f.runtime.time = 0;
      if (reason === 'dispose') f.controller.dispose();
      f.controller.reconcile();
      assert.equal(f.node().params.keys, 0);
      assert.deepEqual(f.controller.status('pad'), { pending: 0, active: false });
      move(f, 0.5);
      assert.equal(f.node().params.keys, 0, 'canceled work cannot return after time advances');
    });
});

test('foreign project replacement clears only the original queue and preserves a readonly imported mask', (t) => {
  const f = keypadFixture(t, 'pulse');
  tap(f, 'pad', 0);
  tap(f, 'pad', 4);
  const original = f.project;
  f.project = structuredClone(original);
  f.flags.writable = false;
  f.controller.reconcile();
  assert.equal(original.nodes[0].params.keys, 0);
  assert.equal(f.node().params.keys, 1);
  assert.deepEqual(f.controller.status('pad'), { pending: 0, active: false });
  assert.equal(f.controller.press('pad', 2), false);
  assert.equal(f.node().params.keys, 1);
  f.flags.writable = true;
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 0);
});

test('ordinary same-frame2580# taps work at every scan phase through the actual pulse controller', async (t) => {
  for (const phase of [0, 0.005, 0.01, 0.015])
    await t.test(`phase${phase}`, (t) => {
      const f = keypadFixture(t, 'pulse');
      openLock(f);
      runLock(f, phase);
      for (const label of '2580#')
        tap(f, 'keypad', KEYPAD_KEYS.find((key) => key.label === label).index);
      runLock(f, 0.3);
      assert.equal(f.runtime.signals.outputs.progress.out, 4);
      assert.equal(f.runtime.outputs.unlocked.q, 1);
      assert.equal(f.runtime.outputs.alarm.q, 0);
      assert.equal(f.project.nodes.find(({ id }) => id === 'keypad').params.keys, 0);
      assert.deepEqual(values(f), [2, 0, 16, 0, 128, 0, 1024, 0, 2048, 0]);
      assert.deepEqual(f.controller.status('keypad'), { pending: 0, active: false });
    });
});

test('classroom recording saves applied pulse masks and replay consumes them once without rebuilding the queue', (t) => {
  const f = keypadFixture(t, 'pulse');
  openLock(f);
  f.session = createActionSession(f.adapter);
  f.session.startRecording({
    probes: [
      { node: 'progress', port: 'out', side: 'outputs' },
      { node: 'unlocked', port: 'q', side: 'outputs' },
      { node: 'alarm', port: 'q', side: 'outputs' },
    ],
  });
  for (const label of '2580#')
    tap(f, 'keypad', KEYPAD_KEYS.find((key) => key.label === label).index);
  runLock(f, 0.3);
  f.session.stopRecording();
  const sequence = parseSequence(serializeSequence(f.session.state.sequence));
  assert.equal(sequence.actions.length, 10);
  assert.deepEqual(
    sequence.actions.map(({ value }) => value),
    [2, 0, 16, 0, 128, 0, 1024, 0, 2048, 0],
  );
  for (let index = 0; index < 10; index += 2)
    assert.ok(sequence.actions[index + 1].at - sequence.actions[index].at >= 0.04 - 1e-9);
  const replay = replaySequence(sequence);
  assert.equal(replay.runtime.signals.outputs.progress.out, 4);
  assert.equal(replay.runtime.outputs.unlocked.q, 1);
  assert.equal(replay.runtime.outputs.alarm.q, 0);
  f.session.replay();
  assert.equal(f.controller.press('keypad', 1), false);
  f.controller.reconcile();
  assert.deepEqual(f.controller.status('keypad'), { pending: 0, active: false });
  assert.deepEqual(f.session.state.sequence, sequence);
});
