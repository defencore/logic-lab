import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createSimulationRunner } from '../../src/workbench/simulation-runner.js';

function fixture() {
  const project = {
    version: 1,
    name: 'Clocked circuit',
    nodes: [
      { id: 'clock', type: 'clock', params: { frequency: 1000, duty: 0.2 } },
      { id: 'count', type: 'counter', params: { initial: 0 } },
    ],
    wires: [
      {
        id: 'clock-wire',
        from: { node: 'clock', port: 'out' },
        to: { node: 'count', port: 'clk' },
        width: 1,
      },
    ],
  };
  let runtime = createRuntime();
  runtime.sampleInterval = 1 / 255;
  simulate(project, runtime, 0);
  const observed = [];
  const runner = createSimulationRunner({
    getProject: () => project,
    getRuntime: () => runtime,
    onStep: (current) => observed.push(current.time),
    now: () => 0,
  });
  return {
    project,
    get runtime() {
      return runtime;
    },
    replaceRuntime(next) {
      runtime = next;
    },
    runner,
    observed,
  };
}

test('a frame budget keeps unfinished time and every narrow clock edge across later frames', () => {
  const context = fixture();
  context.runner.queue(0.01);
  const first = context.runner.process({ maxSteps: 5 });
  assert.equal(first.steps, 5);
  assert.ok(first.pendingSeconds > 0);
  assert.equal(first.reached, false);
  let frames = 1;
  while (context.runner.pendingSeconds() > 0) {
    context.runner.process({ maxSteps: 5 });
    assert.ok(++frames < 1000);
  }
  assert.equal(context.runtime.time, 0.01);
  assert.equal(context.runtime.signals.outputs.count.out, 10);
  assert.ok(context.observed.every((time, index) => !index || time > context.observed[index - 1]));
});

test('queued manual steps accumulate and replacing a runtime discards the previous timeline', () => {
  const context = fixture();
  context.runner.queue(0.01);
  context.runner.queue(0.02);
  assert.equal(context.runner.pendingSeconds(), 0.03);
  const replacement = createRuntime();
  simulate(context.project, replacement, 0);
  context.replaceRuntime(replacement);
  assert.equal(context.runner.pendingSeconds(), 0);
  assert.equal(context.runner.process().steps, 0);
  context.runner.queue(0.01);
  context.runner.discard();
  assert.equal(context.runner.pendingSeconds(), 0);
});

test('elapsed frame time yields control without consuming requested simulation time', () => {
  const context = fixture();
  let elapsed = 0;
  const runner = createSimulationRunner({
    getProject: () => context.project,
    getRuntime: () => context.runtime,
    now: () => elapsed++,
  });
  runner.queue(1);
  const result = runner.process({ milliseconds: 2 });
  assert.ok(result.steps > 0 && result.steps <= 25);
  assert.ok(result.pendingSeconds > 0.99);
  assert.throws(() => runner.queue(Infinity), /duration/);
  assert.throws(() => runner.process({ maxSteps: 0 }), /budget/);
});
