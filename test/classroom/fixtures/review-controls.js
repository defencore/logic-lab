import assert from 'node:assert/strict';
import { bindReviewControls } from '../../../src/classroom/review-controller.js';
import { createReviewView } from '../../../src/classroom/review-view.js';

export function reviewControls(state, overrides = {}) {
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
