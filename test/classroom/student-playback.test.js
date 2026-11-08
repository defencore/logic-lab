import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { fixture } from './fixtures/classroom-session.js';
import {
  studentPlaybackActive,
  studentPlaybackState,
  createStudentPlayback,
} from '../../src/classroom/student-playback.js';
import { createDockController } from '../../src/classroom/dock-controller.js';

function panel() {
  const buttons = new Map(
    ['replay', 'pause', 'next', 'stop', 'trim'].map((action) => [
      action,
      { dataset: { studentPlaybackAction: action }, disabled: false, textContent: '' },
    ]),
  );
  const status = { textContent: '' },
    summary = { textContent: '' };
  const element = {
    hidden: true,
    querySelector: (selector) =>
      selector === '[data-student-playback-summary]'
        ? summary
        : selector === '[data-student-playback-status]'
          ? status
          : buttons.get(selector.match(/="(\w+)"/)?.[1]),
  };
  const root = { querySelector: () => element, querySelectorAll: () => [...buttons.values()] };
  return { root, element, buttons, status, summary };
}

test('unverified or oversized recordings never use the ready caption in the student playback panel', () => {
  const state = {
    mode: 'student',
    assignment: {},
    attempt: {},
    sequence: { actions: [{}], duration: 45 },
  };
  const pending = studentPlaybackState(state, 'ua', 0, {
    requiresVerification: true,
    verified: false,
    supported: false,
  });
  assert.match(pending.status, /потребує перевірки/);
  const excessive = studentPlaybackState(state, 'ua', 0, {
    requiresVerification: false,
    verified: true,
    supported: false,
  });
  assert.match(excessive.status, /перевищує межу/);
  const verified = studentPlaybackState(state, 'ua', 0, {
    requiresVerification: true,
    verified: true,
    supported: true,
  });
  assert.match(verified.status, /готовий/);
  assert.equal(pending.trimDisabled, false);
});

test('visible student playback controls step, pause, finish and restore the actual editable circuit', () => {
  const f = fixture(),
    original = f.project,
    runtime = f.runtime;
  const sequence = createSequence(original);
  appendAction(sequence, { at: 0, node: 'ser', key: 'value', value: 1 });
  appendAction(sequence, { at: 0, node: 'clock', key: 'value', value: 1 });
  finishSequence(sequence, 0.1);
  const session = createActionSession(f.adapter, { sequence });
  Object.assign(session.state, {
    mode: 'student',
    assignment: { id: 'task' },
    attempt: { id: 'attempt' },
  });
  const state = session.state,
    view = panel();
  const controls = { replay: session.replay, nextAction: session.nextAction };
  const playback = createStudentPlayback({
    state,
    adapter: { ...f.adapter, getLanguage: () => 'ua' },
    session,
    controls,
    safe: (action) => action,
  });
  playback.bind(view.root);
  playback.update(view.root);
  assert.equal(view.element.hidden, false);
  assert.match(view.summary.textContent, /2 дій · 0.100 с/);
  assert.equal(view.buttons.get('next').disabled, false);
  assert.equal(view.buttons.get('pause').disabled, true);
  view.buttons.get('next').onclick();
  playback.update(view.root);
  assert.equal(state.player.cursor, 1);
  assert.match(view.status.textContent, /1\/2/);
  assert.notEqual(f.project, original);
  view.buttons.get('stop').onclick();
  assert.equal(f.project, original);
  assert.equal(f.runtime, runtime);
  view.buttons.get('replay').onclick();
  playback.update(view.root);
  assert.equal(view.buttons.get('next').disabled, true);
  assert.equal(view.buttons.get('pause').textContent, 'Пауза');
  const pauseButton = view.buttons.get('pause');
  pauseButton.onclick();
  playback.update(view.root);
  assert.equal(view.buttons.get('pause'), pauseButton);
  assert.equal(pauseButton.textContent, 'Продовжити');
  assert.equal(view.buttons.get('next').disabled, false);
  pauseButton.onclick();
  session.tick(0.1);
  playback.update(view.root);
  assert.equal(state.player.done, true);
  assert.match(view.status.textContent, /Відтворення завершено · 2\/2/);
  assert.equal(view.buttons.get('replay').disabled, false);
  assert.equal(view.buttons.get('next').disabled, true);
  view.buttons.get('stop').onclick();
  playback.update(view.root);
  assert.equal(f.project, original);
  assert.equal(f.runtime, runtime);
  assert.equal(view.buttons.get('stop').disabled, true);
});

test('student recording and busy states prevent conflicting playback commands', () => {
  const state = {
    mode: 'student',
    assignment: {},
    attempt: {},
    sequence: { actions: [{}], duration: 2 },
    recording: true,
    simulationRunning: true,
  };
  const recording = studentPlaybackState(state, 'ua', 1.25);
  assert.match(recording.summary, /1.250 с/);
  assert.equal(recording.replayDisabled, true);
  assert.equal(recording.nextDisabled, true);
  assert.equal(recording.status, 'Запис дій');
  state.simulationRunning = false;
  assert.equal(studentPlaybackState(state, 'ua').status, 'Запис на паузі');
  state.recording = false;
  state.busy = true;
  assert.equal(studentPlaybackState(state, 'ua').replayDisabled, true);
  state.busy = false;
  state.player = { cursor: 1, runtime: { time: 0.5 }, done: false };
  state.playbackRunning = false;
  assert.match(studentPlaybackState(state, 'ua').status, /1\/1 · 0.500 \/ 2.000 с/);
});

test('generic sequence dock remains available without an attempt and is replaced once the student workflow owns playback', () => {
  const state = {
    mode: 'student',
    assignment: {},
    attempt: null,
    sequence: { actions: [], duration: 0 },
    dockOpen: true,
  };
  const elements = new Map();
  const root = { hidden: false, innerHTML: '', dataset: {}, classList: { toggle() {} } };
  elements.set('#classroom-dock', root);
  for (const id of [
    'classroom-open',
    'action-record',
    'action-replay',
    'action-next',
    'action-pause',
    'action-stop',
    'action-hide',
    'action-status',
  ])
    elements.set('#' + id, { textContent: '' });
  const previous = globalThis.document;
  globalThis.document = { querySelector: (selector) => elements.get(selector) || null };
  try {
    const dock = createDockController({
      state,
      adapter: { getLanguage: () => 'ua' },
      session: {},
      L: (ua) => ua,
      views: () => ({ dockMarkup: () => '' }),
      safe: (action) => action,
      open() {},
      controls: {},
    });
    dock.updateDock();
    assert.equal(root.hidden, false);
    assert.equal(studentPlaybackActive(state), false);
    state.attempt = { id: 'a' };
    dock.updateDock();
    assert.equal(root.hidden, true);
    state.reviewMode = 'circuit';
    state.preview = { name: 'Reviewed' };
    dock.updateDock();
    assert.equal(root.hidden, false);
    assert.equal(root.dataset.reviewMode, 'circuit');
  } finally {
    globalThis.document = previous;
  }
});
