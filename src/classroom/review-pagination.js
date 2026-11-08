import { esc } from '../shared/ui.js';

export function reviewPagination({ range, index, kind, label, language }) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const controls = [
    ['first', 0, L('Перша', 'First')],
    ['previous', range.page - 1, L('Попередня', 'Previous')],
    ['next', range.page + 1, L('Наступна', 'Next')],
    ['last', range.pages - 1, L('Остання', 'Last')],
  ];
  return `<div class="review-pagination" data-review-pagination="${kind}"><p role="status">${esc(label)} ${range.first}–${range.last} ${L('із', 'of')} ${range.total}</p><div class="review-page-controls">${controls.map(([direction, target, text]) => `<button type="button" class="soft-btn" data-review-page="${kind}" data-review-index="${index}" data-review-target="${target}" data-review-direction="${direction}" ${target < 0 || target >= range.pages || target === range.page ? 'disabled' : ''}>${text}</button>`).join('')}<label>${L('Сторінка', 'Page')}<input type="number" inputmode="numeric" min="1" max="${range.pages}" step="1" value="${range.page + 1}" data-review-page-input="${kind}" data-review-index="${index}" aria-label="${esc(label)} · ${L('сторінка', 'page')}" ${range.pages === 1 ? 'disabled' : ''}> ${L('із', 'of')} ${range.pages}</label></div></div>`;
}
