import { esc } from '../shared/ui.js';
import { reviewDetail } from './review-detail-state.js';
import { reviewObservationsMarkup } from './review-observations.js';
export { reviewObservationsMarkup } from './review-observations.js';

export function reviewMatches(state, submission, result, index) {
  const query = String(state.reviewQuery || '')
    .trim()
    .toLocaleLowerCase();
  const haystack = [
    submission.student?.name,
    submission.student?.id,
    submission.student?.group,
    submission.assignment?.title,
    submission.notes,
  ]
    .join(' ')
    .toLocaleLowerCase();
  if (query && !haystack.includes(query)) return false;
  const mode = state.reviewFilter || 'all';
  return mode === 'review'
    ? !!result.reviewRequired
    : mode === 'failed'
      ? !result.functionalPassed
      : mode === 'passed'
        ? !!result.passed && !result.reviewRequired
        : mode === 'similar'
          ? (state.pairs || []).some(
              (pair) => pair.suspected && (pair.a === index || pair.b === index),
            )
          : true;
}

export function reviewCardMarkup({
  submission,
  result,
  index,
  state,
  language,
  studentLabel,
  referenceCheckMarkup,
  evidenceMarkup,
}) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const locked = !!(state.busy || state.recording || state.player || state.preview);
  const variant = submission.assignment?.variant?.id || '';
  const detail = reviewDetail(state, submission, index);
  return `<article class="review-card" data-review-card="${index}"><header><h4>${esc(studentLabel(submission, index))}</h4><span>${esc(submission.student?.group || '')}</span><span class="classroom-variant" title="${esc(variant)}">${L('Варіант', 'Variant')}: ${esc(variant.slice(0, 8))}</span></header><div class="review-card-score">${referenceCheckMarkup(result, submission, index)}</div><section><h5>${L('Пояснення студента', 'Student explanation')}</h5><p class="preserve-lines">${esc(submission.notes || L('Пояснення у файлі відсутнє.', 'No explanation was included.'))}</p></section><div class="classroom-actions"><button type="button" class="soft-btn" data-review-open="${index}" ${locked || !submission.project ? 'disabled' : ''}>${L('Відкрити схему студента', 'Open student circuit')}</button><button type="button" class="soft-btn" data-review-replay="${index}" ${locked || !submission.sequence ? 'disabled' : ''}>${L('Відтворити дослід студента', 'Replay student experiment')}</button></div><p class="classroom-hint">${L('Перегляд відкриває подану схему та справжню послідовність входів. Поточна схема зберігається до завершення перегляду.', 'Preview opens the submitted circuit and its actual input sequence. Your current circuit is retained until preview ends.')}</p><details data-review-section="observations" data-review-index="${index}" ${detail.observationsOpen ? 'open' : ''}><summary>${L('Повторно обчислений дослід', 'Recomputed experiment')}</summary>${reviewObservationsMarkup(submission, result, language, { detail, index })}</details><details data-review-section="evidence" data-review-index="${index}" ${detail.evidenceOpen ? 'open' : ''}><summary>${L('Цілісність і свідчення роботи', 'Integrity and work evidence')}</summary><p>${result.integrity ? L('Контрольна сума збігається', 'Checksum matches') : L('Контрольна сума не збігається', 'Checksum mismatch')}</p>${evidenceMarkup(result)}</details></article>`;
}
