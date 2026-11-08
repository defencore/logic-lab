import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../../src/application/simulation.js';
import { withDocument } from './fixture.js';

function context() {
  const events = [];
  return {
    state: { running: true, timeBase: 0.1, lastFrame: null, simulationRate: 1 },
    services: {
      simulationRunner: {
        discard: () => events.push('discard'),
        pendingSeconds: () => 0.4,
        queue: (dt) => events.push(['queue', dt]),
        process: () => events.push('process'),
      },
      monitor: { stopCapture: () => events.push('stop capture'), updateUi() {} },
      inspector: { updateSignals() {} },
    },
    actions: { notify: (message) => events.push(['notify', message]) },
    t: (key) => key,
    events,
  };
}

test('simulation steps include queued time once when the recording duration clamps a request', () => {
  const app = context();
  app.services.classroom = {
    recordingDelta: (total) => {
      assert.equal(total, 0.9);
      return 0.6;
    },
  };
  Object.assign(app.actions, createSimulation(app));
  app.actions.advance(0.5);
  assert.ok(Math.abs(app.events[0][1] - 0.2) < 1e-12);
  assert.equal(app.events[1], 'process');
});

test('recording limits constrain the real simulation runner and an exhausted budget performs no extra steps', () => {
  const app = context(),
    calls = [];
  let allowance = 3;
  app.services.classroom = {
    recordingStepAllowance: (maximum) => {
      assert.equal(maximum, 250);
      return allowance;
    },
  };
  app.services.simulationRunner.process = (options) => calls.push(options);
  const simulation = createSimulation(app);
  simulation.drainSimulation();
  assert.deepEqual(calls, [{ maxSteps: 3 }]);
  allowance = 0;
  simulation.drainSimulation();
  assert.equal(calls.length, 1);
});

test('refreshing an already paused shell preserves manual queued steps, while pausing live simulation discards its backlog', (t) => {
  withDocument(t);
  const app = context();
  app.services.classroom = { isPlaying: () => false, onSimulationStateChanged() {} };
  const simulation = createSimulation(app);
  simulation.setRunning(false);
  simulation.setRunning(false);
  assert.deepEqual(app.events, ['discard']);
  simulation.setRunning(true);
  assert.equal(app.state.running, true);
});

test('replacing a runtime clears captures and pending work and reapplies the selected time base', () => {
  const app = context();
  const runtime = createSimulation(app).newRuntime();
  assert.deepEqual(app.events, ['discard', 'stop capture']);
  assert.equal(runtime.sampleInterval, 0.1 / 255);
  assert.equal(runtime.time, 0);
});

test('simulation failure stops both recordings and reports the error after discarding queued work', (t) => {
  withDocument(t);
  const app = context();
  app.services.simulationRunner.process = () => {
    throw Error('Invalid simulation');
  };
  app.services.classroom = {
    isPlaying: () => false,
    stopRecording: () => app.events.push('stop sequence'),
    onSimulationStateChanged() {},
  };
  Object.assign(app.actions, createSimulation(app));
  app.actions.drainSimulation();
  assert.equal(app.state.running, false);
  assert.deepEqual(app.events, [
    'discard',
    'stop capture',
    'stop sequence',
    'discard',
    ['notify', 'Invalid simulation'],
  ]);
});

test('ordinary run/pause toggles the simulation and reports its state, without invoking the replay transport', (t) => {
  withDocument(t);
  const app = context();
  app.state.running = false;
  app.services.classroom = {
    isPlaying: () => false,
    togglePlaybackRunning: () => app.events.push('toggle replay'),
    onSimulationStateChanged: (running) => app.events.push(['running', running]),
  };
  const simulation = createSimulation(app);
  simulation.toggleRunning();
  assert.equal(app.state.running, true);
  simulation.toggleRunning();
  assert.equal(app.state.running, false);
  assert.deepEqual(app.events, [['running', true], 'discard', ['running', false]]);
});

test('run/pause routes to an active replay while direct live simulation starts remain blocked', (t) => {
  const elements = withDocument(t);
  const app = context();
  app.state.running = false;
  let replayRunning = true;
  app.services.classroom = {
    isPlaying: () => true,
    togglePlaybackRunning: () => {
      replayRunning = !replayRunning;
      app.events.push(['replay', replayRunning]);
    },
    onSimulationStateChanged: () => app.events.push('simulation changed'),
  };
  const simulation = createSimulation(app);
  simulation.toggleRunning();
  assert.equal(replayRunning, false);
  simulation.toggleRunning();
  assert.equal(replayRunning, true);
  simulation.setRunning(true);
  assert.equal(app.state.running, false);
  assert.deepEqual(app.events, [
    ['replay', false],
    ['replay', true],
  ]);
  assert.equal(elements.has('#run'), false);
});

test('animation frames advance an active replay without also advancing live simulation', (t) => {
  withDocument(t);
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => {};
  t.after(() => {
    if (previous) globalThis.requestAnimationFrame = previous;
    else delete globalThis.requestAnimationFrame;
  });
  const app = context();
  app.state.lastFrame = 1000;
  app.services.classroom = {
    isPlaying: () => true,
    tick: (elapsed) => app.events.push(['replay frame', elapsed]),
  };
  app.actions.advance = () => app.events.push('live frame');
  app.actions.updateSignals = () => app.events.push('live signals');
  app.services.audio = { sync: () => app.events.push('audio sync') };
  createSimulation(app).tick(1010);
  assert.deepEqual(app.events, ['audio sync', 'discard', ['replay frame', 0.01], 'audio sync']);
  assert.equal(app.state.lastFrame, 1010);
});
