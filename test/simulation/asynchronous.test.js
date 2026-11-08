import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { node, source, wire, circuit, output } from './core/fixtures/simulator.js';

function value(project, id, next) {
  project.nodes.find((item) => item.id === id).params.value = next;
}

test('SR cascades reach their stable state at the same timestamp regardless of node order', () => {
  for (const reverse of [false, true]) {
    const latches = Array.from({ length: 6 }, (_, index) => node(`l${index}`, 'sr_latch'));
    const project = circuit(
      [source('s', 0), source('r', 0), ...(reverse ? [...latches].reverse() : latches)],
      latches.flatMap((latch, index) => [
        wire(index ? `l${index - 1}` : 's', index ? 'q' : 'out', latch.id, 's'),
        wire('r', 'out', latch.id, 'r'),
      ]),
    );
    const runtime = createRuntime();
    simulate(project, runtime, 0);
    value(project, 's', 1);
    simulate(project, runtime, 0);
    assert.deepEqual(
      latches.map((latch) => output(runtime, latch.id, 'q')),
      Array(6).fill(1),
    );
    assert.equal(runtime.time, 0);
    assert.deepEqual(runtime.diagnostics, []);
  }
});

test('a newly clocked flip-flop immediately resets a downstream flip-flop', () => {
  const project = circuit(
    [
      source('clk', 0),
      source('data', 1),
      node('first', 'd_ff'),
      node('second', 'd_ff', { initial: 1 }),
    ],
    [
      wire('clk', 'out', 'first', 'clk'),
      wire('data', 'out', 'first', 'd'),
      wire('clk', 'out', 'second', 'clk'),
      wire('data', 'out', 'second', 'd'),
      wire('first', 'q', 'second', 'reset'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  value(project, 'clk', 1);
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'first', 'q'), 1);
  assert.equal(runtime.inputs.second.reset, 1);
  assert.equal(output(runtime, 'second', 'q'), 0);
  assert.equal(runtime.time, 0);
});

test('simultaneous D flip-flops capture the previous shared snapshot exactly once', () => {
  const project = circuit(
    [source('clk', 0), source('data', 1), node('a', 'd_ff'), node('b', 'd_ff')],
    [
      wire('clk', 'out', 'a', 'clk'),
      wire('clk', 'out', 'b', 'clk'),
      wire('data', 'out', 'a', 'd'),
      wire('a', 'q', 'b', 'd'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  value(project, 'clk', 1);
  simulate(project, runtime, 0);
  assert.deepEqual([output(runtime, 'a', 'q'), output(runtime, 'b', 'q')], [1, 0]);
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'b', 'q'), 0);
  value(project, 'clk', 0);
  simulate(project, runtime, 0);
  value(project, 'clk', 1);
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'b', 'q'), 1);
});

test('a counter-generated clock reaches a downstream edge-triggered component without another physics step', () => {
  const project = circuit(
    [source('clk', 0), source('data', 1), node('counter', 'counter'), node('ff', 'd_ff')],
    [
      wire('clk', 'out', 'counter', 'clk'),
      wire('counter', 'out0', 'ff', 'clk'),
      wire('data', 'out', 'ff', 'd'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  value(project, 'clk', 1);
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'counter'), 1);
  assert.equal(output(runtime, 'ff', 'q'), 1);
});

test('Schmitt hysteresis ignores temporary DAC codes during combinational settling', () => {
  const project = circuit(
    [source('s', 0), node('not', 'not'), node('dac', 'dac'), node('schmitt', 'schmitt')],
    [
      wire('s', 'out', 'not', 'a'),
      wire('s', 'out', 'dac', 'in7'),
      ...Array.from({ length: 7 }, (_, bit) => wire('not', 'out', 'dac', `in${bit}`)),
      wire('dac', 'out', 'schmitt', 'in'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  assert.equal(output(runtime, 'schmitt'), 0);
  value(project, 's', 1);
  simulate(project, runtime, 0);
  assert.ok(output(runtime, 'dac') > 2.5 && output(runtime, 'dac') < 2.51);
  assert.equal(output(runtime, 'schmitt'), 0);
});

test('asynchronous waves do not multiply world integration or FM phase advancement', () => {
  const project = circuit(
    [
      source('one', 1),
      source('zero', 0),
      node('tank', 'water_tank', { initialLevel: 35 }),
      node('fm', 'fm', { carrier: 2, depth: 0.5 }),
    ],
    [
      wire('one', 'out', 'tank', 'pump'),
      wire('zero', 'out', 'tank', 'drain'),
      wire('one', 'out', 'fm', 'mod'),
    ],
  );
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  simulate(project, runtime, 0.1);
  assert.ok(Math.abs(runtime.state.tank.scenario.level - 36.2) < 1e-10);
  assert.ok(Math.abs(runtime.state.fm.fmPhase - Math.PI * 0.6) < 1e-10);
});
