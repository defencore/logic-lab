import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { advanceRuntime } from '../../src/simulation/advance.js';

function counter(frequency = 1000, duty = 0.2) {
  return {
    nodes: [
      { id: 'clock', type: 'clock', params: { frequency, duty } },
      { id: 'counter', type: 'counter', params: { initial: 0 } },
    ],
    wires: [
      { id: 'ticks', from: { node: 'clock', port: 'out' }, to: { node: 'counter', port: 'clk' } },
    ],
  };
}

test('bounded live advancement preserves pending time and every narrow clock edge across frames', () => {
  const project = counter();
  const runtime = createRuntime();
  runtime.sampleInterval = 0.001;
  simulate(project, runtime, 0);
  let remaining = 0.01,
    calls = 0,
    observations = 0;
  while (remaining > 0) {
    const result = advanceRuntime(project, runtime, remaining, {
      maxSteps: 3,
      onStep: (value) => {
        assert.strictEqual(value, runtime);
        assert.equal(value.outputs.clock.out, value.inputs.counter.clk);
        observations++;
      },
    });
    assert.ok(result.steps <= 3);
    assert.ok(result.advancedSeconds > 0);
    remaining = result.remainingSeconds;
    assert.ok(++calls < 1000);
  }
  assert.ok(calls > 1);
  assert.ok(observations > calls);
  assert.equal(runtime.time, 0.01);
  assert.equal(runtime.signals.outputs.counter.out, 10);
  assert.equal(runtime.historyTimes.length, 10);
  assert.equal(runtime.history.counter.length, runtime.historyTimes.length);
});

test('an impractically fast imported clock is bounded by work rather than freezing a frame', () => {
  const project = counter(1e9, 0.0001);
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  const result = advanceRuntime(project, runtime, 0.1, { maxSteps: 7 });
  assert.equal(result.steps, 7);
  assert.equal(result.reached, false);
  assert.ok(result.remainingSeconds > 0.09);
  assert.ok(runtime.time > 0);
});

test('zero advancement leaves time, state and observations untouched; invalid work is rejected before mutation', () => {
  const project = counter(),
    runtime = createRuntime();
  let calls = 0;
  const result = advanceRuntime(project, runtime, 0, { onStep: () => calls++ });
  assert.equal(result.reached, true);
  assert.equal(result.steps, 0);
  assert.equal(runtime.steps, 0);
  assert.equal(calls, 0);
  for (const duration of [-1, NaN, Infinity])
    assert.throws(() => advanceRuntime(project, runtime, duration), /duration/);
  for (const maxSteps of [0, 1.5, 5001])
    assert.throws(() => advanceRuntime(project, runtime, 0.01, { maxSteps }), /budget/);
  assert.equal(runtime.time, 0);
});

test('advancement fails explicitly when floating point precision cannot make progress', () => {
  const runtime = createRuntime();
  runtime.time = 1e15;
  assert.throws(() => advanceRuntime(counter(), runtime, 0.001), /precision/);
  assert.throws(() => advanceRuntime(counter(), runtime, 1), /precision/);
  assert.equal(runtime.time, 1e15);
});

test('adaptive live stepping accepts catalog defaults when source parameters are omitted', () => {
  const project = counter();
  delete project.nodes[0].params;
  const runtime = createRuntime();
  assert.equal(advanceRuntime(project, runtime, 0.01).reached, true);
  assert.equal(runtime.signals.outputs.counter.out, 0);
});
