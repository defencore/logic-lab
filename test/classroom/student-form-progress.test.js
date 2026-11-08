import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, student } from '../assessment/fixtures/lab-assessment.js';
import { createAttempt } from '../../src/assessment/index.js';
import { createStudentProgressController } from '../../src/classroom/student-progress-controller.js';

function element() {
  const classes = new Set(),
    attributes = new Map();
  return {
    textContent: '',
    disabled: false,
    hidden: false,
    dataset: {},
    classList: {
      toggle: (key, on) => (on ? classes.add(key) : classes.delete(key)),
      contains: (key) => classes.has(key),
    },
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
    getAttribute: (key) => attributes.get(key) ?? null,
  };
}

test('typing an explanation updates form stages and export readiness without replacing the focused textarea', () => {
  const f = fixture();
  const state = {
    ...f,
    student,
    attempt: createAttempt(f.assignment, student),
    notes: '',
    studentDirty: true,
  };
  const items = Array.from({ length: 5 }, (_, index) => {
    const item = element(),
      marker = element(),
      status = element();
    item.dataset.studentStep = String(index);
    item.querySelector = (selector) =>
      selector === '[data-student-step-marker]' ? marker : status;
    return item;
  });
  const form = { querySelectorAll: () => items };
  Object.defineProperty(form, 'innerHTML', {
    set() {
      throw new Error('The form must not be replaced');
    },
  });
  const textarea = { value: '', selectionStart: 0, selectionEnd: 0 };
  const reason = element(),
    submit = element(),
    stale = element(),
    record = element();
  const nodes = new Map([
    ['.student-panel', form],
    ['#student-notes', textarea],
    ['#student-next-message', reason],
    ['#student-export-reason', reason],
    ['#student-submit', submit],
    ['#student-stale', stale],
    ['#student-rerecord', record],
  ]);
  const previous = globalThis.document;
  globalThis.document = {
    querySelector: (selector) => nodes.get(selector) || null,
    activeElement: textarea,
  };
  try {
    const controller = createStudentProgressController({
      adapter: { getLanguage: () => 'ua' },
      state,
      session: { projectToSave: () => state.project },
      actions: {},
      controls: {},
      open() {},
      safe: (action) => action,
      persistDraft() {},
    });
    controller.update();
    assert.equal(submit.disabled, true);
    assert.equal(items[3].getAttribute('aria-current'), 'step');
    textarea.value = 'Мій прогноз підтверджено.';
    textarea.selectionStart = 7;
    textarea.selectionEnd = 7;
    state.notes = textarea.value;
    controller.update();
    assert.equal(globalThis.document.activeElement, textarea);
    assert.equal(textarea.selectionStart, 7);
    assert.equal(textarea.selectionEnd, 7);
    assert.equal(textarea.value, state.notes);
    assert.equal(items[3].classList.contains('is-complete'), true);
    assert.equal(items[3].querySelector('[data-student-step-marker]').textContent, '✓');
    assert.equal(items[3].getAttribute('aria-current'), null);
    assert.equal(items[4].getAttribute('aria-current'), 'step');
    assert.equal(submit.disabled, false);
    assert.match(reason.textContent, /Робота готова/);
    state.studentLastSaveKind = 'submission';
    state.studentDirty = false;
    controller.update();
    assert.equal(items[4].classList.contains('is-complete'), true);
    assert.equal(items[4].getAttribute('aria-current'), null);
  } finally {
    globalThis.document = previous;
  }
});

test('opening and cancelling the observed-signal picker preserves a saved work and its previous recording', () => {
  const f = fixture();
  const state = {
    ...f,
    student,
    attempt: createAttempt(f.assignment, student),
    notes: 'My completed explanation.',
    studentDirty: false,
    studentBuildReady: false,
    studentLastSaveKind: 'submission',
  };
  const previous = structuredClone(state);
  let pickerOpened = 0;
  let saves = 0;
  const controller = createStudentProgressController({
    adapter: { getLanguage: () => 'ua' },
    state,
    session: { projectToSave: () => state.project },
    actions: {},
    controls: { startRecording: () => pickerOpened++ },
    open() {},
    safe: (action) => action,
    persistDraft: () => saves++,
  });
  controller.record();
  assert.equal(pickerOpened, 1);
  assert.equal(saves, 0);
  assert.deepEqual(state, previous);
});
