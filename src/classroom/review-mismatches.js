import { esc } from '../shared/ui.js';
import { REVIEW_PAGE_SIZES, pageRange, reviewDetail } from './review-detail-state.js';
import { reviewPagination } from './review-pagination.js';
import { referenceReviewPosition } from './review-position.js';
import { referenceReviewReason, referenceCheckpointReason } from './review-reference.js';

export function reviewMismatches(
  mismatches,
  { state, submission, index, language, signalLabel, observedValue, actionCount },
) {
  if (!mismatches?.length) return '';
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const detail = reviewDetail(state, submission, index);
  const range = pageRange(mismatches.length, REVIEW_PAGE_SIZES.mismatches, detail.mismatchPage);
  const unavailable = referenceReviewReason(state.teacherKey, submission, language);
  const locked = !!(state.busy || state.recording || state.player || state.preview);
  const rows = mismatches
    .slice(range.start, range.end)
    .map((mismatch, offset) => {
      const position = referenceReviewPosition(mismatch.after, actionCount, language);
      const reason =
        unavailable || referenceCheckpointReason(state.teacherKey?.sequence, mismatch, language);
      const time = Number.isFinite(mismatch.at) ? `${mismatch.at.toFixed(4)} ${L('с', 's')}` : '';
      return `<li value="${range.start + offset + 1}"><strong>${esc(signalLabel(mismatch.probe))}</strong> · ${esc(time)} · ${esc(position)}<br>${L('Очікується', 'Expected')}: ${esc(observedValue(mismatch.expected))}; ${L('отримано', 'received')}: ${esc(observedValue(mismatch.actual))}.${mismatch.expected === 'X' || mismatch.expected === 'Z' ? `<br>${L('Еталонний сигнал не визначений. Викладачеві потрібно уточнити еталон.', 'The reference signal is not defined. The instructor should correct the reference.')}` : ''}<div class="classroom-actions"><button type="button" class="soft-btn" data-review-check="${index}" data-review-mismatch="${range.start + offset}" ${locked || reason ? 'disabled' : ''} ${reason ? `title="${esc(reason)}"` : ''}>${L('Відтворити цю перевірку', 'Replay this reference check')}</button></div></li>`;
    })
    .join('');
  return `<details data-review-section="mismatches" data-review-index="${index}" ${detail.mismatchesOpen ? 'open' : ''}><summary>${mismatches.length} ${L('розбіжностей еталонної перевірки', 'instructor reference differences')}</summary><p class="classroom-hint">${L('Це результат еталонної перевірки викладача на поданій схемі. Номери дій належать еталонній перевірці, а не запису студента. Відтворення зупиниться в обраній точці.', 'These differences come from the instructor reference check on the submitted circuit. Action numbers belong to that check, rather than the student recording. Replay pauses at the selected checkpoint.')}</p>${unavailable ? `<p class="classroom-hint">${esc(unavailable)}</p>` : ''}${reviewPagination({ range, index, kind: 'mismatches', label: L('Розбіжності', 'Differences'), language })}<ol class="review-mismatch-list" start="${range.first}">${rows}</ol></details>`;
}
