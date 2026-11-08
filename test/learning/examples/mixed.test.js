import { open, value, advance, output, input } from './fixtures/examples.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('converter lesson round-trips every byte and reveals a supply mismatch', () => {
  const context = open('adc-dac');
  for (let byte = 0; byte < 256; byte++) {
    value(context, 'value', byte);
    assert.equal(output(context, 'adc'), byte);
    assert.equal(input(context, 'equal'), 1);
  }
  value(context, 'value', 128);
  assert.ok(Math.abs(output(context, 'dac') - (128 / 255) * 5) < 1e-10);
  value(context, 'adc', 2.5, 'vcc');
  assert.equal(output(context, 'adc'), 255);
  assert.equal(input(context, 'equal'), 0);
  assert.equal(input(context, 'less'), 1);
});

test('AM/FM lesson advances its ramp and produces different bounded traces', () => {
  const context = open('mixed-signals');
  advance(context, 0.5);
  assert.equal(output(context, 'counter'), 132);
  assert.equal(output(context, 'dac'), (132 / 255) * 5);
  const am = context.runtime.history['mod-scope'],
    fm = context.runtime.history['fm-scope'];
  assert.ok(am.length > 100 && fm.length > 100);
  assert.ok(am.every((value) => value >= 0 && value <= 5));
  assert.ok(fm.every((value) => value >= 0 && value <= 5));
  assert.notDeepEqual(am, fm);
  assert.ok(Math.max(...am) - Math.min(...am) > 1);
  assert.ok(Math.max(...fm) - Math.min(...fm) > 1);
  value(context, 'enable', 0);
  advance(context, 0.5);
  assert.equal(output(context, 'counter'), 132);
  value(context, 'am', 0, 'depth');
  value(context, 'fm', 0, 'depth');
  assert.deepEqual(context.runtime.diagnostics, []);
});

test('PWM lesson centers and reaches endpoints independently of frequency', () => {
  const context = open('pwm-servos');
  assert.ok(Math.abs(output(context, 'servos', 'a1') + 45) < 1e-8);
  assert.ok(Math.abs(output(context, 'servos', 'a2') - 45) < 1e-8);
  value(context, 'course', 0.5, 'duty');
  assert.ok(Math.abs(output(context, 'servos', 'a1')) < 1e-8);
  value(context, 'course', 0.18, 'duty');
  assert.ok(Math.abs(output(context, 'servos', 'a1') + 90) < 1e-8);
  value(context, 'course', 0.82, 'duty');
  assert.ok(Math.abs(output(context, 'servos', 'a1') - 90) < 1e-8);
  value(context, 'course', 77, 'frequency');
  assert.ok(Math.abs(output(context, 'servos', 'a1') - 90) < 1e-8);
  assert.ok(Math.abs(output(context, 'servos', 'a2') - 45) < 1e-8);
});
