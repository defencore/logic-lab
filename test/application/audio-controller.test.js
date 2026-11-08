import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioController } from '../../src/application/audio-controller.js';

function setup(t) {
  const original = globalThis.document;
  const button = {
    dataset: {},
    attributes: {},
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
  };
  globalThis.document = { hidden: false, querySelector: () => button };
  t.after(() => {
    globalThis.document = original;
  });
  const calls = [],
    notifications = [];
  const status = {
    available: true,
    enabled: false,
    contextState: 'idle',
    voices: 0,
    scheduledEvents: 0,
  };
  const engine = {
    sync: (value) => calls.push(value),
    status: () => ({ ...status }),
    enable: async () => {
      status.enabled = true;
      status.contextState = 'running';
      return true;
    },
    disable: () => {
      status.enabled = false;
    },
    suspend: () => {
      status.contextState = 'suspended';
    },
  };
  let preview = false,
    replayRunning = false,
    completed = false;
  const state = {
    project: { nodes: [{ id: 'b', type: 'passive_buzzer' }] },
    runtime: { time: 0 },
    lang: 'ua',
    running: false,
    simulationRate: 1,
  };
  const services = {
    classroom: {
      isPlaying: () => preview,
      isPlaybackRunning: () => replayRunning,
      isPlaybackComplete: () => completed,
    },
  };
  const controller = createAudioController(
    { state, services, actions: { notify: (message) => notifications.push(message) } },
    engine,
  );
  return {
    controller,
    state,
    calls,
    button,
    status,
    engine,
    notifications,
    setPreview: (active, running) => {
      preview = active;
      replayRunning = running;
    },
    setCompleted: (value) => {
      completed = value;
    },
  };
}

test('sound requires an explicit click and visible running workbench; pauses and hidden previews stay silent', async (t) => {
  const f = setup(t);
  f.controller.mount();
  assert.equal(f.status.enabled, false);
  assert.equal(f.button.hidden, false);
  assert.match(f.button.innerHTML, /Увімкнути звук/);
  assert.equal(f.calls.at(-1).running, false);
  await f.button.onclick();
  assert.equal(f.button.attributes['aria-pressed'], 'true');
  f.state.running = true;
  f.controller.sync();
  assert.equal(f.calls.at(-1).running, true);
  f.setPreview(true, false);
  f.controller.sync();
  assert.equal(f.calls.at(-1).running, false, 'a static reviewed circuit must not start audio');
  f.setPreview(true, true);
  f.controller.sync();
  assert.equal(f.calls.at(-1).running, true);
  f.setPreview(true, false);
  f.setCompleted(true);
  f.controller.sync();
  assert.equal(
    f.calls.at(-1).completed,
    true,
    'natural completion preserves the scheduled final audio',
  );
  document.hidden = true;
  f.controller.sync();
  assert.equal(f.calls.at(-1).running, false);
  assert.equal(
    f.calls.at(-1).completed,
    false,
    'hiding a completed replay still silences immediately',
  );
  assert.equal(f.calls.at(-1).runtime, f.state.runtime);
  await f.button.onclick();
  assert.equal(f.status.enabled, false);
});

test('sound control follows replaced projects, language and unavailable audio without mutating circuits', (t) => {
  const f = setup(t);
  f.state.project.nodes = [];
  f.controller.mount();
  assert.equal(f.button.hidden, true);
  f.state.project = { nodes: [{ id: 'a', type: 'active_buzzer', params: {} }] };
  f.state.lang = 'en';
  f.controller.sync();
  assert.equal(f.button.hidden, false);
  assert.match(f.button.innerHTML, /Enable sound/);
  f.status.available = false;
  f.controller.sync();
  assert.equal(f.button.disabled, true);
  assert.match(f.button.title, /does not support/);
  assert.deepEqual(f.state.project.nodes[0].params, {});
  assert.deepEqual(f.notifications, []);
});
