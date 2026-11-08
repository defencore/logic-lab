import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../src/simulator.js';
import {
  MAX_RECORDING_SAMPLES,
  createRecording,
  appendRecording,
  stopRecording,
  recordingCsv,
} from '../src/recording.js';

const recording = (options = {}) =>
  createRecording({
    traces: [{ id: 'clock', label: 'Generator' }],
    sampleInterval: 0.001,
    ...options,
  });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);

test('a 1 kHz generator records every transition beyond the rolling history limit', () => {
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 1000, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  const capture = recording({ sampleInterval: 0.00001 });
  simulate(project, runtime, 0);
  appendRecording(capture, runtime.time, [runtime.outputs.clock.out]);
  for (let index = 0; index < 510; index++) {
    simulate(project, runtime, 0.00001);
    appendRecording(capture, runtime.time, [runtime.outputs.clock.out]);
  }
  assert.equal(capture.samples.length, 511);
  assert.equal(runtime.history.clock.length, 256);
  assert.equal(capture.samples[25].values[0], 0);
  assert.equal(capture.samples[75].values[0], 1);
  const transitions = capture.samples
    .slice(1)
    .filter((sample, index) => sample.values[0] !== capture.samples[index].values[0]);
  assert.equal(transitions.length, 10);
  transitions.forEach((sample, index) =>
    assert.ok(Math.abs(sample.time - (index + 1) * 0.0005) <= 0.000010001),
  );
  near(capture.samples.at(-1).time, 0.0051);
});

test('slower playback and paused frames preserve simulated sample times', () => {
  const regular = recording({ startedAt: 12 });
  const slow = recording({ startedAt: 12 });
  for (let index = 0; index <= 20; index++) {
    const time = 12 + index * 0.001;
    appendRecording(regular, time, [index % 2]);
    // Extra rendered frames at the same simulated time add no duplicated data.
    for (let frame = 0; frame < 10; frame++) appendRecording(slow, time, [index % 2]);
  }
  assert.deepEqual(slow.samples, regular.samples);
  assert.equal(slow.samples.length, 21);
  assert.equal(slow.samples[0].time, 0);
  near(slow.samples.at(-1).time, 0.02);
});

test('a 10 ms recording keeps its cadence when physics steps do not divide the sample interval', () => {
  const interval = 0.01 / 255;
  const step = 0.00003;
  const capture = recording({ sampleInterval: interval });
  const project = {
    nodes: [{ id: 'clock', type: 'clock', params: { frequency: 1000, duty: 0.5 } }],
    wires: [],
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  appendRecording(capture, runtime.time, [runtime.outputs.clock.out]);
  for (let index = 0; index < 334; index++) {
    simulate(project, runtime, step);
    appendRecording(capture, runtime.time, [runtime.outputs.clock.out]);
  }
  assert.equal(capture.samples.length, 256);
  capture.samples.forEach((sample, index) => {
    const scheduledTime = index * interval;
    assert.ok(sample.time >= scheduledTime - 1e-12);
    assert.ok(sample.time - scheduledTime < step + 1e-12);
  });
  const transitions = capture.samples
    .slice(1)
    .filter((sample, index) => sample.values[0] !== capture.samples[index].values[0]);
  assert.equal(transitions.length, 20);
  transitions.forEach((sample, index) => {
    const edgeTime = (index + 1) * 0.0005;
    assert.ok(sample.time >= edgeTime - 1e-12);
    assert.ok(sample.time - edgeTime < interval + step + 1e-12);
  });
});

test('variable frame subdivision preserves deadlines and exports actual sampled timestamps', () => {
  const interval = 0.000039;
  const increments = [0.000011, 0.000029, 0.000017, 0.000032, 0.000007];
  const capture = recording({ startedAt: 7.25, sampleInterval: interval });
  let time = capture.startedAt;
  const observedTimes = new Set([time]);
  appendRecording(capture, time, [time]);
  for (let step = 0; time - capture.startedAt < 0.01; step++) {
    time += increments[step % increments.length];
    observedTimes.add(time);
    appendRecording(capture, time, [time]);
  }
  const expected = Math.floor((time - capture.startedAt) / interval) + 1;
  assert.ok(Math.abs(capture.samples.length - expected) <= 1);
  capture.samples.forEach((sample, index) => {
    assert.ok(observedTimes.has(sample.values[0]));
    assert.equal(sample.time, sample.values[0] - capture.startedAt);
    assert.ok(sample.time >= index * interval - 1e-12);
    assert.ok(sample.time - index * interval < Math.max(...increments) + 1e-12);
  });
});

test('coarse time advances skip missed deadlines and forced samples preserve the next deadline', () => {
  const capture = recording();
  appendRecording(capture, 0, [0]);
  assert.equal(appendRecording(capture, 0.0103, [1]), true);
  assert.equal(capture.samples.length, 2);
  near(capture.nextSampleAt, 0.011);
  assert.equal(appendRecording(capture, 0.0105, [0]), false);
  assert.equal(appendRecording(capture, 0.011, [1]), true);
  assert.equal(appendRecording(capture, 0.0111, [0], { force: true }), true);
  near(capture.nextSampleAt, 0.012);
  assert.equal(appendRecording(capture, 0.0119, [1]), false);
  assert.equal(appendRecording(capture, 0.012, [1]), true);
  assert.equal(capture.samples.length, 5);
});

test('signal columns and accepted sample values are stable snapshots', () => {
  const traces = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ];
  const capture = recording({ traces });
  const values = [1, 2.5];
  appendRecording(capture, 0, values);
  traces.reverse();
  traces[0].label = 'Renamed';
  values[0] = 0;
  assert.deepEqual(
    capture.traces.map(({ id, label }) => ({ id, label })),
    [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
  );
  assert.deepEqual(capture.samples[0].values, [1, 2.5]);
});

test('sampling rejects backwards times, skips duplicates and allows a final forced sample', () => {
  const capture = recording({ startedAt: 4 });
  assert.equal(appendRecording(capture, 3.9, [0]), false);
  assert.equal(appendRecording(capture, 4, [0]), true);
  assert.equal(appendRecording(capture, 4, [1], { force: true }), false);
  assert.equal(appendRecording(capture, 4.0001, [1]), false);
  assert.equal(appendRecording(capture, 4.001, [1]), true);
  assert.equal(appendRecording(capture, 4.0005, [0]), false);
  assert.equal(appendRecording(capture, 4.0012, [0], { force: true }), true);
  stopRecording(capture);
  assert.equal(appendRecording(capture, 4.1, [1]), false);
  assert.equal(capture.samples.length, 3);
});

test('reaching capacity stops visibly without overwriting earlier samples', () => {
  const capture = recording({ maxSamples: 3 });
  for (let index = 0; index < 4; index++) appendRecording(capture, index, [index]);
  assert.equal(capture.active, false);
  assert.equal(capture.limitReached, true);
  assert.deepEqual(
    capture.samples.map((sample) => sample.values[0]),
    [0, 1, 2],
  );
  assert.equal(MAX_RECORDING_SAMPLES, 100_000);
  assert.throws(() => recording({ maxSamples: 100_001 }), RangeError);
});

test('CSV preserves precise simulated seconds, Ukrainian text, unknowns and safe column labels', () => {
  const capture = recording({
    startedAt: 0.2,
    traces: [
      { id: 'ua', label: 'Сигнал, "А"\nвихід' },
      { id: 'formula', label: '  =1+1' },
      { id: 'z', label: 'Z' },
      { id: 'unknown', label: 'X' },
      { id: 'missing', label: '@unsafe' },
    ],
  });
  appendRecording(capture, 0.2, [1.23456789012345, 'X', 'Z', null]);
  appendRecording(capture, 0.200000123456, [0, 1, undefined, Infinity, 'ignored'], {
    force: true,
  });
  const csv = recordingCsv(capture);
  assert.ok(csv.startsWith('\uFEFFtime_s,'));
  assert.ok(csv.includes('"Сигнал, ""А""\nвихід [ua]"'));
  assert.ok(csv.includes('"\'  =1+1 [formula]"'));
  assert.ok(csv.includes('"\'@unsafe [missing]"'));
  assert.ok(csv.includes('\r\n0,1.23456789012345,X,Z,X,Z\r\n'));
  const lastRow = csv.trimEnd().split('\r\n').at(-1).split(',');
  near(Number(lastRow[0]), 0.000000123456);
  assert.deepEqual(lastRow.slice(1), ['0', '1', 'Z', 'X', 'X']);
});

test('recording rejects invalid intervals, capacities, timestamps and ambiguous signal columns', () => {
  for (const sampleInterval of [0, -1, NaN, Infinity, undefined])
    assert.throws(() => recording({ sampleInterval }), RangeError);
  for (const maxSamples of [0, -1, 1.5, Infinity])
    assert.throws(() => recording({ maxSamples }), RangeError);
  assert.throws(() => recording({ startedAt: NaN }), RangeError);
  assert.throws(() => recording({ traces: [] }), TypeError);
  assert.throws(() => recording({ traces: [{ id: 'a' }, { id: 'a' }] }), TypeError);
  assert.throws(() => appendRecording(recording(), Infinity, [1]), RangeError);
});
