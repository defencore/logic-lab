import { node, wire, circuit, source, byte, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('signal histories trace outputless indicators and numeric processing blocks', () => {
  const project = circuit(
    [
      source('input', 0),
      byte('data', 128),
      node('led', 'led'),
      node('counter', 'counter'),
      node('dac', 'dac'),
      node('adc', 'adc'),
      node('pwm', 'pwm'),
      node('servo', 'servo'),
      node('matrix', 'matrix'),
      node('sevenseg', 'sevenseg'),
      node('scope', 'scope'),
      node('floating', 'led'),
    ],
    [
      wire('input', 'out', 'led', 'in'),
      wire('input', 'out', 'counter', 'clk'),
      wire('data', 'out', 'dac', 'in'),
      wire('dac', 'out', 'adc', 'in'),
      wire('pwm', 'duty', 'servo', 's1'),
      wire('data', 'out', 'matrix', 'rows'),
      wire('data', 'out', 'matrix', 'cols'),
      wire('data', 'out', 'sevenseg', 'in'),
      wire('input', 'out', 'scope', 'in'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0.001);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0.001);
  assert.deepEqual(runtime.history.led, [0, 1]);
  assert.deepEqual(runtime.history.counter, [0, 1]);
  assert.deepEqual(runtime.history.scope, [0, 1]);
  assert.deepEqual(runtime.history.matrix, [128, 128]);
  assert.deepEqual(runtime.history.sevenseg, [128, 128]);
  assert.deepEqual(runtime.history.adc, [128, 128]);
  assert.ok(runtime.history.dac.every((value) => Math.abs(value - (128 / 255) * 5) < 1e-10));
  assert.ok(runtime.history.servo.every((value) => Math.abs(value) < 1e-10));
  assert.deepEqual(runtime.history.floating, [null, null]);
  simulate(project, runtime, 0);
  assert.equal(runtime.history.led.length, 2);
  for (let sample = 0; sample < 300; sample++) simulate(project, runtime, 0.001);
  for (const id of ['led', 'counter', 'dac', 'adc', 'servo', 'matrix', 'sevenseg', 'scope'])
    assert.equal(runtime.history[id].length, 256, id);
});

test('half-millisecond samples capture all 105 Hz clock edges', () => {
  const project = circuit(
    [node('clock', 'clock', { frequency: 105 }), node('count', 'counter')],
    [wire('clock', 'out', 'count', 'clk')],
  );
  const runtime = evaluate(project);
  for (let sample = 0; sample < 2000; sample++) simulate(project, runtime, 0.0005);
  assert.equal(output(runtime, 'count'), 105);
});

test('history sampling runs independently from physics and is synchronized across nodes', () => {
  const project = circuit(
    [
      node('clock', 'clock', { frequency: 105 }),
      node('counter', 'counter'),
      node('scope', 'scope'),
    ],
    [wire('clock', 'out', 'counter', 'clk'), wire('clock', 'out', 'scope', 'in')],
  );
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01;
  simulate(project, runtime, 0);
  assert.deepEqual(Object.keys(runtime.history), []);
  assert.equal(runtime.lastSampleTime, 0);
  for (let step = 0; step < 2000; step++) {
    const previousLength = runtime.history.clock?.length || 0;
    simulate(project, runtime, 0.0005);
    const length = runtime.history.clock?.length || 0;
    assert.equal(runtime.history.counter?.length || 0, length);
    assert.equal(runtime.history.scope?.length || 0, length);
    if (length > previousLength)
      assert.equal(runtime.history.scope.at(-1), runtime.history.clock.at(-1));
  }
  assert.equal(
    output(runtime, 'counter'),
    105,
    'Clock edges are still evaluated at the physics rate',
  );
  assert.equal(
    runtime.history.scope.length,
    100,
    'One second records 100 samples at a 10 ms interval',
  );
  const previousTime = runtime.lastSampleTime;
  simulate(project, runtime, 0);
  assert.equal(runtime.history.scope.length, 100);
  assert.equal(runtime.lastSampleTime, previousTime);
});

test('one-millisecond physics produces one hundred history samples per second at ten milliseconds', () => {
  const project = circuit(
    [source('value', 1), node('scope', 'scope')],
    [wire('value', 'out', 'scope', 'in')],
  );
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01;
  for (let step = 0; step < 1000; step++) simulate(project, runtime, 0.001);
  assert.equal(runtime.history.scope.length, 100);
  assert.deepEqual(runtime.history.scope, Array(100).fill(1));
});

test('rolling waveform timestamps reflect actual sample times and stay aligned with values', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 10, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  runtime.sampleInterval = 0.0035;
  for (let step = 0; step < 1200; step++) simulate(project, runtime, 0.001);
  assert.equal(runtime.historyTimes.length, 256);
  assert.equal(runtime.history.clock.length, runtime.historyTimes.length);
  assert.ok(Math.abs(runtime.historyTimes.at(-1) - 1.197) < 1e-10);
  assert.ok(Math.abs(runtime.historyTimes[0] - 0.305) < 1e-10);
  const intervals = runtime.historyTimes.slice(1).map((time, i) => time - runtime.historyTimes[i]);
  assert.ok(intervals.some((interval) => Math.abs(interval - 0.003) < 1e-10));
  assert.ok(intervals.some((interval) => Math.abs(interval - 0.004) < 1e-10));
  const before = [...runtime.historyTimes];
  simulate(project, runtime, 0);
  assert.deepEqual(runtime.historyTimes, before);
});

test('narrow monitor windows preserve sampling cadence across fractional physics steps', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 1000, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  runtime.sampleInterval = 0.01 / 255;
  for (let step = 0; step < 334; step++) simulate(project, runtime, 0.00003);
  assert.equal(runtime.historyTimes.length, 255);
  assert.equal(runtime.history.clock.length, 255);
  assert.ok(Math.abs(runtime.historyTimes[0] - 0.00006) < 1e-10);
  assert.ok(Math.abs(runtime.historyTimes.at(-1) - 0.01002) < 1e-10);
  const transitions = runtime.history.clock
    .slice(1)
    .filter((value, i) => value !== runtime.history.clock[i]).length;
  assert.ok(transitions >= 19 && transitions <= 20);
});
