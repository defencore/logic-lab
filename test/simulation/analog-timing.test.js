import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { advanceRuntime } from '../../src/simulation/advance.js';
import {
  simulationResolution,
  maximumTraceWindow,
  periodicLevel,
} from '../../src/simulation/timing.js';

function project(type, params) {
  return { nodes: [{ id: 'wave', type, params }], wires: [] };
}

test('1 kHz AM and FM carriers retain oscillations in actual physics rather than becoming DC', () => {
  for (const type of ['am', 'fm']) {
    const p = project(type, { carrier: 1000, frequency: 1, depth: 0, amplitude: 5 });
    const runtime = createRuntime();
    simulate(p, runtime, 0);
    const values = [];
    const result = advanceRuntime(p, runtime, 0.01, {
      maxSteps: 5000,
      onStep: (r) => values.push(r.signals.outputs.wave.out),
    });
    assert.equal(result.reached, true);
    assert.ok(values.length >= 320);
    assert.ok(Math.min(...values) < 0.05);
    assert.ok(Math.max(...values) > 4.95);
    assert.ok(simulationResolution(p, runtime) <= 1 / 32000);
  }
});

test('analog physics accounts for sidebands and the maximum FM deviation', () => {
  const am = project('am', { carrier: 1000, frequency: 1000, depth: 1 });
  const fm = project('fm', { carrier: 1000, frequency: 1000, depth: 1 });
  assert.ok(simulationResolution(am) <= 1 / (2000 * 32));
  assert.ok(simulationResolution(fm) <= 1 / (3000 * 32));
  assert.ok(maximumTraceWindow(am) < 0.01);
  assert.ok(maximumTraceWindow(fm) < maximumTraceWindow(am));
  assert.equal(maximumTraceWindow({ nodes: [], wires: [] }), Infinity);
});

test('disabled analog sources do not impose extra physics or display sampling requirements', () => {
  const p = project('fm', { carrier: 1000, frequency: 1000, depth: 1 });
  p.nodes[0].enabled = false;
  assert.equal(simulationResolution(p), 0.0005);
  assert.equal(maximumTraceWindow(p), Infinity);
});

test('periodic levels are right-continuous at exact rising and falling edge checkpoints', () => {
  assert.equal(periodicLevel('pwm', 0.02, 50, 0.075), 1);
  assert.equal(periodicLevel('pwm', 0.0215, 50, 0.075), 0);
  assert.equal(periodicLevel('clock', 0.01, 50, 0.5), 1);
  assert.equal(periodicLevel('clock', 0.02, 50, 0.5), 0);
  assert.equal(periodicLevel('pwm', 1, 1000, 0), 0);
  assert.equal(periodicLevel('pwm', 1, 1000, 1), 1);
});
