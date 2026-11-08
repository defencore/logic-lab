import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  replaySequence,
} from '../../src/experiments/actions.js';
import { createReviewView } from '../../src/classroom/review-view.js';
import { reviewObservationsMarkup } from '../../src/classroom/review-observations.js';
import { reviewPosition } from '../../src/classroom/review-position.js';
import { reviewItem, reviewState } from './fixtures/review.js';

function recordedActions(count) {
  const project = createExample('shift-register-sequence');
  const sequence = createSequence(project, {
    probes: [{ node: 'shift', port: 'out', side: 'outputs' }],
  });
  for (let index = 0; index < count; index++)
    appendAction(sequence, { at: index / 100, node: 'ser', key: 'value', value: index % 2 });
  finishSequence(sequence, count / 100 + 0.1);
  return { project, sequence };
}

test('100 recorded actions show the final duration observation as end of recording rather than action101', () => {
  const { project, sequence } = recordedActions(100);
  const { observations } = replaySequence(sequence);
  assert.equal(observations.length, 102);
  assert.equal(observations.at(-2).after, 99);
  assert.equal(observations.at(-1).after, 100);
  const submission = { project, sequence },
    result = { studentObservations: observations };
  const markup = (language) =>
    reviewObservationsMarkup(submission, result, language, { detail: { rowPage: 2 } });
  assert.match(markup('ua'), /data-review-observation="100"><td>100<\/td>/);
  assert.match(markup('ua'), /data-review-observation="101"><td>Кінець запису<\/td>/);
  assert.match(markup('en'), /data-review-observation="101"><td>End of recording<\/td>/);
  assert.doesNotMatch(markup('en'), /<td>101<\/td>/);
});

test('hidden-check mismatch labels use the reference action count even when the student recorded fewer actions', () => {
  const { project, sequence } = recordedActions(100),
    item = reviewItem(),
    state = reviewState(item);
  state.teacherKey = { referenceProject: project, sequence };
  item.submission.sequence.actions = [{}, {}];
  item.result.mismatches = [99, 100].map((after) => ({
    after,
    at: after / 100,
    probe: sequence.probes[0],
    expected: 0,
    actual: 1,
  }));
  const markup = createReviewView({ state, language: 'en' }).cardMarkup(0);
  assert.match(markup, /after action 100/);
  assert.match(markup, /End of recording/);
  assert.doesNotMatch(markup, /after action 101/);
  assert.match(createReviewView({ state, language: 'ua' }).cardMarkup(0), /Кінець запису/);
});

test('a timed recording with no actions still distinguishes its initial and final observations', () => {
  const { project, sequence } = recordedActions(0),
    { observations } = replaySequence(sequence);
  assert.deepEqual(
    observations.map(({ after }) => after),
    [-1, 0],
  );
  const markup = reviewObservationsMarkup(
    { project, sequence },
    { studentObservations: observations },
    'en',
  );
  assert.match(markup, /Initial state/);
  assert.match(markup, /End of recording/);
  assert.doesNotMatch(markup, /<td>1<\/td>/);
  assert.equal(reviewPosition(99, 100, 'en'), 'after action 100');
  assert.equal(reviewPosition(100, 100, 'en'), 'End of recording');
  assert.equal(reviewPosition(-1, 0, 'en'), 'Initial state');
});
