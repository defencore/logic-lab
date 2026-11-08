import { COMPONENTS, CATEGORIES } from '../../components/catalog/index.js';
import { TEXT } from '../../locales/index.js';
import { esc } from '../../shared/ui.js';
import { gateIcon, icon } from '../../shared/icons.js';

const languageKey = (language) => (language === 'ua' ? 'ua' : 'en');
const categoryIcon = {
  all: 'grid',
  gates: 'wire',
  io: 'signal',
  audio: 'speaker',
  combinational: 'layers',
  sequential: 'layers',
  analog: 'signal',
  architecture: 'wire',
  physical: 'signal',
  motion: 'box',
  scenes: 'box',
  automation: 'grid',
  annotation: 'note',
};
const name = (entry, language) => (language === 'ua' ? entry.ua : entry.label);
const validCategory = (category) =>
  CATEGORIES.some((entry) => entry.id === category) ? category : 'all';

export function renderLibraryCategories(category = 'all', language = 'en') {
  language = languageKey(language);
  category = validCategory(category);
  const t = (key) => TEXT[language][key];
  const categories = [{ id: 'all', label: t('all'), ua: t('all') }, ...CATEGORIES];
  const current = categories.find((entry) => entry.id === category);
  return `<details class="library-category-browser"><summary><span>${esc(name(current, language))}</span>${icon('down', 13)}</summary><div class="library-category-filters" role="group" aria-label="${esc(t('browseCategories'))}">${categories
    .map((entry) => {
      const count =
        entry.id === 'all'
          ? COMPONENTS.length
          : COMPONENTS.filter((component) => component.category === entry.id).length;
      return `<button type="button" class="category-filter ${category === entry.id ? 'active' : ''}" data-category="${entry.id}" aria-pressed="${category === entry.id}" title="${esc(name(entry, language))} · ${count}"><span class="category-filter-icon" aria-hidden="true">${entry.id === 'gates' ? gateIcon('and', 19) : icon(categoryIcon[entry.id], 17)}</span><span class="category-filter-name">${esc(name(entry, language))}</span><span class="category-filter-count">${count}</span></button>`;
    })
    .join('')}</div></details>`;
}

export function renderLibraryItems({ category = 'all', query = '', language = 'en' } = {}) {
  language = languageKey(language);
  category = validCategory(category);
  const t = (key) => TEXT[language][key];
  const terms = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = COMPONENTS.filter((definition) => {
    if (category !== 'all' && definition.category !== category) return false;
    const group = CATEGORIES.find((entry) => entry.id === definition.category);
    const searchable =
      `${definition.type} ${definition.label} ${definition.ua} ${definition.description} ${definition.descriptionUa} ${group.label} ${group.ua}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  if (!matches.length)
    return {
      count: 0,
      html: `<div class="no-results catalog-empty">${icon('search', 28)}<h3>${t('noResults')}</h3><p>${t('noResultsHint')}</p></div>`,
    };
  const html = CATEGORIES.filter((group) =>
    matches.some((definition) => definition.category === group.id),
  )
    .map((group) => {
      const components = matches.filter((definition) => definition.category === group.id);
      return `<section class="component-category" data-category-group="${group.id}" aria-labelledby="component-category-${group.id}"><h3 class="category-heading" id="component-category-${group.id}"><span>${esc(name(group, language))}</span><span class="category-heading-count">${components.length}</span></h3>${components
        .map((definition) => {
          const label = name(definition, language);
          const description = language === 'ua' ? definition.descriptionUa : definition.description;
          const glyph = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(definition.type)
            ? gateIcon(definition.type, 32)
            : `<span class="component-glyph" aria-hidden="true">${esc(definition.symbol || definition.type.toUpperCase())}</span>`;
          const typeLabel =
            definition.type === 'bus_input'
              ? 'BYTE INPUT'
              : definition.type.toUpperCase().replaceAll('_', ' ');
          return `<div class="library-row"><button type="button" class="library-item" draggable="true" data-component="${definition.type}" title="${esc(description)}" aria-label="${esc(t('addComponent'))}: ${esc(label)}"><span class="component-symbol cat-${definition.category}">${glyph}</span><span class="component-info"><strong>${esc(label)}</strong><small class="component-description">${esc(description)}</small><code class="component-type">${esc(typeLabel)}</code></span><span class="item-plus" aria-hidden="true">${icon('plus', 15)}</span></button><button type="button" class="library-guide" data-read-guide="${definition.type}" title="${esc(t('readGuide'))}: ${esc(label)}" aria-label="${esc(t('usageGuide'))}: ${esc(label)}">${icon('help', 16)}</button></div>`;
        })
        .join('')}</section>`;
    })
    .join('');
  return { html, count: matches.length };
}
