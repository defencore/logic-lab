import test from 'node:test';
import assert from 'node:assert/strict';
import { bindReviewControls } from '../../src/classroom/review-controller.js';
import { createReviewView } from '../../src/classroom/review-view.js';
import { createTeacherController } from '../../src/classroom/teacher-controller.js';
import { reviewDetail } from '../../src/classroom/review-detail-state.js';
import { reviewItem, reviewState, reviewTarget, similarityState } from './fixtures/review.js';

function controls(state, overrides = {}) {
  const prior = globalThis.document;
  const rendered = new Map(),
    listeners = new Map(),
    cards = { innerHTML: '' },
    similarities = { innerHTML: '' },
    focused = [],
    opened = [];
  let guarded = 0;
  const root = {
    querySelector(selector) {
      if (selector === '#review-cards') return cards;
      if (selector === '#review-similarities') return similarities;
      const index = Number(selector.match(/data-review-card="(\d+)"/)?.[1]);
      if (Number.isInteger(index))
        return {
          set outerHTML(value) {
            rendered.set(index, value);
          },
        };
      if (selector.includes('data-review-page-input='))
        return { focus: (options) => focused.push({ selector, options }) };
      return null;
    },
    addEventListener(type, handler, capture) {
      assert.equal(capture, true);
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
  };
  globalThis.document = {
    querySelector: (selector) => (selector === '#review-results' ? root : null),
  };
  const options = {
    adapter: {
      getLanguage: () => 'en',
      openReviewedWork: async (submission, options) => opened.push({ submission, options }),
      ...overrides,
    },
    state,
    protect: (action) => action,
    guardEditableSession: () => guarded++,
    views: () => ({
      reviewCardsMarkup: () => createReviewView({ state, language: 'en' }).cardsMarkup(),
    }),
  };
  bindReviewControls(options);
  return {
    root,
    options,
    rendered,
    cards,
    similarities,
    focused,
    opened,
    listeners,
    get guarded() {
      return guarded;
    },
    restore: () => (globalThis.document = prior),
  };
}

test('delegated page clicks, direct jumps and Enter reach the final row and signal of the original filtered card', async () => {
  const alpha = reviewItem({ id: 'alpha' }),
    beta = reviewItem({ id: 'beta', rows: 2002, signals: 32, mismatches: 45 }),
    state = reviewState(alpha, beta),
    f = controls(state);
  try {
    f.root.oninput({ target: reviewTarget({}, { id: 'review-query', value: 'beta' }) });
    assert.match(f.cards.innerHTML, /data-review-card="1"/);
    assert.doesNotMatch(f.cards.innerHTML, /data-review-card="0"/);
    await f.root.onclick({
      target: reviewTarget({ reviewPage: 'mismatches', reviewIndex: '1', reviewTarget: '2' }),
    });
    assert.match(f.rendered.get(1), /difference-45\./);
    assert.equal(f.rendered.has(0), false);
    assert.equal(reviewDetail(state, alpha.submission, 0).mismatchPage, 0);
    assert.equal(f.guarded, 0);
    f.root.onchange({
      target: reviewTarget({ reviewPageInput: 'signals', reviewIndex: '1' }, { value: '4' }),
    });
    let prevented = false;
    f.root.onkeydown({
      key: 'Enter',
      target: reviewTarget({ reviewPageInput: 'rows', reviewIndex: '1' }, { value: '51' }),
      preventDefault: () => (prevented = true),
    });
    assert.equal(prevented, true);
    assert.match(f.rendered.get(1), /Rows 2001–2002 of 2002/);
    assert.match(f.rendered.get(1), /row-2001-signal-31/);
    assert.match(f.focused.at(-1).selector, /data-review-index="1"/);
    assert.deepEqual(f.focused.at(-1).options, { preventScroll: true });
    await f.root.onclick({ target: reviewTarget({ reviewReplay: '1' }) });
    assert.equal(f.opened[0].submission, beta.submission);
    assert.deepEqual(f.opened[0].options, { replay: true });
    assert.equal(f.guarded, 1);
  } finally {
    f.restore();
  }
});

test('expanded sections and page choices survive filters and progress rerenders with one delegated toggle listener', async () => {
  const item = reviewItem({ rows: 90 }),
    state = reviewState(item),
    f = controls(state);
  try {
    bindReviewControls(f.options);
    assert.equal(f.listeners.get('toggle').size, 1);
    const toggle = [...f.listeners.get('toggle')][0];
    toggle({ target: { dataset: { reviewSection: 'evidence', reviewIndex: '0' }, open: true } });
    await f.root.onclick({
      target: reviewTarget({ reviewPage: 'rows', reviewIndex: '0', reviewTarget: '1' }),
    });
    const change = (value) =>
      f.root.oninput({ target: reviewTarget({}, { id: 'review-query', value }) });
    change('no matching student');
    assert.match(f.cards.innerHTML, /No submissions match/);
    state.busy = true;
    state.batch.push(reviewItem({ id: 'next-file' }));
    createReviewView({ state, language: 'en' }).reviewMarkup();
    change('work');
    assert.match(f.cards.innerHTML, /Rows 41–80 of 90/);
    assert.match(
      f.cards.innerHTML,
      /data-review-section="observations" data-review-index="0" open/,
    );
    assert.match(f.cards.innerHTML, /data-review-section="evidence" data-review-index="0" open/);
    const before = f.rendered.get(0);
    await f.root.onclick({
      target: reviewTarget(
        { reviewPage: 'rows', reviewIndex: '0', reviewTarget: '2' },
        { disabled: true },
      ),
    });
    assert.equal(f.rendered.get(0), before);
    f.root.onchange({
      target: reviewTarget({ reviewPageInput: 'rows', reviewIndex: '0' }, { value: '-50' }),
    });
    assert.equal(reviewDetail(state, item.submission, 0).rowPage, 0);
  } finally {
    f.restore();
  }
});

test('teacher protection keeps structured import errors intact for localized file guidance', async () => {
  const state = reviewState(reviewItem()),
    error = Object.assign(new Error('Wrong kind'), { code: 'file_wrong_kind' }),
    f = controls(state, {
      openReviewedWork: async () => {
        throw error;
      },
    });
  try {
    const controller = createTeacherController({
      ...f.options,
      safe: (action) => action,
      L: (ua, en) => en,
    });
    controller.bindReview();
    await assert.rejects(
      f.root.onclick({ target: reviewTarget({ reviewOpen: '0' }) }),
      (received) => received === error && received.code === 'file_wrong_kind',
    );
  } finally {
    f.restore();
  }
});

test('global similarity controls expose pairs after100 without resetting card filters or per-card pages', async () => {
  const state = similarityState(),
    f = controls(state);
  try {
    await f.root.onclick({
      target: reviewTarget({ reviewPage: 'pairs', reviewIndex: '-1', reviewTarget: '5' }),
    });
    assert.equal(state.reviewPairPage, 5);
    assert.match(f.similarities.innerHTML, /Pairs 101–120 of 120/);
    assert.match(f.similarities.innerHTML, /Learner 14 \(s14\) ↔ Learner 15 \(s15\)/);
    assert.equal(f.rendered.size, 0);
    assert.equal(f.guarded, 0);
    const pairMarkup = f.similarities.innerHTML;
    f.root.oninput({ target: reviewTarget({}, { id: 'review-query', value: 'Learner 15' }) });
    assert.match(f.cards.innerHTML, /data-review-card="15"/);
    assert.equal(f.similarities.innerHTML, pairMarkup);
    assert.equal(state.reviewPairPage, 5);
    f.root.onchange({
      target: reviewTarget({ reviewPageInput: 'pairs', reviewIndex: '-1' }, { value: '2' }),
    });
    assert.match(f.similarities.innerHTML, /Pairs 21–40 of 120/);
    assert.equal(state.reviewQuery, 'Learner 15');
    assert.match(f.cards.innerHTML, /data-review-card="15"/);
  } finally {
    f.restore();
  }
});
