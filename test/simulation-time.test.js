import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../src/simulator.js';
import {
  SIMULATION_RATES,
  TIME_WINDOWS,
  frameSimulationDelta,
  simulationStepCount,
} from '../src/simulation-time.js';

test('slow motion advances simulation time without changing generator frequency', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 1000, duty: 0.5 }, enabled: true }],
    wires: [],
  };
  function run(rate, frames) {
    const runtime = createRuntime();
    runtime.sampleInterval = 0.01 / 255;
    let transitions = 0,
      previous;
    for (let frame = 1; frame <= frames; frame++) {
      const duration = frameSimulationDelta(frame * 10, (frame - 1) * 10, rate);
      const count = simulationStepCount(duration, runtime.sampleInterval);
      for (let step = 0; step < count; step++) {
        simulate(project, runtime, duration / count);
        const value = runtime.outputs.clock.out;
        if (previous !== undefined && previous !== value) transitions++;
        previous = value;
      }
    }
    return { time: runtime.time, transitions };
  }
  const normal = run(1, 1),
    slow = run(0.01, 100);
  assert.ok(Math.abs(normal.time - 0.01) < 1e-10);
  assert.ok(Math.abs(slow.time - normal.time) < 1e-10);
  assert.ok(normal.transitions >= 19 && slow.transitions >= 19);
  assert.ok(Math.abs(normal.transitions - slow.transitions) <= 1);
  assert.equal(frameSimulationDelta(1000, 0, 0.001), 0.00005);
});

test('timing handles first frame, long stalls and stationary frames without overshooting', () => {
  assert.equal(frameSimulationDelta(500, null, 0.1), 0.0016);
  assert.equal(frameSimulationDelta(500, 500, 1), 0);
  assert.equal(frameSimulationDelta(400, 500, 1), 0);
  assert.equal(simulationStepCount(0, 1 / 255), 0);
  assert.equal(simulationStepCount(0.01, 0.01 / 255), 255);
  assert.throws(() => frameSimulationDelta(1, 0, 3));
  assert.throws(() => simulationStepCount(-1, 0.01));
  assert.throws(() => simulationStepCount(1, 0));
});

test('accelerated playback advances model time while retaining clock frequency and phase', () => {
  const params = Object.freeze({ frequency: 7, duty: 0.4 });
  const project = {
    nodes: [Object.freeze({ id: 'clock', type: 'clock', params, enabled: true })],
    wires: [],
  };
  for (const rate of [2, 5, 10]) {
    const runtime = createRuntime();
    runtime.sampleInterval = 1 / 255;
    let previous,
      transitions = 0;
    for (let frame = 1; frame <= 5; frame++) {
      const duration = frameSimulationDelta(frame * 19, (frame - 1) * 19, rate);
      const steps = simulationStepCount(duration, runtime.sampleInterval);
      for (let step = 0; step < steps; step++) {
        simulate(project, runtime, duration / steps);
        const current = runtime.outputs.clock.out;
        if (previous !== undefined && previous !== current) transitions++;
        previous = current;
      }
    }
    const duration = 0.095 * rate;
    assert.ok(
      Math.abs(runtime.time - duration) < 1e-10,
      `${rate}× advances the correct model duration`,
    );
    assert.equal(runtime.outputs.clock.out, Number((duration * 7) % 1 >= 0.6));
    const rising = Math.max(0, Math.floor(duration * 7 - 0.6 + 1e-10) + 1);
    const falling = Math.floor(duration * 7 + 1e-10);
    assert.equal(
      transitions,
      rising + falling,
      'Clock transitions follow model time, not playback speed.',
    );
    assert.equal(project.nodes[0].params, params);
    assert.equal(params.frequency, 7);
  }
});

test('speed range supports slow and fast playback and long windows retain fine physics steps', () => {
  assert.deepEqual(SIMULATION_RATES, [0.001, 0.01, 0.1, 0.25, 0.5, 1, 2, 5, 10]);
  assert.deepEqual(TIME_WINDOWS, [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60]);
  assert.equal(
    frameSimulationDelta(1000, 0, 10),
    0.5,
    'The wall-time cap applies before acceleration.',
  );
  assert.equal(frameSimulationDelta(1000, 0, 0.25), 0.0125);
  assert.equal(
    simulationStepCount(0.1, 60 / 255),
    200,
    'A long visible window does not skip physics evaluation.',
  );
});
