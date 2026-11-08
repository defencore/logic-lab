import test from 'node:test';
import assert from 'node:assert/strict';
import { syncPlaybackControls } from '../../src/classroom/playback-controls.js';
import { createSimulation } from '../../src/application/simulation.js';
import { withDocument } from './fixture.js';

function controls(t) {
  const elements = withDocument(t);
  const get = (id) => globalThis.document.querySelector('#' + id);
  for (const id of ['run', 'motion-run', 'step', 'reset', 'motion-reset']) {
    const element = get(id);
    const classes = new Set();
    element.classList = {
      toggle: (name, enabled) => (enabled ? classes.add(name) : classes.delete(name)),
      contains: (name) => classes.has(name),
    };
  }
  return { elements, get };
}

test('global and 3D play buttons describe the same replay pause/resume state, while ordinary step/reset remain unavailable', (t) => {
  const { get } = controls(t);
  const state = { player: { done: false }, playbackRunning: true };
  syncPlaybackControls(state, 'ua');
  for (const id of ['run', 'motion-run']) {
    assert.match(get(id).innerHTML, /<span>Пауза<\/span>/);
    assert.equal(get(id).title, 'Пауза запису');
    assert.equal(get(id).disabled, false);
    assert.equal(get(id).classList.contains('running'), true);
  }
  for (const id of ['step', 'reset', 'motion-reset']) assert.equal(get(id).disabled, true);
  state.playbackRunning = false;
  syncPlaybackControls(state, 'ua');
  for (const id of ['run', 'motion-run']) {
    assert.match(get(id).innerHTML, /<span>Продовжити<\/span>/);
    assert.equal(get(id).title, 'Продовжити запис');
    assert.equal(get(id).classList.contains('running'), false);
    assert.equal(get(id).disabled, false);
  }
  state.busy = true;
  syncPlaybackControls(state, 'ua');
  assert.equal(get('run').disabled, true);
  assert.equal(get('motion-run').disabled, true);
});

test('completed replays and static circuit previews disable transport and explain how to return to simulation', (t) => {
  const { get } = controls(t);
  for (const state of [
    { player: { done: true }, playbackRunning: false },
    { preview: { name: 'Reference' }, playbackRunning: false },
  ]) {
    syncPlaybackControls(state, 'en');
    for (const id of ['run', 'motion-run']) {
      assert.equal(get(id).disabled, true);
      assert.match(get(id).title, /End preview to return to simulation/);
    }
    for (const id of ['step', 'reset', 'motion-reset']) assert.equal(get(id).disabled, true);
  }
  assert.match(get('run').innerHTML, /<span>Preview<\/span>/);
});

test('returning to the editable circuit restores ordinary simulation transport and enables reset and step', (t) => {
  const { get } = controls(t);
  const playback = { player: { done: false }, playbackRunning: true };
  const app = {
    state: { running: false },
    services: {
      classroom: {
        isPlaying: () => !!playback.player,
        refreshTransport: () => syncPlaybackControls(playback, 'en'),
      },
      monitor: { updateUi() {} },
    },
    actions: {},
    t: (key) => key,
  };
  const simulation = createSimulation(app);
  syncPlaybackControls(playback, 'en');
  assert.match(get('run').innerHTML, /<span>Pause<\/span>/);
  // The session clears its player before asking the app to restore its paused editor.
  playback.player = null;
  playback.playbackRunning = false;
  simulation.setRunning(false);
  assert.match(get('run').innerHTML, /<span>run<\/span>/);
  assert.equal(get('run').classList.contains('running'), false);
  for (const id of ['run', 'motion-run', 'step', 'reset', 'motion-reset'])
    assert.equal(get(id).disabled, false);
  assert.equal(get('run').title, 'Run / pause · R');
  assert.equal(app.state.running, false);
});

test('animation ticks preserve transport button contents after browser SVG normalization', (t) => {
  const { get } = controls(t);
  let writes = 0,
    markup = '',
    content = '';
  const button = get('run');
  Object.defineProperty(button, 'innerHTML', {
    get: () => markup.replaceAll('/>', '></path>'),
    set: (value) => {
      markup = value;
      content = value.match(/<span>(.*?)<\/span>/)?.[1] || '';
      writes++;
    },
  });
  Object.defineProperty(button, 'textContent', { get: () => content });
  const state = { player: { done: false }, playbackRunning: true };
  syncPlaybackControls(state, 'ua');
  for (let tick = 0; tick < 60; tick++) syncPlaybackControls(state, 'ua');
  assert.equal(writes, 1, 'mouse-down target must survive until mouse-up');
  state.playbackRunning = false;
  syncPlaybackControls(state, 'ua');
  assert.equal(writes, 2);
});
