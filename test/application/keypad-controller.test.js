import test from 'node:test';
import assert from 'node:assert/strict';
import { keypadFixture } from './fixtures/keypad.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { simulate } from '../../src/simulation/index.js';
import { parseSequence, serializeSequence, replaySequence } from '../../src/experiments/actions.js';

test('several held keys and two physical owners of one key retain each bit until its final release', (t) => {
  const f = keypadFixture(t);
  assert.equal(f.controller.press('pad', 0), true);
  assert.equal(f.controller.press('pad', 1), true);
  assert.equal(f.controller.press('pad', 0), true);
  assert.equal(f.node().params.keys, 3);
  assert.deepEqual(f.runtime.outputs.pad, { col0: 1, col1: 1, col2: 0 });
  f.controller.release('pad', 0);
  assert.equal(f.node().params.keys, 3);
  f.controller.release('pad', 1);
  assert.equal(f.node().params.keys, 1);
  f.controller.release('pad', 0);
  assert.equal(f.node().params.keys, 0);
  assert.equal(f.controller.release('pad', 0), false);
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [1, 3, 1, 0],
  );
});

test('toggle contacts latch across release, blur and hiding and change only on the next activation', (t) => {
  const f = keypadFixture(t, 'toggle');
  f.controller.press('pad', 4);
  assert.equal(f.controller.release('pad', 4), false);
  window.dispatchEvent(new Event('blur'));
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.node().params.keys, 16);
  f.controller.press('pad', 4);
  f.controller.release('pad', 4);
  assert.equal(f.node().params.keys, 0);
  f.controller.press('pad', 1);
  f.controller.press('pad', 7);
  f.node().enabled = false;
  f.controller.reconcile();
  simulate(f.project, f.runtime, 0);
  assert.equal(f.node().params.keys, 130, 'disabling does not erase toggle configuration');
  assert.deepEqual(f.runtime.outputs.pad, { col0: 'Z', col1: 'Z', col2: 'Z' });
  assert.equal(f.controller.press('pad', 1), false);
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [16, 0, 2, 130],
  );
});

test('window blur, a hidden page and disable release all live holds exactly once', (t) => {
  const f = keypadFixture(t);
  for (const reason of ['blur', 'hidden', 'disabled']) {
    document.hidden = false;
    f.node().enabled = true;
    f.controller.press('pad', 0);
    f.controller.press('pad', 11);
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'hidden') {
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    }
    if (reason === 'disabled') {
      f.node().enabled = false;
      f.controller.reconcile();
    }
    assert.equal(f.node().params.keys, 0, reason);
    assert.equal(f.controller.release('pad', 0), false);
    assert.equal(f.controller.release('pad', 11), false);
  }
  assert.deepEqual(
    f.writes.map(({ keys }) => keys),
    [1, 2049, 2048, 0, 1, 2049, 2048, 0, 1, 2049, 2048, 0],
  );
});

test('replacement with the same IDs releases the original object without touching a readonly replay mask', (t) => {
  const f = keypadFixture(t);
  f.controller.press('pad', 0);
  f.controller.press('pad', 7);
  const original = f.project;
  f.project = structuredClone(original);
  f.flags.writable = false;
  const before = structuredClone(f.project);
  f.controller.reconcile();
  assert.equal(original.nodes[0].params.keys, 0);
  assert.deepEqual(f.project, before);
  assert.equal(f.node().params.keys, 129);
  assert.equal(f.controller.release('pad', 0), false);
  assert.equal(f.controller.press('pad', 1), false);
  f.flags.writable = true;
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 0, 'adopting it as a live hold clears unowned saved presses');
});

test('unowned live holds normalize while locked baselines and toggle masks remain intact; mode changes clear old contact state', (t) => {
  const f = keypadFixture(t);
  f.node().params.keys = 256;
  f.flags.writable = false;
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 256);
  f.flags.writable = true;
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 0);
  f.node().params.mode = 'toggle';
  f.controller.reconcile();
  f.controller.press('pad', 4);
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 16);
  f.node().params.mode = 'hold';
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 0);
  f.controller.press('pad', 3);
  f.node().params.mode = 'toggle';
  f.controller.reconcile();
  assert.equal(f.node().params.keys, 0);
  assert.equal(f.controller.release('pad', 3), false);
  f.flags.active = false;
  assert.equal(f.controller.press('pad', 2), false);
  f.flags.active = true;
  for (const index of [-1, 12, 0.5, NaN]) assert.equal(f.controller.press('pad', index), false);
  assert.equal(f.controller.press('power', 0), false);
  assert.equal(f.controller.press('missing', 0), false);
});

test('the real classroom session records exact chord masks, replays the same columns and blocks manual player input', (t) => {
  const f = keypadFixture(t);
  f.session = createActionSession(f.adapter);
  f.session.startRecording({
    probes: ['col0', 'col1', 'col2'].map((port) => ({ node: 'pad', port, side: 'outputs' })),
  });
  f.controller.press('pad', 0);
  simulate(f.project, f.runtime, 0.05);
  f.controller.press('pad', 4);
  simulate(f.project, f.runtime, 0.05);
  f.controller.release('pad', 0);
  simulate(f.project, f.runtime, 0.05);
  f.controller.release('pad', 4);
  f.session.stopRecording();
  const sequence = parseSequence(serializeSequence(f.session.state.sequence));
  assert.deepEqual(
    sequence.actions.map(({ key, value, at }) => [key, value, +at.toFixed(6)]),
    [
      ['keys', 1, 0],
      ['keys', 17, 0.05],
      ['keys', 16, 0.1],
      ['keys', 0, 0.15],
    ],
  );
  const expected = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 0],
  ];
  assert.deepEqual(
    f.session.state.observations.map(({ values }) => values),
    expected,
  );
  assert.deepEqual(
    replaySequence(sequence).observations.map(({ values }) => values),
    expected,
  );
  f.session.replay();
  const playerProject = structuredClone(f.project);
  f.controller.reconcile();
  assert.equal(f.controller.press('pad', 11), false);
  assert.deepEqual(f.project, playerProject);
  f.session.tick(0.2);
  assert.equal(f.session.state.player.done, true);
  assert.equal(f.node().params.keys, 0);
  assert.deepEqual(f.session.state.sequence, sequence);
  f.session.stopPlayback();
  assert.equal(f.controller.press('pad', 2), true);
});
