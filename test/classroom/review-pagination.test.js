import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pageRange,
  reviewDetail,
  setReviewPage,
  setReviewSection,
} from '../../src/classroom/review-detail-state.js';
import { createReviewView } from '../../src/classroom/review-view.js';
import { reviewObservationsMarkup } from '../../src/classroom/review-observations.js';
import { reviewItem, reviewState } from './fixtures/review.js';

const view = (state, language = 'en') => createReviewView({ state, language });

test('review page ranges clamp bounds and handle empty tables without invalid pages', () => {
  assert.deepEqual(pageRange(0, 40, 50), {
    page: 0,
    pages: 1,
    start: 0,
    end: 0,
    first: 0,
    last: 0,
    total: 0,
  });
  assert.equal(pageRange(81, 40, -4).page, 0);
  assert.equal(pageRange(81, 40, NaN).page, 0);
  assert.equal(pageRange(81, 40, Infinity).page, 0);
  assert.equal(pageRange(81, 40, 1.8).page, 1);
  assert.equal(pageRange(81, 40, 9999).page, 2);
  assert.equal(pageRange(81, 40, 9999).last, 81);
  for (const [total, size] of [
    [-1, 40],
    [1.5, 40],
    [1, 0],
    [1, -1],
  ])
    assert.throws(() => pageRange(total, size), RangeError);
});

test('every mismatch remains reachable with ranges, numbering and localized page controls', () => {
  const item = reviewItem({ mismatches: 45 }),
    state = reviewState(item);
  let markup = view(state).cardMarkup(0);
  assert.match(markup, /Differences 1–20 of 45/);
  assert.match(markup, /difference-9\./);
  assert.match(markup, /difference-20\./);
  assert.doesNotMatch(markup, /difference-21\./);
  assert.match(markup, /data-review-direction="last"/);
  assert.match(markup, /data-review-target="2"/);
  setReviewPage(state, 0, 'mismatches', 1);
  markup = view(state).cardMarkup(0);
  assert.match(markup, /Differences 21–40 of 45/);
  assert.match(markup, /<li value="21">/);
  assert.match(markup, /difference-40\./);
  setReviewPage(state, 0, 'mismatches', 9999);
  markup = view(state, 'ua').cardMarkup(0);
  assert.match(markup, /Розбіжності 41–45 із 45/);
  assert.match(markup, /difference-45\./);
  assert.match(markup, /Остання/);
  assert.match(markup, /data-review-section="mismatches" data-review-index="0" open/);
  assert.doesNotMatch(markup, /full.*JSON|JSON.*full/i);
});

test('all 2002 recomputed rows and 32 signals are reachable in bounded pages including input sources', () => {
  const item = reviewItem({ rows: 2002, signals: 32 }),
    state = reviewState(item);
  const observations = () =>
    reviewObservationsMarkup(item.submission, item.result, 'en', {
      detail: reviewDetail(state, item.submission, 0),
      index: 0,
    });
  let markup = observations();
  assert.match(markup, /Rows 1–40 of 2002/);
  assert.match(markup, /Signals 1–8 of 32/);
  assert.match(markup, /row-0-signal-0/);
  assert.match(markup, /row-39-signal-7/);
  assert.doesNotMatch(markup, /row-40-signal|row-0-signal-8/);
  assert.equal((markup.match(/data-review-observation=/g) || []).length, 40);
  assert.equal((markup.match(/<td>/g) || []).length, 400);
  setReviewPage(state, 0, 'rows', 1);
  setReviewPage(state, 0, 'signals', 1);
  markup = observations();
  assert.match(markup, /Rows 41–80 of 2002/);
  assert.match(markup, /Signals 9–16 of 32/);
  assert.match(markup, /row-60-signal-8/);
  assert.match(markup, /9\. Source 9/);
  setReviewPage(state, 0, 'rows', 9999);
  setReviewPage(state, 0, 'signals', 9999);
  markup = observations();
  assert.match(markup, /Rows 2001–2002 of 2002/);
  assert.match(markup, /Signals 25–32 of 32/);
  assert.match(markup, /data-review-observation="2001"/);
  assert.match(markup, /row-2001-signal-31/);
  assert.match(markup, /32\. Source 32/);
  assert.doesNotMatch(markup, /untrusted-claim/);
  assert.equal((markup.match(/<td>/g) || []).length, 20);
});

test('filtering and progress keep each original submission index and independent expanded page state', () => {
  const alpha = reviewItem({ id: 'same-id', name: 'Alpha', rows: 100, mismatches: 45 }),
    beta = reviewItem({ id: 'same-id', name: 'Beta', rows: 100, mismatches: 45 }),
    state = reviewState(alpha, beta);
  setReviewPage(state, 1, 'rows', 2);
  setReviewPage(state, 1, 'mismatches', 1);
  setReviewSection(state, 1, 'evidence', true);
  state.reviewQuery = 'beta';
  let markup = view(state).cardsMarkup();
  assert.match(markup, /data-review-card="1"/);
  assert.match(markup, /data-review-open="1"/);
  assert.match(markup, /data-review-index="1"/);
  assert.doesNotMatch(markup, /data-review-card="0"/);
  assert.match(markup, /Rows 81–100 of 100/);
  assert.match(markup, /Differences 21–40 of 45/);
  assert.match(markup, /data-review-section="evidence" data-review-index="1" open/);
  state.reviewQuery = 'no student';
  assert.match(view(state).cardsMarkup(), /No submissions match/);
  state.batch.push(reviewItem({ id: 'gamma' }));
  state.busy = true;
  state.reviewQuery = '';
  markup = view(state).reviewMarkup();
  assert.match(markup, /Submissions shown: 3\/3/);
  assert.match(markup, /Rows 81–100 of 100/);
  assert.equal(reviewDetail(state, alpha.submission, 0).rowPage, 0);
  assert.equal(reviewDetail(state, beta.submission, 1).rowPage, 2);
  setReviewSection(state, 1, 'observations', false);
  assert.doesNotMatch(
    view(state).cardMarkup(1),
    /data-review-section="observations" data-review-index="1" open/,
  );
});

test('empty observations and invalid card or page identifiers remain safe and localized', () => {
  const item = reviewItem({ rows: 0, signals: 0 }),
    state = reviewState(item);
  assert.match(view(state, 'ua').cardMarkup(0), /0 рядків/);
  assert.match(view(state).cardMarkup(0), /0 rows/);
  assert.equal(setReviewPage(state, -1, 'rows', 1), false);
  assert.equal(setReviewPage(state, 8, 'rows', 1), false);
  assert.equal(setReviewPage(state, 0, 'constructor', 1), false);
  assert.equal(setReviewSection(state, 0, 'constructor', true), false);
  setReviewPage(state, 0, 'rows', 9999);
  assert.equal(reviewDetail(state, item.submission, 0).rowPage, 0);
  item.result.studentObservations = [{ at: 0, after: -1, values: [] }];
  assert.match(view(state, 'ua').cardMarkup(0), /Сигнали 0–0 із 0/);
  assert.doesNotMatch(view(state).cardMarkup(0), /NaN|Infinity|undefined/);
});
