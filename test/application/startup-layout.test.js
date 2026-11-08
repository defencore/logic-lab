import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationModel } from '../../src/application/model.js';
import { shellMarkup } from '../../src/workbench/shell-view.js';
import { TEXT } from '../../src/locales/index.js';

test('a fresh workspace reserves its initial space for the circuit while keeping the lesson and waveform toggle available', (t) => {
  for (const [name, value] of Object.entries({
    localStorage: { getItem: () => null },
    navigator: { language: 'uk-UA' },
    window: { matchMedia: () => ({ matches: false }) },
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() =>
      descriptor
        ? Object.defineProperty(globalThis, name, descriptor)
        : Reflect.deleteProperty(globalThis, name),
    );
  }
  const model = createApplicationModel();
  assert.equal(model.monitorOpen, false);
  assert.equal(model.lessonOpen, true);
  assert.equal(model.workspaceView, 'canvas');
  const html = shellMarkup({
    ...model,
    t: (key) => TEXT.ua[key] || key,
    lang: 'ua',
    formatRate: String,
    formatWindow: String,
  });
  assert.match(html, /id="monitor" class="monitor collapsed"/);
  assert.match(html, /id="monitor-toggle"/);
  assert.match(html, /id="lesson-toggle"/);
});
