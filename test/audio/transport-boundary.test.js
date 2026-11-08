import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine } from '../../src/audio/engine.js';
import { fakeAudioContext, audioFixture, append } from './fixture.js';

function pulseTimes(context) {
  const oscillator = context.nodes.find((node) => node.kind === 'oscillator');
  const events = oscillator.outputs[0].gain.events;
  const high = events.find((event) => event.value === 0.15);
  const low = events.find((event) => event.value === 0 && event.at > high.at);
  return { oscillator, high: high.at, low: low.at };
}

test('a pre-advance anchor preserves a 1ms pulse while context resume is pending, including completion before resume', async () => {
  for (const completed of [false, true]) {
    const AudioContext = fakeAudioContext(),
      engine = createAudioEngine({ AudioContext });
    const f = audioFixture('active_buzzer', 0);
    await engine.enable();
    const context = AudioContext.instances[0];
    engine.sync({ ...f, running: false });
    let resume;
    context.resume = () =>
      new Promise((resolve) => {
        resume = () => {
          context.state = 'running';
          resolve();
        };
      });
    engine.sync({ ...f, running: true });
    append(f, 0.001, 1);
    append(f, 0.002, 0);
    f.runtime.time = completed ? 0.002 : 0.016;
    engine.sync({ ...f, running: !completed, completed });
    assert.equal(engine.status().voices, 0);
    resume();
    await Promise.resolve();
    engine.sync({ ...f, running: !completed, completed });
    const times = pulseTimes(context);
    assert.ok(Math.abs(times.high - 0.101) < 1e-12);
    assert.ok(Math.abs(times.low - 0.102) < 1e-12);
    assert.ok(Math.abs(times.low - times.high - 0.001) < 1e-12);
    assert.equal(engine.status().scheduledEvents, 2);
    assert.equal(engine.status().lastSerial, 3);
    assert.equal(engine.status().draining, completed);
    engine.dispose();
  }
});

test('an already running context anchors before advancement and keeps the first-frame pulse width exact', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture('active_buzzer', 0);
  await engine.enable();
  engine.sync({ ...f, running: true });
  append(f, 0.001, 1);
  append(f, 0.002, 0);
  f.runtime.time = 0.016;
  const context = AudioContext.instances[0];
  context.currentTime = 0.016;
  engine.sync({ ...f, running: true });
  const times = pulseTimes(context);
  assert.ok(Math.abs(times.low - times.high - 0.001) < 1e-12);
  assert.equal(engine.status().scheduledEvents, 2);
  engine.dispose();
});

test('natural completion drains the final 100ms audio tail once, then suspends without restarting old events', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture('active_buzzer', 0);
  await engine.enable();
  engine.sync({ ...f, running: true });
  append(f, 0.95, 1);
  append(f, 0.99, 0);
  f.runtime.time = 1;
  const context = AudioContext.instances[0];
  context.currentTime = 1;
  engine.sync({ ...f, running: false, completed: true });
  const { oscillator, high, low } = pulseTimes(context);
  assert.ok(Math.abs(high - 1.05) < 1e-12);
  assert.ok(Math.abs(low - 1.09) < 1e-12);
  assert.equal(oscillator.stopped, false);
  assert.equal(oscillator.outputs[0].gain.at(1.06), 0.15);
  assert.equal(oscillator.outputs[0].gain.at(1.095), 0);
  assert.equal(engine.status().draining, true);
  context.currentTime = 1.04;
  engine.sync({ ...f, running: false, completed: true });
  assert.equal(engine.status().scheduledEvents, 2);
  assert.equal(oscillator.stopped, false);
  context.currentTime = 1.106;
  engine.sync({ ...f, running: false, completed: true });
  assert.equal(oscillator.stopped, true);
  assert.equal(context.state, 'suspended');
  assert.equal(engine.status().voices, 0);
  assert.equal(engine.status().draining, false);
  engine.sync({ ...f, running: false, completed: true });
  assert.equal(context.nodes.filter((node) => node.kind === 'oscillator').length, 1);
  assert.equal(engine.status().scheduledEvents, 2);
  engine.dispose();
});

test('explicit pause stops immediately and enabling sound after completion never plays old history', async () => {
  const AudioContext = fakeAudioContext(),
    engine = createAudioEngine({ AudioContext });
  const f = audioFixture('active_buzzer', 0);
  await engine.enable();
  engine.sync({ ...f, running: true });
  append(f, 0.001, 1);
  append(f, 0.002, 0);
  f.runtime.time = 0.016;
  engine.sync({ ...f, running: true });
  const context = AudioContext.instances[0],
    oscillator = context.nodes.find((node) => node.kind === 'oscillator');
  engine.sync({ ...f, running: false, completed: false });
  assert.equal(oscillator.stopped, true);
  assert.equal(context.state, 'suspended');
  engine.disable();
  await engine.enable();
  engine.sync({ ...f, running: false, completed: true });
  assert.equal(context.nodes.filter((node) => node.kind === 'oscillator').length, 1);
  assert.equal(engine.status().voices, 0);
  assert.equal(engine.status().draining, false);
  engine.dispose();
});

test('trusted enable stays enabled when a paused frame interleaves with asynchronous context resume', async () => {
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
  const f = audioFixture('active_buzzer', 0);
  const enabling = engine.enable();
  engine.sync({ ...f, running: false });
  resume();
  assert.equal(await enabling, true);
  assert.equal(engine.status().enabled, true);
  assert.equal(engine.status().contextState, 'suspended');
  assert.equal(engine.status().voices, 0);
  assert.equal(engine.status().error, null);
  engine.sync({ ...f, running: false });
  assert.equal(engine.status().contextState, 'suspended');
  engine.sync({ ...f, running: true });
  append(f, 0.001, 1);
  append(f, 0.002, 0);
  f.runtime.time = 0.016;
  resume();
  await Promise.resolve();
  engine.sync({ ...f, running: true });
  const times = pulseTimes(AudioContext.instances[0]);
  assert.ok(Math.abs(times.low - times.high - 0.001) < 1e-12);
  assert.equal(engine.status().scheduledEvents, 2);
  engine.dispose();
});
