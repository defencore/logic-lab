import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import { createRuntime, simulate } from '../src/simulator.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
  createPlayback,
  advancePlayback,
  stepPlayback,
  parseSequence,
  serializeSequence,
  validateSequence,
  simulationResolution,
  nextSimulationInterval,
} from '../src/action-sequence.js';

const node = (id, type, params = {}) => ({
  id,
  type,
  x: 0,
  y: 0,
  params: { ...getDefinition(type).defaults, ...params },
  enabled: true,
  label: id,
});
const wire = (id, from, port, to, input) => ({
  id,
  from: { node: from, port },
  to: { node: to, port: input },
  width: 1,
});
export function shiftCircuit() {
  return {
    version: 1,
    name: 'Serial experiment',
    nodes: [
      node('ser', 'switch', { value: 0 }),
      node('clk', 'switch', { value: 0 }),
      node('rst', 'switch', { value: 0 }),
      node('reg', 'shift_register'),
      node('lamp', 'led'),
    ],
    wires: [
      wire('s', 'ser', 'out', 'reg', 'd'),
      wire('c', 'clk', 'out', 'reg', 'clk'),
      wire('r', 'rst', 'out', 'reg', 'reset'),
      wire('l', 'reg', 'out0', 'lamp', 'in'),
    ],
  };
}
function fixture() {
  const project = shiftCircuit();
  const sequence = createSequence(project, {
    probes: [{ node: 'reg', port: 'out', side: 'outputs' }],
  });
  for (const [at, node, value] of [
    [0, 'rst', 1],
    [0, 'rst', 0],
    [0, 'ser', 1],
    [0, 'clk', 1],
    [0, 'clk', 0],
    [0.1, 'ser', 0],
    [0.1, 'clk', 1],
    [0.1, 'clk', 0],
    [0.2, 'ser', 1],
    [0.2, 'clk', 1],
  ])
    appendAction(sequence, { at, node, key: 'value', value });
  return finishSequence(sequence, 0.25);
}

test('manual SER CLK RST replay preserves ordered zero-time edges and shifted byte', () => {
  const sequence = fixture();
  const playback = replaySequence(sequence);
  assert.equal(playback.runtime.signals.outputs.reg.out, 5);
  assert.deepEqual(
    playback.observations.filter((o) => [3, 6, 9].includes(o.after)).map((o) => o.values[0]),
    [1, 2, 5],
  );
  assert.equal(
    sequence.initialProject.nodes.find((n) => n.id === 'ser').params.value,
    0,
    'immutable initial inputs',
  );
  assert.equal(playback.project.nodes.find((n) => n.id === 'ser').params.value, 1);
});
test('single action step stops after exactly one edge even when time is unchanged', () => {
  const playback = createPlayback(fixture());
  for (let index = 0; index < 4; index++) {
    const result = stepPlayback(playback);
    assert.equal(result.actionApplied, true);
    assert.equal(playback.cursor, index + 1);
    assert.equal(playback.runtime.time, 0);
  }
  assert.equal(playback.runtime.signals.outputs.reg.out, 1);
});
test('incremental timed replay respects work budgets and reaches the same counter state', () => {
  const project = {
    version: 1,
    name: 'Timed',
    nodes: [node('clock', 'clock', { frequency: 10 }), node('counter', 'counter')],
    wires: [wire('clk', 'clock', 'out', 'counter', 'clk')],
  };
  const sequence = finishSequence(
    createSequence(project, { probes: [{ node: 'counter', port: 'out' }] }),
    0.2,
  );
  const playback = createPlayback(sequence);
  const first = advancePlayback(playback, 0.2, { maxSteps: 10 });
  assert.equal(first.atTarget, false);
  assert.ok(playback.runtime.time <= 0.0050001);
  while (!playback.done) advancePlayback(playback, 0.2, { maxSteps: 10 });
  assert.equal(playback.runtime.signals.outputs.counter.out, 2);
  assert.deepEqual(playback.observations, replaySequence(sequence).observations);
});
test('reset actions clear state without rewinding the recorded timeline', () => {
  const sequence = fixture();
  appendAction(sequence, { at: 0.3, op: 'reset' });
  finishSequence(sequence, 0.4);
  const replay = replaySequence(sequence);
  assert.equal(replay.runtime.time, 0.4);
  // CLK remains high after reset, so initial settle sees its edge and shifts SER=1 once.
  assert.equal(replay.runtime.signals.outputs.reg.out, 1);
  assert.equal(replay.observations.at(-2).at, 0.3);
});
test('substituted circuit sources start from the recorded baseline and private fields are discarded', () => {
  const sequence = fixture(),
    project = shiftCircuit();
  project.nodes.find((n) => n.id === 'rst').params.value = 1;
  assert.equal(replaySequence(sequence, { project }).runtime.signals.outputs.reg.out, 5);
  assert.equal(
    parseSequence(serializeSequence({ ...sequence, fakeAnswer: 99 })).fakeAnswer,
    undefined,
  );
});
test('recordings reject invalid actions, durations, sources, probes and dangerous JSON', () => {
  const sequence = fixture();
  assert.throws(
    () => appendAction(sequence, { at: 0.1, node: 'ser', key: 'value', value: 1 }),
    /ordered/,
  );
  assert.throws(
    () => appendAction(sequence, { at: 0.3, node: 'reg', key: 'initial', value: 9 }),
    /source/,
  );
  assert.throws(
    () => appendAction(sequence, { at: 0.3, node: 'ser', key: 'value', value: 2 }),
    /range/,
  );
  assert.throws(() => finishSequence(sequence, 121), /between/);
  assert.throws(() => validateSequence({ ...sequence, duration: 0.1 }), /ends/);
  assert.throws(
    () => validateSequence({ ...sequence, probes: [{ node: 'reg', port: 'missing' }] }),
    /missing/,
  );
  assert.throws(() => parseSequence('{"__proto__":{}}'), /unsafe/);
  assert.throws(() => advancePlayback(createPlayback(sequence), 0.1, { maxSteps: 0 }), /budget/);
});

test('source action lookup rejects inherited Object prototype names', () => {
  const sequence = fixture();
  for (const key of ['constructor', 'toString', '__proto__'])
    assert.throws(() => appendAction(sequence, { at: 0.3, node: 'ser', key, value: 0 }), /source/);
});

function periodicCircuit(type, duty, frequency = 1000) {
  return {
    version: 1,
    name: 'Pulse sampling',
    nodes: [node('clock', type, { frequency, duty }), node('counter', 'counter')],
    wires: [wire('clk', 'clock', 'out', 'counter', 'clk')],
  };
}
test('narrow 1 kHz clock and PWM pulses replay every edge instead of aliasing to a constant', () => {
  for (const type of ['clock', 'pwm'])
    for (const duty of [0.2, 0.9]) {
      const project = periodicCircuit(type, duty);
      const sequence = finishSequence(
        createSequence(project, { probes: [{ node: 'counter', port: 'out' }] }),
        0.01,
      );
      const playback = replaySequence(sequence);
      const fine = createRuntime();
      simulate(project, fine, 0);
      for (let i = 0; i < 1000; i++) simulate(project, fine, 0.00001);
      fine.time = 0.01;
      simulate(project, fine, 0);
      assert.equal(
        playback.runtime.signals.outputs.counter.out,
        fine.signals.outputs.counter.out,
        `${type} duty ${duty} must match finer simulation`,
      );
      assert.equal(playback.runtime.signals.outputs.counter.out, type === 'clock' ? 10 : 11);
    }
});
test('zero frequency and duty extremes remain static and do not demand excessive work', () => {
  for (const type of ['clock', 'pwm'])
    for (const [frequency, duty, expected] of [
      [1000, 0, 0],
      [1000, 1, 1],
      [0, 0.2, type === 'clock' ? 0 : 1],
    ]) {
      const project = periodicCircuit(type, duty, frequency);
      const sequence = finishSequence(
        createSequence(project, { probes: [{ node: 'counter', port: 'out' }] }),
        0.01,
      );
      const playback = createPlayback(sequence);
      const result = advancePlayback(playback, 0.01, { maxSteps: 100 });
      assert.equal(result.done, true);
      assert.ok(result.steps < 30);
      assert.equal(playback.runtime.signals.outputs.counter.out, expected);
    }
});
test('extremely narrow periodic phases use explicit checkpoints instead of unbounded uniform microsteps', () => {
  for (const type of ['clock', 'pwm'])
    for (const duty of [1e-9, 1 - 1e-9]) {
      const project = periodicCircuit(type, duty);
      const sequence = finishSequence(
        createSequence(project, { probes: [{ node: 'counter', port: 'out' }] }),
        0.01,
      );
      const playback = createPlayback(sequence);
      assert.ok(simulationResolution(project, playback.runtime) >= 0.00005);
      const result = advancePlayback(playback, 0.01, { maxSteps: 1000 });
      assert.equal(result.done, true);
      assert.ok(result.steps < 300, 'short phase checkpoints keep work bounded');
      assert.equal(
        playback.runtime.signals.outputs.counter.out,
        type === 'clock' ? 10 : 11,
        `${type}, duty ${duty}`,
      );
    }
});
test('live stepping helper and replay agree when source timing changes in the middle of a sequence', () => {
  const project = periodicCircuit('pwm', 0.9);
  const sequence = createSequence(project, { probes: [{ node: 'counter', port: 'out' }] });
  appendAction(sequence, { at: 0.005, node: 'clock', key: 'duty', value: 0.2 });
  finishSequence(sequence, 0.01);
  const playback = replaySequence(sequence);
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  for (const target of [0.005, 0.01]) {
    while (runtime.time < target)
      simulate(project, runtime, nextSimulationInterval(project, runtime, target - runtime.time));
    if (target === 0.005) {
      project.nodes[0].params.duty = 0.2;
      simulate(project, runtime, 0);
    }
  }
  assert.equal(runtime.signals.outputs.counter.out, playback.runtime.signals.outputs.counter.out);
  assert.throws(() => nextSimulationInterval(project, runtime, -1), /invalid/);
  const invalid = periodicCircuit('clock', 0.2, 1e8);
  assert.throws(() => createSequence(invalid), /Initial input/);
});

test('PWM sampling follows the resolved analog control instead of its overridden duty setting', () => {
  const project = periodicCircuit('pwm', 0.5);
  project.nodes.push(node('control', 'bus_input', { value: 253 }), node('dac', 'dac', { vcc: 1 }));
  for (let bit = 0; bit < 8; bit++)
    project.wires.push(wire(`b${bit}`, 'control', `out${bit}`, 'dac', `in${bit}`));
  project.wires.push(wire('duty', 'dac', 'out', 'clock', 'control'));
  const sequence = finishSequence(
    createSequence(project, { probes: [{ node: 'counter', port: 'out' }] }),
    0.003,
  );
  const playback = replaySequence(sequence);
  const fine = createRuntime();
  simulate(project, fine, 0);
  for (let i = 0; i < 3000; i++) simulate(project, fine, 0.000001);
  fine.time = 0.003;
  simulate(project, fine, 0);
  assert.equal(playback.runtime.signals.outputs.counter.out, 4);
  assert.equal(playback.runtime.signals.outputs.counter.out, fine.signals.outputs.counter.out);
});
