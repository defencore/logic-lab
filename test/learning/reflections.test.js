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

test('a new experiment clears every current step and preserves previous notes in accessible history', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const notes = createLessonReflections(storage);
  notes.save('adder:0', { prediction: 'Sum=1', observation: 'OUT sum=1', explanation: 'XOR' });
  notes.save('adder:1', { prediction: 'Carry=1' });
  notes.save('ram:0', { prediction: 'Address 3' });
  assert.equal(notes.startNew('adder'), true);
  assert.equal(notes.get('adder:0').prediction, '');
  assert.equal(notes.get('adder:1').prediction, '');
  assert.equal(notes.get('ram:0').prediction, 'Address 3');
  const restored = createLessonReflections(storage);
  assert.equal(restored.history('adder').length, 1);
  assert.deepEqual(
    restored.history('adder')[0].steps.map((value) => value.prediction),
    ['Sum=1', 'Carry=1'],
  );
  notes.save('adder:0', { prediction: 'A fresh prediction' });
  assert.equal(notes.history('adder')[0].steps[0].explanation, 'XOR');
});

test('an appended learning observation survives portable work export and import as the student explanation', async () => {
  const { reflectionText } = await import('../../src/learning/reflections.js');
  const { createStudentWork, serializeStudentWork, parseStudentWork } = await import(
    '../../src/classroom/student-work-files.js'
  );
  const { createExample } = await import('../../examples/index.js');
  const explanation = reflectionText(
    { prediction: 'Sum=1', observation: 't=0.000 s\nOUT sum=1', explanation: 'Only A was high.' },
    { language: 'ua', title: 'Напівсуматор', step: 0 },
  );
  const work = await createStudentWork({
    student: { name: 'Student', id: 's1' },
    project: createExample('half-adder'),
    notes: explanation,
  });
  const restored = await parseStudentWork(serializeStudentWork(work));
  assert.equal(restored.notes, explanation);
  assert.match(restored.notes, /Прогноз: Sum=1/);
  assert.match(restored.notes, /OUT sum=1/);
  assert.match(restored.notes, /Only A was high/);
  assert.equal(restored.attempt, null);
});
