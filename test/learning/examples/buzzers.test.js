import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../examples/index.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import { nextSimulationInterval } from '../../../src/simulation/timing.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  parseSequence,
  serializeSequence,
  replaySequence,
  createPlayback,
  advancePlayback,
} from '../../../src/experiments/actions.js';

function open(id) {
  const project = createExample(id),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}

function set(context, id, value, key = 'value') {
  context.project.nodes.find((node) => node.id === id).params[key] = value;
  simulate(context.project, context.runtime, 0);
}

function advance(context, seconds, inspect = () => {}) {
  const until = context.runtime.time + seconds;
  while (context.runtime.time < until) {
    const dt = nextSimulationInterval(
      context.project,
      context.runtime,
      until - context.runtime.time,
    );
    simulate(context.project, context.runtime, dt);
    inspect(context.runtime);
  }
}

function preset(id) {
  const example = EXAMPLES.find((example) => example.id === id);
  const sequence = createSequence(example.create(), { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, example.actionPreset.at(-1).at + 0.1);
  return parseSequence(serializeSequence(sequence));
}

const near = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('the active alarm reproduces all eight truth-table rows and its six-action proof', () => {
  const context = open('active-buzzer-alarm');
  assert.deepEqual(context.runtime.diagnostics, []);
  for (const arm of [0, 1])
    for (const door of [0, 1])
      for (const request of [0, 1]) {
        set(context, 'arm', arm);
        set(context, 'door', door);
        set(context, 'test', request);
        const expected = arm & (door | request);
        assert.equal(context.runtime.inputs.buzzer.in, expected);
        assert.equal(context.runtime.inputs.lamp.in, expected);
        assert.equal(context.runtime.audio.buzzer.value, expected);
        assert.equal(context.runtime.audio.buzzer.frequency, 880);
        assert.equal(context.runtime.audio.buzzer.volume, 0.15);
      }
  const sequence = preset('active-buzzer-alarm');
  const result = replaySequence(sequence);
  assert.equal(sequence.actions.length, 6);
  assert.deepEqual(
    result.observations.map(({ values }) => values[0]),
    [0, 0, 1, 0, 1, 0, 0, 0],
  );
  for (const { values } of result.observations)
    assert.ok(values.every((value) => value === values[0]));
  assert.deepEqual(result.runtime.diagnostics, []);
});

test('the passive clock lab has actual 440 Hz periods and DC silence at either duty endpoint', () => {
  const context = open('passive-buzzer-melody');
  assert.equal(context.runtime.inputs.buzzer.in, 0);
  set(context, 'play', 1);
  const rises = [],
    falls = [];
  let previous = context.runtime.inputs.buzzer.in;
  advance(context, 0.03, (runtime) => {
    const next = runtime.inputs.buzzer.in;
    if (next !== previous) (next === 1 ? rises : falls).push(runtime.time);
    previous = next;
  });
  near(rises[2] - rises[1], 1 / 440);
  near(falls[1] - rises[1], 0.5 / 440);
  near((rises[2] - rises[1]) * 1e6, 2272.727272727273);
  near(context.runtime.audio.buzzer.measuredFrequency, 440);
  set(context, 'tone', 0.25, 'duty');
  advance(context, 0.03);
  near(context.runtime.audio.buzzer.measuredFrequency, 440);
  for (const duty of [0, 1]) {
    set(context, 'tone', duty, 'duty');
    advance(context, 0.2);
    assert.equal(context.runtime.inputs.buzzer.in, duty);
    assert.equal(context.runtime.audio.buzzer.measuredFrequency, null);
    const serial = context.runtime.audioSerial;
    advance(context, 0.03);
    assert.equal(
      context.runtime.audioSerial,
      serial,
      'A constant input generates no repeating edges.',
    );
  }
  assert.deepEqual(context.runtime.diagnostics, []);
});

test('the melody preset reproduces its five pitches, a pause, A4 and a buffered silent ending', () => {
  const sequence = preset('passive-buzzer-melody');
  assert.equal(sequence.actions.length, 10);
  const playback = createPlayback(sequence);
  for (const [at, frequency] of [
    [0.35, 440],
    [0.85, 493.883],
    [1.35, 523.251],
    [1.85, 587.33],
    [2.35, 659.255],
    [3.25, 440],
  ]) {
    advancePlayback(playback, at, { maxSteps: 250_000 });
    near(playback.runtime.audio.buzzer.measuredFrequency, frequency);
  }
  // Replay a separate copy through the pause; a stopped PLAY really is a DC low input.
  const paused = createPlayback(sequence);
  advancePlayback(paused, 2.75, { maxSteps: 250_000 });
  assert.equal(paused.runtime.inputs.buzzer.in, 0);
  assert.equal(paused.runtime.audio.buzzer.measuredFrequency, null);
  advancePlayback(playback, sequence.duration, { maxSteps: 250_000 });
  assert.equal(playback.done, true);
  assert.equal(playback.runtime.inputs.buzzer.in, 0);
  assert.equal(playback.project.nodes.find(({ id }) => id === 'tone').params.frequency, 0);
  assert.equal(sequence.initialProject.nodes.find(({ id }) => id === 'tone').params.frequency, 440);
  assert.ok(sequence.duration - sequence.actions.find(({ at }) => at === 3.5).at >= 0.3);
  assert.deepEqual(playback.runtime.diagnostics, []);
});

test('T-flip-flop note division doubles the complete period and holds either bit without oscillating', () => {
  const context = open('buzzer-clock-divider');
  const rises = { source: [], divided: [] };
  let source = context.runtime.outputs.tone.out,
    divided = context.runtime.outputs.divider.q;
  advance(context, 0.03, (runtime) => {
    const nextSource = runtime.outputs.tone.out,
      nextDivided = runtime.outputs.divider.q;
    if (source === 0 && nextSource === 1) rises.source.push(runtime.time);
    if (divided === 0 && nextDivided === 1) rises.divided.push(runtime.time);
    source = nextSource;
    divided = nextDivided;
  });
  near(rises.source[2] - rises.source[1], 1 / 880);
  near(rises.divided[2] - rises.divided[1], 1 / 440);
  near(context.runtime.audio.buzzer.measuredFrequency, 440);
  // Deliberately hold Q high, then reset and hold it low: neither bit is a period.
  for (let step = 0; step < 30 && context.runtime.outputs.divider.q !== 1; step++)
    advance(context, 0.0001);
  assert.equal(context.runtime.outputs.divider.q, 1);
  set(context, 'toggle', 0);
  advance(context, 0.2);
  assert.equal(context.runtime.outputs.divider.q, 1);
  assert.equal(context.runtime.audio.buzzer.measuredFrequency, null);
  set(context, 'reset', 1);
  assert.equal(context.runtime.outputs.divider.q, 0);
  set(context, 'reset', 0);
  advance(context, 0.03);
  assert.equal(context.runtime.outputs.divider.q, 0);
  set(context, 'toggle', 1);
  set(context, 'tone', 660, 'frequency');
  advance(context, 0.03);
  near(context.runtime.audio.buzzer.measuredFrequency, 330);
  assert.deepEqual(context.runtime.diagnostics, []);
  const result = replaySequence(preset('buzzer-clock-divider'));
  assert.equal(result.done, true);
  for (const { values } of result.observations) assert.equal(values[1], values[2]);
  assert.deepEqual(result.runtime.diagnostics, []);
});
