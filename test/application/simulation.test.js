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
