import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../src/components/catalog/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { nextSimulationInterval } from '../../src/simulation/timing.js';
import {
  AUDIO_EVENT_CAPACITY,
  captureAudio,
  audioParameterError,
} from '../../src/simulation/audio.js';

const wire = (source, target = 'device', port = 'in') => ({
  id: `${source}-${target}-${port}`,
  from: { node: source, port: 'out' },
  to: { node: target, port },
});
function fixture(type = 'active_buzzer', value = 0, params = {}) {
  const project = {
    nodes: [
      { id: 'source', type: 'switch', params: { value } },
      { id: 'device', type, params },
    ],
    wires: [wire('source')],
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}
const events = (runtime) => runtime.audioEvents.map(({ at, value }) => [at, value]);

test('buzzer contacts are separate digital inputs without electrical outputs', () => {
  for (const type of ['active_buzzer', 'passive_buzzer']) {
    const definition = getDefinition(type);
    assert.equal(definition.category, 'audio');
    assert.deepEqual(definition.outputs, []);
    assert.equal(definition.inputs.length, 1);
    assert.equal(definition.inputs[0].id, 'in');
    assert.equal(definition.inputs[0].width, 1);
    assert.equal(definition.inputs[0].analog, undefined);
    assert.match(definition.descriptionUa, /бузер/);
  }
});

test('active buzzer emits an initial settled gate and constant tone configuration without periodic fake edges', () => {
  const { project, runtime } = fixture('active_buzzer', 1);
  assert.deepEqual(runtime.audioEvents, [
    {
      serial: 1,
      node: 'device',
      type: 'active_buzzer',
      at: 0,
      value: 1,
      frequency: 880,
      volume: 0.15,
    },
  ]);
  for (let step = 0; step < 10; step++) simulate(project, runtime, 0.01);
  assert.equal(runtime.audioEvents.length, 1);
  assert.equal(runtime.audio.device.parametersValid, true);
  assert.equal(runtime.audio.device.inputValid, true);
  assert.equal(runtime.audio.device.period, null);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(runtime.audioEvents.at(-1).value, 0);
});

test('constant passive high and low have no measured carrier or generated tone events', () => {
  for (const value of [0, 1]) {
    const { project, runtime } = fixture('passive_buzzer', value);
    for (let step = 0; step < 100; step++) simulate(project, runtime, 0.01);
    assert.equal(runtime.audioEvents.length, 1);
    assert.equal(runtime.audioEvents[0].frequency, null);
    assert.equal(runtime.audio.device.value, value);
    assert.equal(runtime.audio.device.measuredFrequency, null);
    assert.equal(runtime.audio.device.period, null);
    assert.equal(runtime.audio.device.lastEdgeAt, null);
  }
});

test('passive buzzer captures exact PWM edges independently of decimated display history', () => {
  const { project, runtime } = fixture('passive_buzzer');
  Object.assign(project.nodes[0], { type: 'pwm', params: { frequency: 1000, duty: 0.25 } });
  // A fresh runtime makes the PWM high at the initial checkpoint.
  const measured = createRuntime();
  measured.sampleInterval = 0.01;
  simulate(project, measured, 0);
  while (measured.time < 0.003)
    simulate(project, measured, nextSimulationInterval(project, measured, 0.003 - measured.time));
  const expected = [
    [0, 1],
    [0.00025, 0],
    [0.001, 1],
    [0.00125, 0],
    [0.002, 1],
    [0.00225, 0],
    [0.003, 1],
  ];
  assert.equal(measured.audioEvents.length, expected.length);
  events(measured).forEach(([at, value], index) => {
    assert.ok(Math.abs(at - expected[index][0]) < 1e-12);
    assert.equal(value, expected[index][1]);
  });
  assert.deepEqual(measured.historyTimes, []);
  assert.ok(Math.abs(measured.audio.device.period - 0.001) < 1e-12);
  assert.ok(Math.abs(measured.audio.device.measuredFrequency - 1000) < 1e-7);
  assert.equal(
    measured.audioEvents.every(({ frequency }) => frequency === null),
    true,
  );
  assert.equal(runtime.audioEvents.length, 1);
});

test('zero-time ordered changes remain separate events without inventing an infinite passive frequency', () => {
  const { project, runtime } = fixture('passive_buzzer');
  for (const value of [1, 0, 1, 0]) {
    project.nodes[0].params.value = value;
    simulate(project, runtime, 0);
  }
  assert.deepEqual(events(runtime), [
    [0, 0],
    [0, 1],
    [0, 0],
    [0, 1],
    [0, 0],
  ]);
  assert.deepEqual(
    runtime.audioEvents.map(({ serial }) => serial),
    [1, 2, 3, 4, 5],
  );
  assert.equal(runtime.audio.device.measuredFrequency, null);
  assert.equal(runtime.audio.device.period, null);
});

test('measurement expires after an observed waveform stops and does not reuse an old phase on recovery', () => {
  const { project, runtime } = fixture('passive_buzzer');
  for (let index = 1; index <= 5; index++) {
    project.nodes[0].params.value = index % 2;
    simulate(project, runtime, 0.0005);
  }
  assert.ok(Math.abs(runtime.audio.device.measuredFrequency - 1000) < 1e-7);
  const count = runtime.audioEvents.length;
  simulate(project, runtime, 0.2);
  assert.equal(runtime.audioEvents.length, count);
  assert.equal(runtime.audio.device.measuredFrequency, null);
  assert.equal(runtime.audio.device.period, null);
  project.nodes[0].params.value = 0;
  simulate(project, runtime, 0);
  assert.equal(runtime.audio.device.measuredFrequency, null);
});

test('audio capture ignores intermediate gate propagation states and records only final settled input', () => {
  const project = {
    nodes: [
      { id: 'device', type: 'active_buzzer', params: {} },
      { id: 'second', type: 'not', params: {} },
      { id: 'first', type: 'not', params: {} },
      { id: 'source', type: 'switch', params: { value: 1 } },
    ],
    wires: [wire('source', 'first', 'a'), wire('first', 'second', 'a'), wire('second')],
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  assert.deepEqual(events(runtime), [[0, 1]]);
  project.nodes[3].params.value = 0;
  simulate(project, runtime, 0);
  assert.deepEqual(events(runtime), [
    [0, 1],
    [0, 0],
  ]);
  captureAudio(project, runtime, { settled: false });
  assert.equal(runtime.audioEvents.at(-1).value, null);
  assert.equal(runtime.audio.device.inputValid, false);
});

test('disabled, conflicting and floating buzzer inputs explicitly silence and safely recover', () => {
  for (const type of ['active_buzzer', 'passive_buzzer']) {
    const { project, runtime } = fixture(type, 1);
    project.nodes[1].enabled = false;
    simulate(project, runtime, 0);
    assert.equal(runtime.audioEvents.at(-1).value, null);
    assert.equal(runtime.audio.device.enabled, false);
    project.nodes[1].enabled = true;
    simulate(project, runtime, 0);
    assert.equal(runtime.audioEvents.at(-1).value, 1);
    project.nodes.push({ id: 'conflict', type: 'switch', params: { value: 0 } });
    project.wires.push(wire('conflict'));
    simulate(project, runtime, 0);
    assert.equal(runtime.audio.device.input, 'X');
    assert.equal(runtime.audioEvents.at(-1).value, null);
    project.wires = [];
    simulate(project, runtime, 0);
    assert.equal(runtime.audio.device.input, 'Z');
    assert.equal(runtime.audio.device.value, null);
    project.wires.push(wire('source'));
    simulate(project, runtime, 0);
    assert.equal(runtime.audioEvents.at(-1).value, 1);
  }
});

test('parameter edits emit ordered configuration events and zero volume remains a valid mute', () => {
  const { project, runtime } = fixture('active_buzzer', 1);
  Object.assign(project.nodes[1].params, { frequency: 1200, volume: 0.25 });
  simulate(project, runtime, 0);
  assert.equal(runtime.audioEvents.length, 2);
  assert.equal(runtime.audioEvents.at(-1).frequency, 1200);
  assert.equal(runtime.audioEvents.at(-1).volume, 0.25);
  project.nodes[1].params.volume = 0;
  simulate(project, runtime, 0);
  assert.equal(runtime.audioEvents.at(-1).volume, 0);
  assert.equal(runtime.audio.device.parametersValid, true);
  assert.deepEqual(runtime.diagnostics, []);
});

test('invalid audio parameters silence and diagnose until valid configuration returns', () => {
  for (const params of [
    { frequency: 19 },
    { frequency: 20001 },
    { frequency: Infinity },
    { volume: -0.1 },
    { volume: 1.1 },
  ]) {
    const { project, runtime } = fixture('active_buzzer', 1, params);
    assert.equal(runtime.audio.device.value, null);
    assert.equal(runtime.audio.device.parametersValid, false);
    assert.ok(runtime.diagnostics.some(({ code }) => code === 'invalid_audio'));
    Object.assign(project.nodes[1].params, { frequency: 880, volume: 0.15 });
    simulate(project, runtime, 0);
    assert.equal(runtime.audioEvents.at(-1).value, 1);
    assert.deepEqual(runtime.diagnostics, []);
  }
  assert.equal(audioParameterError('active_buzzer', { frequency: 20, volume: 0 }), null);
  assert.equal(audioParameterError('active_buzzer', { frequency: 20000, volume: 1 }), null);
  assert.equal(audioParameterError('passive_buzzer', { volume: 0.15 }), null);
});

test('node removal and buzzer type changes release the old voice with its original type', () => {
  const { project, runtime } = fixture('active_buzzer', 1);
  project.nodes[1].type = 'passive_buzzer';
  simulate(project, runtime, 0);
  assert.deepEqual(
    runtime.audioEvents.slice(-2).map(({ type, value }) => [type, value]),
    [
      ['active_buzzer', null],
      ['passive_buzzer', 1],
    ],
  );
  project.nodes[1].type = 'led';
  simulate(project, runtime, 0);
  assert.equal(runtime.audioEvents.at(-1).type, 'passive_buzzer');
  assert.equal(runtime.audioEvents.at(-1).value, null);
  assert.equal(runtime.audio.device, undefined);
  const count = runtime.audioEvents.length;
  simulate(project, runtime, 0);
  assert.equal(runtime.audioEvents.length, count);
  const removed = fixture('active_buzzer', 1);
  removed.project.nodes.pop();
  simulate(removed.project, removed.runtime, 0);
  assert.equal(removed.runtime.audioEvents.at(-1).value, null);
});

test('event retention is bounded with monotonic serials so consumers can detect an overflow gap', () => {
  const { project, runtime } = fixture('passive_buzzer');
  const total = AUDIO_EVENT_CAPACITY + 3;
  for (let index = 1; index < total; index++) {
    runtime.time = index / 2000;
    runtime.signals.inputs.device.in = index % 2;
    captureAudio(project, runtime);
  }
  assert.equal(runtime.audioSerial, total);
  assert.ok(runtime.audioEvents.length <= AUDIO_EVENT_CAPACITY);
  assert.ok(runtime.audioEvents[0].serial > 1);
  runtime.audioEvents.forEach((event, index) => {
    assert.equal(event.serial, runtime.audioEvents[0].serial + index);
    if (index) assert.ok(event.at >= runtime.audioEvents[index - 1].at);
  });
  assert.equal(runtime.audioEvents.at(-1).serial, total);
});
