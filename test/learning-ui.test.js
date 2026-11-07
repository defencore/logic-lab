import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../src/examples.js';
import { filterExamples, guideMarkup } from '../src/learning-ui.js';
import { TEXT } from '../src/i18n.js';

test('example search combines bilingual component terms with topic and difficulty filters', () => {
  assert.ok(
    filterExamples(EXAMPLES, { query: 'XOR AND', category: 'basics', level: 'beginner' }).some(
      (e) => e.id === 'half-adder',
    ),
  );
  assert.ok(filterExamples(EXAMPLES, { query: 'напівсуматор' }).some((e) => e.id === 'half-adder'));
  assert.deepEqual(filterExamples(EXAMPLES, { query: 'memory', category: 'mixed' }), []);
  assert.equal(filterExamples(EXAMPLES, { query: 'no-component-has-this-name' }).length, 0);
  assert.equal(filterExamples(EXAMPLES, { query: '  ' }).length, EXAMPLES.length);
});

test('component instruction surfaces contain pin references and runnable lessons in both languages', () => {
  for (const language of ['en', 'ua']) {
    const markup = guideMarkup('and', language, 'example-node');
    assert.ok(markup.includes(TEXT[language].howToUse));
    assert.ok(markup.includes(TEXT[language].expectedResult));
    assert.ok(markup.includes('data-guide-port="a"'));
    assert.ok(markup.includes('data-guide-port="out"'));
    assert.ok(markup.includes('data-learn-example="logic-gates"'));
  }
  assert.equal(guideMarkup('unsupported', 'en'), '');
});
