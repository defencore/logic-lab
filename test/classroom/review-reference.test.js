import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewView } from '../../src/classroom/review-view.js';
import { setReviewPage } from '../../src/classroom/review-detail-state.js';
import { referenceReviewPosition, reviewPosition } from '../../src/classroom/review-position.js';
import {
  referenceReviewReason,
  referenceCheckpointReason,
} from '../../src/classroom/review-reference.js';
import { reviewTarget } from './fixtures/review.js';
import { reviewControls } from './fixtures/review-controls.js';
import { referenceReviewFixture } from './fixtures/review-reference.js';

test('reference labels distinguish action98 from the two-action student recording and retain original paged indices', () => {
  const { state } = referenceReviewFixture();
  state.reviewQuery = 'Student';
  setReviewPage(state, 1, 'mismatches', 4);
  let markup = createReviewView({ state, language: 'ua' }).cardMarkup(1);
  assert.match(markup, /Після дії еталонної перевірки №98/);
  assert.match(markup, /data-review-check="1" data-review-mismatch="98"\s*>/);
  assert.match(markup, /Номери дій належать еталонній перевірці/);
  assert.match(markup, /Відтворити запис студента/);
  assert.match(markup, /Повторно обчислений дослід студента/);
  setReviewPage(state, 1, 'mismatches', 0);
  markup = createReviewView({ state, language: 'en' }).cardMarkup(1);
  assert.match(markup, /Instructor reference initial state/);
  assert.match(markup, /Replay student recording/);
  setReviewPage(state, 1, 'mismatches', 5);
  markup = createReviewView({ state, language: 'en' }).cardMarkup(1);
  assert.match(markup, /After instructor reference action #100/);
  assert.match(markup, /End of instructor reference check/);
  assert.doesNotMatch(markup, /reference action #101/);
  assert.match(markup, /data-review-check="1" data-review-mismatch="101"\s*>/);
});

test('a paged and filtered checkpoint button requests the actual reference initial, action or final checkpoint on the submitted circuit', async () => {
  const { state, key, item } = referenceReviewFixture(),
    f = reviewControls(state);
  try {
    f.root.oninput({ target: reviewTarget({}, { id: 'review-query', value: 'Student' }) });
    assert.match(f.cards.innerHTML, /data-review-card="1"/);
    assert.doesNotMatch(f.cards.innerHTML, /data-review-card="0"/);
    for (const mismatchIndex of [0, 1, 98, 101]) {
      await f.root.onclick({
        target: reviewTarget({ reviewCheck: '1', reviewMismatch: String(mismatchIndex) }),
      });
      const mismatch = item.result.mismatches[mismatchIndex];
      assert.equal(f.opened.at(-1).submission, item.submission);
      assert.deepEqual(f.opened.at(-1).options, {
        replay: true,
        referenceKey: key,
        checkpoint: { after: mismatch.after, at: mismatch.at },
      });
    }
    assert.equal(f.guarded, 4);
    await f.root.onclick({ target: reviewTarget({ reviewReplay: '1' }) });
    assert.deepEqual(f.opened.at(-1).options, { replay: true });
    assert.equal(f.opened.at(-1).options.referenceKey, undefined);
  } finally {
    f.restore();
  }
});

test('missing, mismatched and altered variants disable reference replay and never fall back to student recording', async () => {
  for (const alter of [
    (state) => {
      state.teacherKey = null;
    },
    (state) => {
      state.teacherKey.issued = [];
    },
    (_, item) => {
      item.submission.assignment.taskId = 'different-task';
    },
    (_, item) => {
      item.submission.assignment.variant.seed = 'altered-seed';
    },
    (_, item) => {
      item.submission.student.id = 'other-student';
    },
  ]) {
    const { state, item } = referenceReviewFixture();
    alter(state, item);
    const markup = createReviewView({ state, language: 'en' }).cardMarkup(1);
    assert.match(markup, /requires the matching instructor key/);
    assert.match(markup, /data-review-check="1" data-review-mismatch="0" disabled/);
    const f = reviewControls(state);
    try {
      await assert.rejects(
        f.root.onclick({ target: reviewTarget({ reviewCheck: '1', reviewMismatch: '0' }) }),
        /requires the matching instructor key/,
      );
      assert.equal(f.opened.length, 0);
    } finally {
      f.restore();
    }
  }
});

test('unavailable or malformed checkpoints cannot invoke replay, and locked buttons remain disabled', async () => {
  const { state, item } = referenceReviewFixture(),
    f = reviewControls(state);
  try {
    await assert.rejects(
      f.root.onclick({ target: reviewTarget({ reviewCheck: '1', reviewMismatch: '999' }) }),
      /no longer available/,
    );
    item.result.mismatches[0].at = 1;
    await assert.rejects(
      f.root.onclick({ target: reviewTarget({ reviewCheck: '1', reviewMismatch: '0' }) }),
      /checkpoint is unavailable/,
    );
    assert.equal(f.opened.length, 0);
    state.preview = { label: 'Already inspecting' };
    assert.match(
      createReviewView({ state, language: 'ua' }).cardMarkup(1),
      /data-review-mismatch="1" disabled/,
    );
    await f.root.onclick({
      target: reviewTarget({ reviewCheck: '1', reviewMismatch: '1' }, { disabled: true }),
    });
    assert.equal(f.opened.length, 0);
  } finally {
    f.restore();
  }
});

test('checkpoint validation and shared reference positions preserve exact initial and end semantics', () => {
  const { key, item } = referenceReviewFixture();
  assert.equal(referenceReviewReason(key, item.submission, 'en'), '');
  assert.equal(referenceCheckpointReason(key.sequence, { after: -1, at: 0 }, 'en'), '');
  assert.equal(referenceCheckpointReason(key.sequence, { after: 97, at: 0.97 }, 'en'), '');
  assert.equal(referenceCheckpointReason(key.sequence, { after: 100, at: 1.1 }, 'en'), '');
  for (const checkpoint of [
    { after: -2, at: 0 },
    { after: 101, at: 1.1 },
    { after: 97.5, at: 0.97 },
    { after: 97, at: 0.98 },
    { after: 100, at: NaN },
  ])
    assert.match(referenceCheckpointReason(key.sequence, checkpoint, 'ua'), /недоступна/);
  assert.equal(referenceReviewPosition(-1, 100, 'ua'), 'Початковий стан еталонної перевірки');
  assert.equal(referenceReviewPosition(97, 100, 'ua'), 'Після дії еталонної перевірки №98');
  assert.equal(referenceReviewPosition(100, 100, 'ua'), 'Кінець еталонної перевірки');
  assert.equal(reviewPosition(1, 2, 'ua'), 'після дії 2');
  assert.equal(reviewPosition(2, 2, 'ua'), 'Кінець запису');
});
