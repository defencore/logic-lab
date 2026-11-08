import test from 'node:test';
import assert from 'node:assert/strict';
import { audioNodeReading, noteName } from '../../src/workbench/audio-node.js';
import { parameterRule } from '../../src/components/parameter-rules.js';

test('buzzer readout distinguishes a recent timed waveform from a stale held level', () => {
  const node = { id: 'b', type: 'passive_buzzer' };
  const runtime = {
    time: 1,
    audio: {
      b: { value: 1, volume: 0.15, measuredFrequency: 440, period: 1 / 440, lastEdgeAt: 1 },
    },
  };
  const tone = audioNodeReading(node, runtime, 'ua');
  assert.equal(tone.sounding, true);
  assert.match(tone.reading, /440 Hz · A4/);
  assert.match(tone.detail, /2\.273 ms/);
  runtime.time = 2;
  assert.equal(audioNodeReading(node, runtime, 'ua').sounding, false);
  assert.match(audioNodeReading(node, runtime, 'ua').detail, /Потрібні переходи/);
  runtime.audio.b.value = null;
  assert.match(audioNodeReading(node, runtime, 'en').reading, /No valid signal/);
  node.enabled = false;
  assert.equal(audioNodeReading(node, runtime, 'ua').reading, 'Вимкнено');
});

test('active tone uses configured frequency only while high and UI volume/frequency limits match audio contracts', () => {
  const node = { id: 'b', type: 'active_buzzer' };
  const runtime = { time: 0, audio: { b: { value: 1, volume: 0.15, frequency: 880 } } };
  assert.match(audioNodeReading(node, runtime, 'en').reading, /880 Hz · A5/);
  runtime.audio.b.value = 0;
  assert.equal(audioNodeReading(node, runtime, 'en').reading, 'Silent');
  assert.equal(noteName(261.625565), 'C4');
  assert.equal(noteName(NaN), '');
  assert.deepEqual(parameterRule('active_buzzer', 'frequency'), {
    min: 20,
    max: 20000,
    step: 1,
    integer: false,
  });
  assert.deepEqual(parameterRule('passive_buzzer', 'volume'), {
    min: 0,
    max: 1,
    step: 0.01,
    integer: false,
  });
});
