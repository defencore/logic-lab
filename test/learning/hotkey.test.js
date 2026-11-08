import test from 'node:test';
import assert from 'node:assert/strict';
import { getGuide } from '../../src/learning/guides/index.js';
import { guideMarkup } from '../../src/learning/views/guides.js';
import { truthTableMarkup, getTruthTable } from '../../src/learning/truth-tables.js';
import { renderLibraryItems } from '../../src/learning/views/catalog.js';

test('keyboard input is discoverable in both languages with its own complete beginner manual', () => {
  for (const [language, query] of [
    ['en', 'Keyboard input'],
    ['ua', 'Клавіша клавіатури'],
  ]) {
    const catalog = renderLibraryItems({ language, query, category: 'io' });
    assert.equal(catalog.count, 1);
    assert.match(catalog.html, /data-component="hotkey"/);
    const guide = getGuide('hotkey', language);
    const text = [
      guide.purpose,
      ...guide.steps,
      ...guide.pitfalls,
      guide.experiment,
      guide.expected,
    ].join(' ');
    for (const parameter of ['binding', 'mode', 'value']) assert.match(text, new RegExp(parameter));
    for (const mode of ['hold', 'inverted', 'toggle']) assert.match(text, new RegExp(mode));
    assert.deepEqual(Object.keys(guide.outputs), ['out']);
    assert.match(
      guideMarkup('hotkey', language),
      /Keyboard input state table|Таблиця станів клавіатурного входу/,
    );
  }
});

test('keyboard state tables distinguish holding, inversion and toggle memory without inventing input pins', () => {
  for (const language of ['en', 'ua']) {
    const markup = truthTableMarkup('hotkey', language, 'keyboard-node');
    assert.equal((markup.match(/<tr>/g) || []).length, 9);
    assert.match(markup, /<td>hold<\/td>[\s\S]*?<td>0<\/td>/);
    assert.match(markup, /<td>inverted<\/td>[\s\S]*?<td>1<\/td>/);
    assert.match(markup, /<td>toggle<\/td>[\s\S]*?<td>¬Q<\/td>/);
    assert.match(markup, /autorepeat|автоповтор/);
    assert.match(markup, /additional electrical input contacts|додаткові електричні входи/);
    assert.doesNotMatch(markup, /data-truth-node|data-truth-inputs/);
  }
  assert.equal(getTruthTable('hotkey'), null);
  assert.equal(truthTableMarkup('hotkey', 'uk'), truthTableMarkup('hotkey', 'ua'));
});
