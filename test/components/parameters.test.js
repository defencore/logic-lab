import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryBytes, parameterField } from '../../src/workbench/component-parameters.js';

test('memory data uses one comma-separated byte format for saved arrays and text editing', () => {
  assert.equal(memoryBytes([0, 63, 165, 255]), '0, 63, 165, 255');
  assert.equal(memoryBytes('0, 0x3f\n165,255'), '0, 63, 165, 255');
  assert.equal(memoryBytes(''), '');
  for (const value of ['-1', '256', '1.5', 'NaN', '1,wrong', Array(4097).fill(0)])
    assert.throws(() => memoryBytes(value), /integer bytes/);
  const markup = parameterField('data', [63, 6, 91], 'rom', 'en', (key) => key);
  assert.match(markup, /data-memory-bytes="true"/);
  assert.match(markup, />63, 6, 91<\/textarea>/);
  assert.doesNotMatch(markup, /data-array/);
});

test('input editors show the supported numeric byte and switch ranges before simulation', () => {
  assert.match(
    parameterField('value', 0, 'bus_input', 'en', (key) => key),
    /step="1" min="0" max="255" data-integer="true"/,
  );
  assert.match(
    parameterField('value', 0, 'switch', 'en', (key) => key),
    /step="1" min="0" max="1" data-integer="true"/,
  );
});

test('continuous amplitude editors accept fractions independently of the saved value', () => {
  for (const type of ['am', 'fm']) {
    for (const value of [5, 3.3]) {
      const markup = parameterField('amplitude', value, type, 'en', (key) => key);
      assert.match(markup, /step="0.1"/);
      assert.doesNotMatch(markup, /data-integer/);
    }
  }
  assert.match(
    parameterField('initial', 0, 'stepper', 'en', (key) => key),
    /step="any"/,
  );
  assert.match(
    parameterField('initial', 0, 'register', 'en', (key) => key),
    /data-integer="true"/,
  );
});
