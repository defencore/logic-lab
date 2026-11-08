import { $ } from '../shared/ui.js';
import { createReviewView } from './review-view.js';
import { setReviewPage, setReviewSection } from './review-detail-state.js';
import { setReviewPairPage } from './review-similarities.js';
import { referenceReviewReason, referenceCheckpointReason } from './review-reference.js';

const toggleHandlers = new WeakMap();

export function bindReviewControls({ adapter, state, guardEditableSession, protect, views }) {
  const root = $('#review-results');
  if (!root) return;
  const showPage = (index, kind, page) => {
    if (kind === 'pairs') {
      setReviewPairPage(state, page);
      const pairs = $('#review-similarities', root);
      if (pairs)
        pairs.innerHTML = createReviewView({
          state,
          language: adapter.getLanguage(),
        }).similaritiesMarkup();
      $('[data-review-page-input="pairs"]', root)?.focus({ preventScroll: true });
      return;
    }
    if (!setReviewPage(state, index, kind, page)) return;
    const card = $(`[data-review-card="${index}"]`, root);
    if (!card) return;
    card.outerHTML = createReviewView({
      state,
      language: adapter.getLanguage(),
    }).cardMarkup(index);
    $(`[data-review-page-input="${kind}"][data-review-index="${index}"]`, root)?.focus({
      preventScroll: true,
    });
  };
  root.onclick = protect(async (event) => {
    const page = event.target.closest('[data-review-page]');
    if (page) {
      if (!page.disabled)
        showPage(
          Number(page.dataset.reviewIndex),
          page.dataset.reviewPage,
          Number(page.dataset.reviewTarget),
        );
      return;
    }
    const check = event.target.closest('[data-review-check]');
    if (check) {
      if (check.disabled) return;
      guardEditableSession();
      const index = Number(check.dataset.reviewCheck);
      const mismatchIndex = Number(check.dataset.reviewMismatch);
      const item = Number.isInteger(index) && index >= 0 ? state.batch[index] : null;
      const mismatch =
        Number.isInteger(mismatchIndex) && mismatchIndex >= 0
          ? item?.result.mismatches?.[mismatchIndex]
          : null;
      const language = adapter.getLanguage();
      if (!mismatch)
        throw new Error(
          language === 'ua'
            ? 'Цієї розбіжності більше немає. Повторно перевірте роботу.'
            : 'This difference is no longer available. Check the submission again.',
        );
      const checkpoint = { after: mismatch.after, at: mismatch.at };
      const reason =
        referenceReviewReason(state.teacherKey, item.submission, language) ||
        referenceCheckpointReason(state.teacherKey?.sequence, checkpoint, language);
      if (reason) throw new Error(reason);
      await adapter.openReviewedWork(item.submission, {
        replay: true,
        referenceKey: state.teacherKey,
        checkpoint,
      });
      return;
    }
    const open = event.target.closest('[data-review-open],[data-review-replay]');
    if (!open || open.disabled) return;
    guardEditableSession();
    const index = Number(open.dataset.reviewOpen ?? open.dataset.reviewReplay);
    const submission = state.batch[index]?.submission;
    if (!submission) return;
    await adapter.openReviewedWork(submission, {
      replay: open.dataset.reviewReplay !== undefined,
    });
  });
  const filter = (event) => {
    if (event.target.id === 'review-query') state.reviewQuery = event.target.value;
    else if (event.target.id === 'review-filter') state.reviewFilter = event.target.value;
    else return;
    const cards = $('#review-cards', root);
    if (cards) cards.innerHTML = views().reviewCardsMarkup();
  };
  const jump = (target) =>
    showPage(
      Number(target.dataset.reviewIndex),
      target.dataset.reviewPageInput,
      Number(target.value) - 1,
    );
  root.oninput = filter;
  root.onchange = (event) => {
    if (event.target.matches('[data-review-page-input]')) jump(event.target);
    else filter(event);
  };
  root.onkeydown = (event) => {
    if (event.key !== 'Enter' || !event.target.matches('[data-review-page-input]')) return;
    event.preventDefault();
    jump(event.target);
  };
  const previous = toggleHandlers.get(root);
  if (previous) root.removeEventListener('toggle', previous, true);
  const toggle = ({ target }) => {
    if (!target.dataset?.reviewSection) return;
    setReviewSection(
      state,
      Number(target.dataset.reviewIndex),
      target.dataset.reviewSection,
      target.open,
    );
  };
  root.addEventListener('toggle', toggle, true);
  toggleHandlers.set(root, toggle);
}
