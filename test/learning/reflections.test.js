import test from 'node:test';
import assert from 'node:assert/strict';
import { createLessonReflections } from '../../src/learning/reflections.js';

test('lesson predictions and observations restore separately for each step', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const notes = createLessonReflections(storage);
  notes.save('adder:0', { prediction: '1', observation: 'OUT sum=1' });
  notes.save('adder:1', { explanation: 'Both inputs were high.' });
  const restored = createLessonReflections(storage);
  assert.equal(restored.get('adder:0').observation, 'OUT sum=1');
  assert.equal(restored.get('adder:1').prediction, '');
  assert.equal(restored.get('adder:1').explanation, 'Both inputs were high.');
});

test('lesson notes report failed storage and tolerate malformed saved notes', () => {
  const notes = createLessonReflections({
    getItem: () => '{',
    setItem: () => {
      throw Error('Full');
    },
  });
  assert.equal(notes.save('a:0', { prediction: 'Keep this' }), false);
  assert.equal(notes.get('a:0').prediction, 'Keep this');
  assert.equal(createLessonReflections(null).save('a:0', {}), false);
});
