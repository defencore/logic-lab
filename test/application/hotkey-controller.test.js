import test from 'node:test';
import assert from 'node:assert/strict';
import { hotkeyFixture, keyboardEvent } from './fixtures/hotkey.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { simulate } from '../../src/simulation/index.js';
import { validateProject } from '../../src/circuits/project.js';

test('hold and inverted hold drive actual circuit output on fresh down/up, while autorepeat creates no extra transitions', () => {
  for (const mode of ['hold', 'inverted']) {
    const f = hotkeyFixture(mode);
    assert.equal(f.output(), mode === 'inverted' ? 1 : 0);
    assert.equal(f.down(), true);
    assert.equal(f.output(), mode === 'inverted' ? 0 : 1);
    f.down('KeyA', { repeat: true });
    f.down();
    assert.equal(f.writes.length, 1);
    f.up();
    assert.equal(f.output(), mode === 'inverted' ? 1 : 0);
    assert.deepEqual(
      f.writes.map((w) => w.value),
      [1, 0],
    );
  }
});

test('toggle changes exactly once per physical press, retains its latch across blur, and toggles back on the next fresh press', () => {
  const f = hotkeyFixture('toggle');
  f.down();
  f.down('KeyA', { repeat: true });
  f.down();
  assert.equal(f.output(), 1);
  f.up();
  f.controller.suspend();
  assert.equal(f.output(), 1);
  f.down();
  f.up();
  assert.equal(f.output(), 0);
  assert.deepEqual(
    f.writes.map((w) => w.value),
    [1, 0],
  );
});

test('a release during a temporary lock is applied after unlock and never writes into a foreign replay project', () => {
  for (const mode of ['hold', 'inverted']) {
    const f = hotkeyFixture(mode);
    f.down();
    f.flags.write = false;
    f.flags.active = false;
    f.controller.reconcile();
    f.up();
    assert.equal(f.project.nodes[0].params.value, 1);
    f.flags.write = true;
    f.flags.active = true;
    f.controller.reconcile();
    assert.equal(f.project.nodes[0].params.value, 0);
    assert.equal(f.output(), mode === 'inverted' ? 1 : 0);
    f.down();
    const original = f.project;
    f.flags.write = false;
    f.flags.active = false;
    f.controller.reconcile();
    f.project = structuredClone(original);
    f.controller.reconcile();
    f.up();
    assert.equal(f.project.nodes[0].params.value, 1, 'a recorded replay owns its input state');
    f.project = original;
    f.flags.write = true;
    f.flags.active = true;
    f.controller.reconcile();
    assert.equal(f.project.nodes[0].params.value, 0);
  }
});

test('capture owns the key without activating it and quarantines its repeats until release, even if the accepting UI disposes capture', () => {
  const f = hotkeyFixture('hold', ''),
    calls = [];
  let cancel;
  cancel = f.controller.beginCapture({
    nodeId: 'key',
    onCancel: () => calls.push('cancel'),
    onKey: (event) => {
      if (event.ctrlKey) return 'retry';
      f.project.nodes[0].params.binding = 'KeyR';
      cancel();
      return 'accepted';
    },
  });
  const blocked = keyboardEvent('keydown', 'KeyR', { ctrlKey: true });
  assert.equal(f.controller.keyDown(blocked), true);
  assert.equal(blocked.defaultPrevented, true);
  f.up('KeyR', { ctrlKey: true });
  f.down('KeyR');
  assert.equal(f.controller.isCapturing(), false);
  assert.equal(f.focused, 1);
  assert.equal(f.output(), 0);
  f.down('KeyR', { repeat: true });
  assert.equal(f.output(), 0);
  f.up('KeyR');
  f.down('KeyR');
  assert.equal(f.output(), 1);
  assert.deepEqual(calls, ['cancel']);
});

test('capture cancellation, lost selection and replacement preserve the existing binding without activating a source', () => {
  const f = hotkeyFixture(),
    cancelled = [];
  const start = () =>
    f.controller.beginCapture({
      nodeId: 'key',
      onKey: () => assert.fail('stale capture callback'),
      onCancel: () => cancelled.push(true),
    });
  start();
  f.down('Escape');
  f.up('Escape');
  start();
  f.flags.capture = false;
  f.controller.reconcile();
  f.flags.capture = true;
  start();
  f.project = structuredClone(f.project);
  f.controller.reconcile();
  assert.equal(cancelled.length, 3);
  assert.equal(f.project.nodes[0].params.binding, 'KeyA');
  assert.equal(f.writes.length, 0);
});

test('text fields and native activation retain their keys; modal/focus loss releases momentary sources without clearing a toggle', () => {
  const f = hotkeyFixture();
  const event = keyboardEvent('keydown', 'KeyA');
  Object.defineProperty(event, 'target', { value: { closest: () => ({}) } });
  assert.equal(f.controller.keyDown(event), false);
  assert.equal(event.defaultPrevented, false);
  f.down();
  f.controller.focusChanged({ closest: () => ({}) });
  assert.equal(f.output(), 0);
  f.down();
  f.flags.active = false;
  f.controller.reconcile();
  assert.equal(f.output(), 0);
  f.flags.active = true;
  f.project.nodes[0].params.binding = 'Enter';
  f.controller.reconcile();
  const activate = keyboardEvent('keydown', 'Enter');
  Object.defineProperty(activate, 'target', {
    value: { closest: (selector) => (selector.includes('button') ? {} : null) },
  });
  assert.equal(f.controller.keyDown(activate), false);
  assert.equal(activate.defaultPrevented, false);
});

test('modifier release, binding/mode changes and disable cannot leave a momentary source pressed', () => {
  const f = hotkeyFixture('inverted', 'Shift+KeyA');
  f.down('KeyA', { shiftKey: true });
  assert.equal(f.output(), 0);
  f.up('ShiftLeft');
  assert.equal(f.output(), 1);
  f.up();
  f.down('KeyA', { shiftKey: true });
  f.project.nodes[0].enabled = false;
  f.controller.reconcile();
  assert.equal(f.project.nodes[0].params.value, 0);
  f.project.nodes[0].enabled = true;
  f.project.nodes[0].params.mode = 'hold';
  f.project.nodes[0].params.binding = 'KeyB';
  f.controller.reconcile();
  f.down('KeyB');
  assert.equal(f.output(), 1);
  f.project.nodes[0].params.binding = '';
  f.controller.reconcile();
  assert.equal(f.output(), 0);
  assert.equal(f.down('KeyB'), false);
});

test('keyboard edges are recorded and replayed through the actual classroom session while physical keys cannot change the player', () => {
  const f = hotkeyFixture('inverted');
  f.session = createActionSession(f.adapter);
  f.session.startRecording({ probes: [{ node: 'key', side: 'outputs', port: 'out' }] });
  f.down();
  f.down('KeyA', { repeat: true });
  simulate(f.project, f.runtime, 0.05);
  f.up();
  f.session.stopRecording();
  assert.deepEqual(
    f.session.state.sequence.actions.map((a) => a.value),
    [1, 0],
  );
  assert.deepEqual(
    f.session.state.observations.map((o) => o.values[0]),
    [1, 0, 1],
  );
  const recording = structuredClone(f.session.state.sequence);
  f.session.replay();
  f.controller.reconcile();
  const player = f.session.state.player;
  assert.equal(f.down(), false);
  assert.equal(f.session.state.player, player);
  f.session.tick(0.1);
  assert.equal(f.output(), 1);
  assert.deepEqual(f.session.state.sequence, recording);
  f.session.stopPlayback();
  f.controller.reconcile();
});

test('imports reject duplicate, system and invalid Hotkey configurations before installation; omitted mode defaults to hold', () => {
  const f = hotkeyFixture();
  for (const patch of [
    { binding: 'Ctrl+KeyR' },
    { binding: 'F5' },
    { mode: 'invalid' },
    { value: 2 },
  ]) {
    const project = structuredClone(f.project);
    Object.assign(project.nodes[0].params, patch);
    assert.throws(() => validateProject(project), /Hotkey/);
  }
  const duplicate = structuredClone(f.project);
  duplicate.nodes.push({ ...structuredClone(duplicate.nodes[0]), id: 'another' });
  assert.throws(() => validateProject(duplicate), /Duplicate Hotkey/);
  delete f.project.nodes[0].params.mode;
  f.controller.reconcile();
  f.down();
  assert.equal(f.output(), 1);
});
