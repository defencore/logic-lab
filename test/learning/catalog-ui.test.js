import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, CATEGORIES } from '../../src/components/catalog/index.js';
import { renderLibraryCategories, renderLibraryItems } from '../../src/learning/views/catalog.js';
import { TEXT } from '../../src/locales/index.js';
import { esc } from '../../src/shared/ui.js';

const types = (html) => [...html.matchAll(/data-component="([^"]+)"/g)].map((match) => match[1]);

function assertSeparateActions(html) {
  const open = [];
  for (const match of html.matchAll(/<(\/?)(button|a)\b[^>]*>/g)) {
    if (!match[1]) {
      assert.equal(
        open.includes('button'),
        false,
        'Interactive actions must not be nested inside buttons.',
      );
      open.push(match[2]);
    } else {
      assert.equal(open.pop(), match[2]);
    }
  }
  assert.equal(open.length, 0);
}

test('component categories remain visible with accurate counts and exactly one pressed filter', () => {
  for (const language of ['en', 'ua']) {
    const html = renderLibraryCategories('motion', language);
    const buttons = [
      ...html.matchAll(/<button\b[^>]*data-category="([^"]+)"[^>]*>[\s\S]*?<\/button>/g),
    ];
    assert.equal(buttons.length, CATEGORIES.length + 1);
    assert.deepEqual(
      buttons.map((match) => match[1]),
      ['all', ...CATEGORIES.map((category) => category.id)],
    );
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    assert.ok(buttons.find((match) => match[1] === 'motion')[0].includes('aria-pressed="true"'));
    assert.ok(html.includes(TEXT[language].browseCategories));
    for (const button of buttons) {
      const count =
        button[1] === 'all'
          ? COMPONENTS.length
          : COMPONENTS.filter((component) => component.category === button[1]).length;
      assert.ok(button[0].includes(`class="category-filter-count">${count}</span>`));
    }
  }
  assert.match(renderLibraryCategories('missing'), /data-category="all" aria-pressed="true"/);
});

test('the library groups every component with its own add action, guide and actual description', () => {
  for (const language of ['en', 'ua']) {
    const { html, count } = renderLibraryItems({ language });
    assert.equal(count, COMPONENTS.length);
    assert.deepEqual(
      types(html),
      COMPONENTS.map((component) => component.type),
    );
    assert.equal((html.match(/data-read-guide=/g) || []).length, count);
    assert.equal((html.match(/draggable="true"/g) || []).length, count);
    assert.equal((html.match(/class="category-heading"/g) || []).length, CATEGORIES.length);
    for (const component of COMPONENTS) {
      assert.ok(
        html.includes(esc(language === 'ua' ? component.descriptionUa : component.description)),
      );
      assert.ok(
        html.includes(
          `aria-label="${esc(TEXT[language].addComponent)}: ${esc(language === 'ua' ? component.ua : component.label)}"`,
        ),
      );
    }
    assertSeparateActions(html);
  }
});

test('component search combines category and bilingual terms without losing a visible empty state', () => {
  assert.deepEqual(
    types(renderLibraryItems({ category: 'gates', query: 'both inputs high' }).html),
    ['and'],
  );
  assert.deepEqual(types(renderLibraryItems({ category: 'physical', query: '  ШМІТТА  ' }).html), [
    'schmitt',
  ]);
  assert.equal(renderLibraryItems({ category: 'motion', query: 'AND gate' }).count, 0);
  const empty = renderLibraryItems({ category: 'gates', query: '"><script>alert(1)</script>' });
  assert.equal(empty.count, 0);
  assert.ok(empty.html.includes(TEXT.en.noResultsHint));
  assert.ok(!empty.html.includes('<script>'));
  assert.ok(renderLibraryItems({ category: 'missing' }).count === COMPONENTS.length);
});
