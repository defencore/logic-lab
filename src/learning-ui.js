import { getDefinition } from './catalog.js';
import { EXAMPLES } from '../examples/index.js';
import { getGuide } from './guides.js';
import { TEXT } from './i18n.js';
import { truthTableMarkup } from './truth-tables.js';
import { esc } from './ui-utils.js';
import { icon } from './icons.js';

const label = (item, language) => (language === 'ua' ? item.ua : item.label);

export function filterExamples(examples, { query = '', category = 'all', level = 'all' } = {}) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return examples.filter((example) => {
    if (category !== 'all' && example.category !== category) return false;
    if (level !== 'all' && example.level !== level) return false;
    const types = example
      .create()
      .nodes.map((node) => {
        const definition = getDefinition(node.type);
        return `${node.type} ${definition.label} ${definition.ua}`;
      })
      .join(' ');
    const content =
      `${example.label} ${example.ua} ${example.description} ${example.descriptionUa} ${types}`.toLowerCase();
    return terms.every((term) => content.includes(term));
  });
}

const TOPICS = ['basics', 'sequential', 'mixed', 'architecture', 'physical', 'motion', 'scenes'];
const languageKey = (language) => (language === 'ua' ? 'ua' : 'en');
const topicIcon = (topic) =>
  topic === 'mixed' || topic === 'physical'
    ? 'signal'
    : topic === 'sequential'
      ? 'layers'
      : topic === 'motion'
        ? 'box'
        : topic === 'scenes'
          ? 'grid'
          : 'wire';

function topicThumbnail(topic) {
  const drawings = {
    scenes:
      '<path d="M8 62h144M54 12v60M108 12v60"/><rect x="17" y="12" width="24" height="43" rx="5"/><circle cx="29" cy="23" r="4"/><circle cx="29" cy="34" r="4"/><circle cx="29" cy="45" r="4"/><path d="M29 55v15M72 27h18v18H72Z M122 32h24v22h-24Z"/>',
    basics:
      '<circle cx="16" cy="28" r="4"/><circle cx="16" cy="58" r="4"/><path d="M20 28h28v8h20M20 58h28V50h20M68 24h21a19 19 0 0 1 0 38H68Z M108 43h27"/><circle cx="140" cy="43" r="5"/>',
    sequential:
      '<path d="M10 66h12V48h16v18h16V48h16v18h16V48h16v18h44"/><rect x="22" y="14" width="27" height="24" rx="3"/><rect x="67" y="14" width="27" height="24" rx="3"/><rect x="112" y="14" width="27" height="24" rx="3"/><path d="M49 26h18m27 0h18"/>',
    mixed:
      '<path d="M6 44c11-40 22-40 33 0s22 40 33 0 22-40 33 0 22 40 33 0 14-18 16-18"/><path d="M6 72h148"/>',
    architecture:
      '<path d="M10 22h38v12h19M10 42h38v0h19M10 62h38V50h19"/><path d="m68 18 30 12v25L68 68Z M98 42h42M83 18V8"/><path d="m118 35 8 14m-1-14 8 14"/><circle cx="146" cy="42" r="4"/>',
    physical:
      '<path d="M8 25h20l6-8 9 16 9-16 9 16 9-16 6 8h17M93 12v56M78 58h30V24h38"/><path d="m132 20 14 4-6 13"/>',
    motion:
      '<path d="M18 69h124M28 22v45M132 22v45M28 26h104M28 55h104"/><rect x="63" y="19" width="35" height="41" rx="3"/><circle cx="80" cy="40" r="9"/><path d="m80 40 14-8M18 11h24m78 0h22M80 60v12"/>',
  };
  return `<svg viewBox="0 0 160 86" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[topic] || drawings.basics}</svg>`;
}

export function exampleCards(examples, language = 'en') {
  language = languageKey(language);
  const t = (key) => TEXT[language][key];
  if (!examples.length)
    return `<div class="catalog-empty" role="status">${icon('search', 28)}<h3>${t('noCatalogResults')}</h3><p>${t('noResultsHint')}</p></div>`;
  return examples
    .map((example) => {
      const count = example.create().nodes.length;
      const title = label(example, language);
      const category = TOPICS.includes(example.category) ? example.category : 'basics';
      return `<article class="example-card example-entry topic-${category}" aria-labelledby="example-title-${esc(example.id)}">
      <header class="example-card-header"><div class="example-thumbnail">${topicThumbnail(category)}</div><div class="example-heading"><span class="example-topic catalog-topic-label">${esc(t(category))}</span><h3 class="catalog-card-title example-title" id="example-title-${esc(example.id)}">${esc(title)}</h3></div></header>
      <div class="example-body"><div class="example-meta catalog-detail-tags"><span class="catalog-tag level-${esc(example.level)}">${esc(t(example.level))}</span><span class="catalog-card-meta">${example.lab.duration} ${t('minutes')}</span><span class="catalog-card-meta">${count} ${t('nodes')}</span></div><p class="example-description">${esc(language === 'ua' ? example.descriptionUa : example.description)}</p></div>
      <footer class="example-actions"><button type="button" class="example-open primary-btn" data-example="${esc(example.id)}" aria-label="${esc(t('openCircuit'))}: ${esc(title)}">${icon('play', 14)}${t('openCircuit')}${icon('chevron', 14)}</button><div class="example-resources"><button type="button" class="text-btn" data-lab-guide="${esc(example.id)}" aria-label="${esc(t('viewWorksheet'))}: ${esc(title)}">${icon('note', 14)}${t('viewWorksheet')}</button><a href="${esc(example.circuitPath)}" download="${esc(example.id)}.logic.json" class="text-btn" aria-label="${esc(t('downloadCircuit'))}: ${esc(title)}">${icon('download', 14)}JSON</a></div></footer>
    </article>`;
    })
    .join('');
}

export function exampleCatalogShell(
  language = 'en',
  { query = '', category = 'all', level = 'all' } = {},
) {
  language = languageKey(language);
  const t = (key) => TEXT[language][key];
  category = TOPICS.includes(category) ? category : 'all';
  level = ['beginner', 'intermediate'].includes(level) ? level : 'all';
  const topics = ['all', ...TOPICS];
  const matches = filterExamples(EXAMPLES, { query, category, level });
  return `<div class="catalog-intro"><span class="eyebrow">${t('laboratoryCatalog')}</span><h2>${t('examplesTitle')}</h2><p>${t('catalogIntro')}</p></div><div class="catalog-layout">
    <aside class="catalog-sidebar"><h3>${t('browseTopics')}</h3><nav class="catalog-topics" aria-label="${t('browseTopics')}">${topics
      .map((topic) => {
        const count =
          topic === 'all'
            ? EXAMPLES.length
            : EXAMPLES.filter((example) => example.category === topic).length;
        return `<button type="button" class="catalog-topic ${category === topic ? 'active' : ''}" data-topic="${topic}" aria-pressed="${category === topic}"><span class="catalog-topic-icon">${icon(topic === 'all' ? 'grid' : topicIcon(topic), 17)}</span><span class="catalog-topic-name">${esc(t(topic === 'all' ? 'allTopics' : topic))}</span><span class="catalog-topic-count">${count}</span></button>`;
      })
      .join(
        '',
      )}</nav><button id="empty-project" type="button" class="catalog-empty-start text-btn">${icon('plus', 14)}${t('clear')}</button></aside>
    <main class="catalog-main catalog-results"><div class="catalog-searchbar"><div class="search-wrap">${icon('search', 17)}<input id="example-search" type="search" placeholder="${esc(t('searchExamples'))}" aria-label="${esc(t('searchExamples'))}" value="${esc(query)}" autocomplete="off"></div><label class="catalog-level"><span>${t('filterLevel')}</span><select id="example-level" aria-label="${t('filterLevel')}">${['all', 'beginner', 'intermediate'].map((item) => `<option value="${item}" ${item === level ? 'selected' : ''}>${t(item === 'all' ? 'allLevels' : item)}</option>`).join('')}</select></label></div><div class="catalog-results-header"><h3>${t('catalogResults')}</h3><span id="catalog-count" role="status" aria-live="polite">${matches.length} ${t('laboratories')}</span></div><div id="example-results" class="example-grid">${exampleCards(matches, language)}</div></main>
  </div>`;
}

export function guideMarkup(type, language, nodeId = null) {
  const definition = getDefinition(type),
    guide = getGuide(type, language);
  if (!definition || !guide) return '';
  const t = (key) => TEXT[language][key];
  const pins = ['inputs', 'outputs']
    .map((direction) => {
      const ports = definition[direction];
      if (!ports.length) return '';
      return `<section class="guide-section"><h4>${t(direction)}</h4><dl class="pin-reference">${ports
        .map(
          (port) => `<div>
      <dt><code>${esc(port.label)}</code><span>${port.acceptAny ? t('anySignal') : port.analog ? t('analog') + (port.unit ? ' · ' + esc(port.unit) : '') : `${port.width || 1} ${t('bits')}`}</span>${nodeId ? `<b data-guide-node="${esc(nodeId)}" data-guide-port="${port.id}" data-guide-direction="${direction}" class="signal-value">Z</b>` : ''}</dt>
      <dd>${esc(guide[direction][port.id])}</dd></div>`,
        )
        .join('')}</dl></section>`;
    })
    .join('');
  return `<div class="component-instructions" data-guide-type="${type}">
    <p class="guide-purpose">${esc(guide.purpose)}</p>
    ${truthTableMarkup(type, language, nodeId)}
    <section class="guide-section"><h4>${t('howToUse')}</h4><ol class="instruction-steps">${guide.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol></section>
    ${pins}<section class="guide-section try-experiment"><h4>${t('tryThis')}</h4><p>${esc(guide.experiment)}</p><strong>${t('expectedResult')}</strong><p>${esc(guide.expected)}</p></section>
    <section class="guide-section"><h4>${t('commonMistakes')}</h4><ul class="guide-pitfalls">${guide.pitfalls.map((pitfall) => `<li>${esc(pitfall)}</li>`).join('')}</ul></section>
    ${
      guide.examples.length
        ? `<section class="guide-section"><h4>${t('relatedExamples')}</h4><div class="related-examples">${guide.examples
            .map((id) => {
              const example = EXAMPLES.find((item) => item.id === id);
              return example
                ? `<button class="soft-btn" data-learn-example="${id}">${icon('wire', 14)}${esc(label(example, language))}${icon('chevron', 12)}</button>`
                : '';
            })
            .join('')}</div></section>`
        : ''
    }
  </div>`;
}
