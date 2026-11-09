import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../../../examples/index.js';
import { getGuide } from '../../../src/learning/guides/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
} from '../../../src/experiments/actions.js';

test('74HC595 lab replays stale storage, latch, release, clear, and re-latch on a real bus monitor', () => {
  const lab = EXAMPLES.find(({ id }) => id === 'hc595-shift-latch');
  assert.ok(lab);
  const project = lab.create();
  const sequence = createSequence(project, { probes: lab.actionProbes });
  for (const action of lab.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, lab.actionPreset.at(-1).at + 0.1);
  const replay = replaySequence(sequence);
  const at = (time) => replay.observations.find((row) => row.at === time).values;
  assert.deepEqual(at(1.94), [0, 1], 'all eight shifts leave storage at its startup byte');
  assert.deepEqual(at(2.2), [165, 1]);
  assert.deepEqual(at(2.5), ['Z', 1], 'OE̅ releases only the parallel outputs');
  assert.deepEqual(at(2.7), ['Z', 0], 'MR̅ clears the shift register and QH′');
  assert.deepEqual(at(2.9), [165, 0], 'the storage register survives the shift clear');
  assert.deepEqual(at(3.2), [0, 0]);
  for (const language of ['en', 'ua'])
    assert.ok(getGuide('hc595', language).examples.includes(lab.id));
});
