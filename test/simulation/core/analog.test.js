import { node, wire, circuit, source, byte, output, evaluate } from './fixtures/simulator.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

test('DAC/ADC round trip preserves every byte and clamps voltage range', () => {
  const project = circuit(
    [byte('data', 0), node('dac', 'dac'), node('adc', 'adc')],
    [wire('data', 'out', 'dac', 'in'), wire('dac', 'out', 'adc', 'in')],
  );
  const runtime = createRuntime();
  for (let value = 0; value <= 255; value++) {
    project.nodes[0].params.value = value;
    simulate(project, runtime, 0);
    assert.equal(output(runtime, 'adc'), value);
  }
  assert.equal(output(runtime, 'dac'), 5);
});

test('Schmitt hysteresis holds its state between switching thresholds', () => {
  const project = circuit(
    [byte('voltage', 0), node('dac', 'dac'), node('s', 'schmitt')],
    [wire('voltage', 'out', 'dac', 'in'), wire('dac', 'out', 's', 'in')],
  );
  const runtime = evaluate(project);
  assert.equal(output(runtime, 's'), 0);
  project.nodes[0].params.value = 128;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 0);
  project.nodes[0].params.value = 220;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 1);
  project.nodes[0].params.value = 128;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 1);
  project.nodes[0].params.value = 20;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 's'), 0);
});

test('monostable pulse expires and does not retrigger while active', () => {
  const project = circuit(
    [source('trigger', 0), node('timer', 'monostable', { duration: 0.1 })],
    [wire('trigger', 'out', 'timer', 'trigger')],
  );
  const runtime = evaluate(project);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'timer'), 1);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0.03);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0.03);
  simulate(project, runtime, 0.05);
  assert.equal(output(runtime, 'timer'), 0);
});

test('AM/FM outputs stay bounded and scopes cap their numeric history', () => {
  for (const type of ['am', 'fm']) {
    const project = circuit(
      [node('wave', type), node('scope', 'scope')],
      [wire('wave', 'out', 'scope', 'in')],
    );
    const runtime = createRuntime();
    for (let step = 0; step < 500; step++) {
      simulate(project, runtime, 0.001);
      assert.ok(output(runtime, 'wave') >= 0 && output(runtime, 'wave') <= 5);
    }
    assert.equal(runtime.history.scope.length, 256);
    assert.ok(runtime.history.scope.every(Number.isFinite));
  }
});

test('digital modulation uses the complete modulation range for an individual bit', () => {
  const project = circuit(
    [source('data', 0), node('am', 'am', { carrier: 8, depth: 0.6, amplitude: 5 })],
    [wire('data', 'out', 'am', 'mod')],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 1 / 32);
  assert.ok(Math.abs(output(runtime, 'am') - 3.125) < 1e-10);
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  assert.ok(Math.abs(output(runtime, 'am') - 5) < 1e-10);
  project.nodes[0] = byte('data', 128);
  project.wires[0].from.port = 'out7';
  simulate(project, runtime, 0);
  assert.ok(Math.abs(output(runtime, 'am') - 5) < 1e-10);
});
