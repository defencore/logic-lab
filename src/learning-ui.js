import { getDefinition } from './catalog.js';
import { EXAMPLES } from '../examples/index.js';
import { getGuide } from './guides.js';
import { TEXT } from './i18n.js';
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

export function exampleCards(examples, language) {
  const t = (key) => TEXT[language][key];
  if (!examples.length)
    return `<div class="catalog-empty">${icon('search', 28)}<p>${t('noExamples')}</p></div>`;
  return examples
    .map((example) => {
      const count = example.create().nodes.length;
      const art = ['basics', 'sequential', 'mixed', 'architecture', 'physical', 'motion'].indexOf(
        example.category,
      );
      return `<article class="example-card"><button class="example-open" data-example="${example.id}">
      <div class="example-art art-${art}">${icon(example.category === 'mixed' ? 'signal' : example.category === 'sequential' ? 'layers' : 'wire', 32)}<span>${esc(t(example.level))}</span></div>
      <div class="example-body"><span class="example-topic">${esc(t(example.category))} · ${count} ${t('nodes')}</span>
      <h3>${esc(label(example, language))}</h3><p>${esc(language === 'ua' ? example.descriptionUa : example.description)}</p>
      <strong>${t('loadExample')}${icon('chevron', 14)}</strong></div></button><div class="example-resources"><button class="text-btn" data-lab-guide="${example.id}">${icon('note', 12)}${t('laboratory')}</button><a href="${example.circuitPath}" download="${example.id}.logic.json" class="text-btn" aria-label="${t('downloadCircuit')}: ${esc(label(example, language))}">${icon('download', 12)}JSON</a></div></article>`;
    })
    .join('');
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
      <dt><code>${esc(port.label)}</code><span>${port.acceptAny ? t('anySignal') : port.analog ? t('analog') + (port.unit ? ' · ' + esc(port.unit) : '') : `${port.width || 1} ${t('bits')}`}</span>${nodeId ? `<b data-guide-node="${nodeId}" data-guide-port="${port.id}" data-guide-direction="${direction}" class="signal-value">Z</b>` : ''}</dt>
      <dd>${esc(guide[direction][port.id])}</dd></div>`,
        )
        .join('')}</dl></section>`;
    })
    .join('');
  return `<div class="component-instructions" data-guide-type="${type}">
    <p class="guide-purpose">${esc(guide.purpose)}</p>
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
