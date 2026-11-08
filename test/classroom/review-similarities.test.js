import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewView } from '../../src/classroom/review-view.js';
import {
  meaningfulReviewPairs,
  setReviewPairPage,
} from '../../src/classroom/review-similarities.js';
import { similarityState } from './fixtures/review.js';

test('all meaningful pairs including the last pair after100 are available in bounded localized pages', () => {
  const state = similarityState();
  const view = (language = 'en') => createReviewView({ state, language });
  let markup = view().similaritiesMarkup();
  assert.match(markup, /Pairs 1–20 of 120/);
  assert.equal((markup.match(/data-review-pair="/g) || []).length, 20);
  assert.match(markup, /data-review-pair="1"/);
  assert.doesNotMatch(markup, /data-review-pair="0"/);
  assert.doesNotMatch(markup, /data-review-pair="21"/);
  setReviewPairPage(state, 9999);
  markup = view('ua').similaritiesMarkup();
  assert.equal(state.reviewPairPage, 5);
  assert.match(markup, /Пари 101–120 із 120/);
  assert.match(markup, /data-review-pair="120" data-review-pair-a="14" data-review-pair-b="15"/);
  assert.match(markup, /Learner 14 \(s14\) ↔ Learner 15 \(s15\)/);
  assert.doesNotMatch(markup, /first 100|перші 100|JSON|saved report|збереженому звіті/);
  const visited = new Set();
  for (let page = 0; page < 6; page++) {
    setReviewPairPage(state, page);
    for (const match of view()
      .similaritiesMarkup()
      .matchAll(/data-review-pair="(\d+)"/g))
      visited.add(Number(match[1]));
  }
  assert.deepEqual(
    [...visited],
    Array.from({ length: 120 }, (_, index) => index + 1),
  );
});

test('similarity filtering retains the existing meaningful criteria and original pair indices', () => {
  const pairs = [
    {},
    { resultsExact: true, reasons: ['results'] },
    { resultsExact: true, reasons: ['results', 'other'] },
    { reasons: ['other'] },
    { sharedAttempt: true },
    { sharedVariant: true },
    { topologyExact: true },
    { actionsExact: true },
    { suspected: true },
    { topologySimilarity: 1 },
  ];
  assert.deepEqual(
    meaningfulReviewPairs(pairs).map(({ index }) => index),
    [2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(meaningfulReviewPairs(pairs)[0].pair, pairs[2]);
});

test('global pair pages remain stable across card filters and progress while invalid and empty pages clamp safely', () => {
  const state = similarityState();
  setReviewPairPage(state, 4);
  state.reviewQuery = 'Learner 15';
  let view = createReviewView({ state, language: 'en' });
  assert.match(view.cardsMarkup(), /data-review-card="15"/);
  assert.match(view.similaritiesMarkup(), /Pairs 81–100 of 120/);
  state.busy = true;
  assert.match(
    createReviewView({ state, language: 'en' }).similaritiesMarkup(),
    /after every file/,
  );
  assert.equal(state.reviewPairPage, 4);
  state.busy = false;
  state.reviewQuery = '';
  view = createReviewView({ state, language: 'en' });
  assert.match(view.similaritiesMarkup(), /Pairs 81–100 of 120/);
  setReviewPairPage(state, -999);
  assert.equal(state.reviewPairPage, 0);
  setReviewPairPage(state, NaN);
  assert.equal(state.reviewPairPage, 0);
  state.pairs = [];
  setReviewPairPage(state, 50);
  assert.equal(state.reviewPairPage, 0);
  assert.match(createReviewView({ state, language: 'en' }).similaritiesMarkup(), /No significant/);
  state.reviewCancelled = true;
  assert.match(createReviewView({ state, language: 'en' }).similaritiesMarkup(), /not completed/);
});
