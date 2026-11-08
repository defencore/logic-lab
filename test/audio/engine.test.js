import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine } from '../../src/audio/engine.js';
import { createAudioVoice } from '../../src/audio/voice.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { nextSimulationInterval } from '../../src/simulation/timing.js';
import { fakeAudioContext, audioFixture, append } from './fixture.js';

test('audio is off and lazy until enabled, and active tones keep their configured frequency at any simulation rate', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture();
  engine.sync({ ...f, running: true, rate: 1 });
  assert.equal(AudioContext.instances.length, 0);
  assert.equal(engine.status().enabled, false);
  assert.equal(await engine.enable(), true);
  const context = AudioContext.instances[0];
  engine.sync({ ...f, running: true, rate: 1 });
  let oscillator = context.nodes.find((node) => node.kind === 'oscillator');
  assert.equal(oscillator.frequency.at(0.1), 880);
  assert.equal(oscillator.outputs[0].gain.at(0.1), 0.15);
  assert.equal(context.nodes[0].gain.value, 0.25);
  engine.sync({ ...f, running: true, rate: 2 });
  assert.equal(oscillator.stopped, true);
  oscillator = context.nodes.filter((node) => node.kind === 'oscillator').at(-1);
  assert.equal(oscillator.frequency.at(0.1), 880);
  engine.sync({ ...f, running: false, rate: 2 });
  assert.equal(oscillator.stopped, true);
  assert.equal(engine.status().voices, 0);
  assert.equal(engine.status().contextState, 'suspended');
  engine.dispose();
  assert.equal(context.state, 'closed');
});

test('passive DC high and low remain silent without creating an oscillator or an artificial startup edge', async () => {
  for (const value of [0, 1]) {
    const AudioContext = fakeAudioContext(),
      engine = createAudioEngine({ AudioContext });
    await engine.enable();
    engine.sync({ ...audioFixture('passive_buzzer', value), running: true, rate: 1 });
    const context = AudioContext.instances[0];
    assert.equal(
      context.nodes.some((node) => node.kind === 'oscillator'),
      false,
    );
    const source = context.nodes.find((node) => node.kind === 'constant');
    assert.equal(source.offset.at(0.11), 0);
    assert.equal(source.outputs[0].type, 'highpass');
    assert.equal(source.outputs[0].frequency.value, 35);
    engine.dispose();
  }
});

test('440 Hz passive audio schedules every actual settled simulation edge across frames without display-history inference', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const project = {
    nodes: [
      { id: 'clock', type: 'clock', params: { frequency: 440, duty: 0.5 } },
      { id: 'buzzer', type: 'passive_buzzer', params: {} },
    ],
    wires: [
      { id: 'tone', from: { node: 'clock', port: 'out' }, to: { node: 'buzzer', port: 'in' } },
    ],
  };
  const runtime = createRuntime();
  runtime.sampleInterval = 1;
  simulate(project, runtime, 0);
  const baseline = runtime.audio.buzzer.value;
  await engine.enable();
  engine.sync({ project, runtime, running: true, rate: 1 });
  const context = AudioContext.instances[0],
    source = context.nodes.find((node) => node.kind === 'constant');
  for (const target of [0.016, 0.032]) {
    while (runtime.time < target - 1e-12)
      simulate(project, runtime, nextSimulationInterval(project, runtime, target - runtime.time));
    context.currentTime = target;
    engine.sync({ project, runtime, running: true, rate: 1 });
  }
  const edges = runtime.audioEvents.slice(1);
  assert.ok(edges.length >= 27);
  assert.deepEqual(runtime.historyTimes, []);
  const scheduled = source.offset.events.slice(1);
  assert.equal(scheduled.length, edges.length);
  edges.forEach((edge, index) => {
    assert.ok(Math.abs(scheduled[index].at - (0.1 + edge.at)) < 1e-12);
    assert.equal(scheduled[index].value, edge.value - baseline);
  });
  assert.ok(Math.abs(edges[2].at - edges[0].at - 1 / 440) < 1e-12);
  assert.equal(engine.status().scheduledEvents, edges.length);
  engine.sync({ project, runtime, running: true, rate: 1 });
  assert.equal(engine.status().scheduledEvents, edges.length);
  assert.equal(
    context.nodes.some((node) => node.kind === 'oscillator'),
    false,
  );
  engine.dispose();
});

test('unknown input, node removal, runtime reset and ledger gaps cannot leave a stale voice playing', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture();
  await engine.enable();
  engine.sync({ ...f, running: true });
  const context = AudioContext.instances[0],
    oscillator = context.nodes.find((node) => node.kind === 'oscillator');
  append(f, 0.01, null);
  context.currentTime = 0.01;
  engine.sync({ ...f, running: true });
  assert.equal(oscillator.outputs[0].gain.at(0.11), 0);
  f.project.nodes = [];
  engine.sync({ ...f, running: true });
  assert.equal(oscillator.stopped, true);
  assert.equal(engine.status().voices, 0);
  const fresh = audioFixture();
  engine.sync({ ...fresh, running: true });
  assert.equal(engine.status().voices, 1);
  fresh.runtime.time = 0.02;
  fresh.runtime.audioEvents = [{ ...fresh.runtime.audioEvents[0], serial: 9, at: 0.02 }];
  fresh.runtime.audioSerial = 9;
  engine.sync({ ...fresh, running: true });
  assert.equal(engine.status().underruns, 1);
  assert.equal(engine.status().lastSerial, 9);
  engine.dispose();
});

test('a stalled timeline has a scheduled silence boundary and cannot sustain stale audio while frames continue', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture();
  await engine.enable();
  engine.sync({ ...f, running: true });
  const context = AudioContext.instances[0],
    oscillator = context.nodes.find((node) => node.kind === 'oscillator');
  assert.equal(oscillator.outputs[0].gain.at(0.121), 0);
  context.currentTime = 0.2;
  engine.sync({ ...f, running: true });
  assert.equal(engine.status().voices, 0);
  engine.sync({ ...f, running: true });
  assert.equal(engine.status().voices, 0);
  f.runtime.time = 0.01;
  engine.sync({ ...f, running: true });
  assert.equal(engine.status().voices, 1);
  engine.dispose();
});

test('rapid enable-disable cancellation and rejected contexts fail silently without leaking an enabled context', async () => {
  const AudioContext = fakeAudioContext();
  let resume;
  AudioContext.prototype.resume = function () {
    return new Promise((resolve) => {
      resume = () => {
        this.state = 'running';
        resolve();
      };
    });
  };
  const engine = createAudioEngine({ AudioContext });
  const opening = engine.enable();
  engine.disable();
  resume();
  assert.equal(await opening, false);
  assert.equal(engine.status().enabled, false);
  assert.equal(engine.status().contextState, 'suspended');
  engine.dispose();
  const Blocked = fakeAudioContext();
  Blocked.prototype.resume = async function () {
    throw new Error('Autoplay blocked');
  };
  const blocked = createAudioEngine({ AudioContext: Blocked });
  assert.equal(await blocked.enable(), false);
  assert.equal(blocked.status().error, 'blocked');
  assert.equal(blocked.status().voices, 0);
  blocked.dispose();
});

test('voice count, output level and retained AudioParam histories are bounded during sustained timed edges', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture();
  f.project.nodes = Array.from({ length: 30 }, (_, index) => ({
    id: `b${index}`,
    type: 'active_buzzer',
  }));
  f.runtime.audio = Object.fromEntries(
    f.project.nodes.map((node) => [
      node.id,
      { ...f.runtime.audio.buzzer, node: node.id, volume: 1 },
    ]),
  );
  await engine.enable();
  engine.sync({ ...f, running: true });
  const context = AudioContext.instances[0];
  assert.equal(engine.status().voices, 16);
  assert.equal(engine.status().skippedVoices, 14);
  const curve = context.nodes.find((node) => node.kind === 'limiter').curve;
  assert.ok(Math.max(...curve.map(Math.abs)) < 0.8);
  f.project.nodes = f.project.nodes.slice(0, 2);
  f.runtime.time = 0.01;
  context.currentTime = 0.01;
  engine.sync({ ...f, running: true });
  assert.equal(engine.status().voices, 2);
  assert.equal(engine.status().skippedVoices, 0);
  engine.dispose();
  const voiceContext = new AudioContext();
  const voice = createAudioVoice(voiceContext, voiceContext.destination, {
    type: 'passive_buzzer',
    value: 0,
  });
  for (let index = 0; index < 6000; index++) {
    voiceContext.currentTime = index / 1000;
    voice.prepare(voiceContext.currentTime);
    assert.equal(
      voice.schedule({ value: index % 2, volume: 0.15 }, voiceContext.currentTime + 0.1),
      true,
    );
    voice.armWatchdog(voiceContext.currentTime + 0.12);
  }
  const source = voiceContext.nodes.find((node) => node.kind === 'constant');
  assert.ok(source.offset.cancellations.includes(0));
  assert.ok(source.offset.events.length < 4096);
  assert.equal(source.offset.at(6.099), 1);
  voice.dispose();
  assert.equal(source.stopped, true);
});
