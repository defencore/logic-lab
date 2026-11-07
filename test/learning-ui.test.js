import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../examples/index.js';
import {
  filterExamples,
  guideMarkup,
  exampleCards,
  exampleCatalogShell,
} from '../src/learning-ui.js';
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

test('laboratory topics are visible counted buttons and preserve initial search and difficulty', () => {
  for (const language of ['en', 'ua']) {
    const html = exampleCatalogShell(language, {
      query: 'printer',
      category: 'motion',
      level: 'intermediate',
    });
    const topics = [
      ...html.matchAll(/<button\b[^>]*data-topic="([^"]+)"[^>]*>[\s\S]*?<\/button>/g),
    ];
    assert.equal(topics.length, 7);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    assert.ok(topics.find((match) => match[1] === 'motion')[0].includes('aria-pressed="true"'));
    for (const topic of topics) {
      const count =
        topic[1] === 'all'
          ? EXAMPLES.length
          : EXAMPLES.filter((example) => example.category === topic[1]).length;
      assert.ok(topic[0].includes(`class="catalog-topic-count">${count}</span>`));
    }
    assert.ok(html.includes('id="example-search"'));
    assert.ok(html.includes('value="printer"'));
    assert.match(html, /<option value="intermediate" selected>/);
    assert.ok(!html.includes('id="example-category"'));
    assert.ok(html.includes('id="empty-project"'));
    assert.ok(html.includes(TEXT[language].laboratoryCatalog));
  }
});

test('laboratory cards separate opening, worksheet and JSON actions with visible metadata', () => {
  for (const language of ['en', 'ua']) {
    const html = exampleCards(EXAMPLES, language);
    assert.equal((html.match(/<article\b/g) || []).length, EXAMPLES.length);
    assert.equal((html.match(/data-example=/g) || []).length, EXAMPLES.length);
    assert.equal((html.match(/data-lab-guide=/g) || []).length, EXAMPLES.length);
    assert.equal(
      (html.match(/class="catalog-card-title example-title"/g) || []).length,
      EXAMPLES.length,
    );
    const interactive = [];
    for (const match of html.matchAll(/<(\/?)(button|a)\b[^>]*>/g)) {
      if (!match[1]) {
        assert.ok(
          !interactive.includes('button'),
          'Open and resource actions must be independent.',
        );
        interactive.push(match[2]);
      } else assert.equal(interactive.pop(), match[2]);
    }
    assert.equal(interactive.length, 0);
    for (const example of EXAMPLES) {
      assert.ok(html.includes(`href="${example.circuitPath}"`));
      assert.ok(html.includes(`download="${example.id}.logic.json"`));
      assert.ok(html.includes(`${example.lab.duration} ${TEXT[language].minutes}`));
      assert.ok(html.includes(`${example.create().nodes.length} ${TEXT[language].nodes}`));
    }
    assert.ok(html.includes(TEXT[language].openCircuit));
    assert.ok(html.includes(TEXT[language].viewWorksheet));
  }
});

test('catalog inputs escape HTML and empty results retain an actionable explanation', () => {
  const shell = exampleCatalogShell('en', { query: '"><script>unsafe()</script>' });
  assert.ok(shell.includes('&quot;&gt;&lt;script&gt;'));
  assert.ok(!shell.includes('<script>'));
  for (const language of ['en', 'ua']) {
    const html = exampleCards([], language);
    assert.ok(html.includes(TEXT[language].noCatalogResults));
    assert.ok(html.includes(TEXT[language].noResultsHint));
  }
});

test('navigation help distinguishes run shortcuts from temporary panning', () => {
  for (const language of ['en', 'ua']) {
    assert.ok(TEXT[language].guideKeysText.includes('R ·'));
    assert.ok(TEXT[language].guideKeysText.includes('Space / Shift'));
    assert.ok(TEXT[language].guideKeysText.includes('Ctrl/Cmd'));
    assert.ok(TEXT[language].navigationHint.includes('Shift'));
    assert.ok(TEXT[language].resetZoom.includes('100%'));
  }
});

test('logic gate and adder guides expose truth tables in both languages and preserve live hooks', () => {
  for (const language of ['en', 'ua']) {
    for (const type of [
      'and',
      'or',
      'not',
      'nand',
      'nor',
      'xor',
      'xnor',
      'half_adder',
      'full_adder',
    ]) {
      const html = guideMarkup(type, language, 'live-gate');
      assert.match(html, /class="truth-table"/);
      assert.match(html, /data-truth-node="live-gate"/);
      assert.match(html, /data-truth-inputs="0/);
      assert.match(html, /data-truth-status/);
    }
    assert.doesNotMatch(guideMarkup('stepper', language), /class="truth-table"/);
  }
});
