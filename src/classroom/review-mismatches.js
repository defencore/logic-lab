import { esc } from '../shared/ui.js';
import { REVIEW_PAGE_SIZES, pageRange, reviewDetail } from './review-detail-state.js';
import { reviewPagination } from './review-pagination.js';
import { reviewPosition } from './review-position.js';

export function reviewMismatches(
  mismatches,
  { state, submission, index, language, signalLabel, observedValue, actionCount },
) {
  if (!mismatches?.length) return '';
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const detail = reviewDetail(state, submission, index);
  const range = pageRange(mismatches.length, REVIEW_PAGE_SIZES.mismatches, detail.mismatchPage);
  const rows = mismatches
    .slice(range.start, range.end)
    .map((mismatch, offset) => {
      const position = reviewPosition(mismatch.after, actionCount, language);
      const time = Number.isFinite(mismatch.at) ? `${mismatch.at.toFixed(4)} ${L('с', 's')}` : '';
      return `<li value="${range.start + offset + 1}"><strong>${esc(signalLabel(mismatch.probe))}</strong> · ${esc(time)} · ${esc(position)}<br>${L('Очікується', 'Expected')}: ${esc(observedValue(mismatch.expected))}; ${L('отримано', 'received')}: ${esc(observedValue(mismatch.actual))}.${mismatch.expected === 'X' || mismatch.expected === 'Z' ? `<br>${L('Еталонний сигнал не визначений. Викладачеві потрібно уточнити еталон.', 'The reference signal is not defined. The instructor should correct the reference.')}` : ''}</li>`;
    })
    .join('');
  return `<details data-review-section="mismatches" data-review-index="${index}" ${detail.mismatchesOpen ? 'open' : ''}><summary>${mismatches.length} ${L('розбіжностей', 'differences')}</summary>${reviewPagination({ range, index, kind: 'mismatches', label: L('Розбіжності', 'Differences'), language })}<ol class="review-mismatch-list" start="${range.first}">${rows}</ol></details>`;
}
