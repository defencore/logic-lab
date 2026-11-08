import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialServoState,
  advanceServo,
  servoParameterError,
} from '../../src/simulation/servo.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { advanceRuntime } from '../../src/simulation/advance.js';
import { getDefinition } from '../../src/components/catalog/index.js';
import { validateProject } from '../../src/circuits/project.js';

const parameters = {
  minPulse: 1000,
  centerPulse: 1500,
  maxPulse: 2000,
  range: 180,
  signalTimeout: 0.1,
};
const near = (value, expected) =>
  assert.ok(Math.abs(value - expected) < 1e-6, `${value} ≈ ${expected}`);
function pulse(width, start = 0.01, state = initialServoState(), config = parameters) {
  state = advanceServo(state, { s1: 0 }, config, start - 0.001);
  state = advanceServo(state, { s1: 1 }, config, start);
  return advanceServo(state, { s1: 0 }, config, start + width / 1_000_000);
}
function project(frequency, duty) {
  return {
    version: 1,
    name: 'RC pulse test',
    nodes: [
      { id: 'pwm', type: 'pwm', x: 0, y: 0, params: { frequency, duty } },
      { id: 'servo', type: 'servo', x: 200, y: 0, params: {} },
    ],
    wires: [
      { id: 'control', from: { node: 'pwm', port: 'out' }, to: { node: 'servo', port: 's1' } },
    ],
  };
}
function advance(p, runtime, duration) {
  const result = advanceRuntime(p, runtime, duration, { maxSteps: 5000 });
  assert.equal(result.reached, true);
}

test('RC servos require complete valid digital pulses rather than an initial guessed angle', () => {
  const state = initialServoState();
  assert.deepEqual(state.angles, ['X', 'X', 'X', 'X']);
  for (const [width, angle] of [
    [1000, -90],
    [1250, -45],
    [1500, 0],
    [1750, 45],
    [2000, 90],
  ]) {
    const result = pulse(width);
    near(result.angles[0], angle);
    assert.deepEqual(result.angles.slice(1), ['X', 'X', 'X']);
  }
});

test('1500 microsecond pulses center a servo at both 50 and 100 Hz', () => {
  for (const frequency of [50, 100]) {
    const p = project(frequency, (frequency * 1500) / 1_000_000);
    const runtime = createRuntime();
    simulate(p, runtime, 0);
    assert.equal(runtime.signals.outputs.servo.a1, 'X');
    advance(p, runtime, 0.08);
    near(runtime.signals.outputs.servo.a1, 0);
    assert.equal(runtime.signals.outputs.servo.a2, 'X');
  }
});

test('a frequency change preserves angle only when actual high pulse width is preserved', () => {
  const p = project(50, 0.0625);
  const runtime = createRuntime();
  simulate(p, runtime, 0);
  advance(p, runtime, 0.06);
  near(runtime.signals.outputs.servo.a1, -45);
  p.nodes[0].params.frequency = 100;
  p.nodes[0].params.duty = 0.125;
  simulate(p, runtime, 0);
  advance(p, runtime, 0.06);
  near(runtime.signals.outputs.servo.a1, -45);
});

test('unknown, disconnected and invalid pulse commands never claim a valid center', () => {
  for (const value of ['X', 'Z', undefined, 0.5]) {
    const result = advanceServo(pulse(1500), { s1: value }, parameters, 0.02);
    assert.equal(result.angles[0], 'X');
    near(pulse(1750, 0.03, result).angles[0], 45);
  }
  for (const width of [500, 2500]) assert.equal(pulse(width).angles[0], 'X');
  for (const level of [0, 1]) {
    const state = advanceServo(initialServoState(), { s1: level }, parameters, 0);
    assert.equal(advanceServo(state, { s1: level }, parameters, 1).angles[0], 'X');
  }
});

test('a stale last pulse expires, a stuck-high line fails, and a later valid pulse recovers', () => {
  const valid = pulse(1500);
  near(advanceServo(valid, { s1: 0 }, parameters, 0.05).angles[0], 0);
  const expired = advanceServo(valid, { s1: 0 }, parameters, 0.2);
  assert.equal(expired.angles[0], 'X');
  near(pulse(1000, 0.3, expired).angles[0], -90);
  const rising = advanceServo(valid, { s1: 1 }, parameters, 0.03);
  assert.equal(advanceServo(rising, { s1: 1 }, parameters, 0.04).angles[0], 'X');
});

test('servo calibration and pulse loss settings are validated instead of silently reordered', () => {
  assert.equal(servoParameterError(parameters), null);
  for (const changes of [
    { minPulse: 1500 },
    { centerPulse: 2100 },
    { maxPulse: 500 },
    { range: 0 },
    { signalTimeout: 0.001 },
  ]) {
    const config = { ...parameters, ...changes };
    assert.ok(servoParameterError(config));
    assert.deepEqual(advanceServo(initialServoState(), { s1: 0 }, config, 0).angles, [
      'X',
      'X',
      'X',
      'X',
    ]);
  }
});

test('servo digital contacts reject the analog DUTY shortcut', () => {
  assert.ok(getDefinition('servo').inputs.every((pin) => !pin.analog && !pin.acceptAny));
  const p = project(50, 0.075);
  p.wires[0].from.port = 'duty';
  assert.throws(() => validateProject(p), /analog|digital|incompatible/i);
});
