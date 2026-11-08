import { AssessmentError } from '../assessment/errors.js';

/** Keep selected immutable File references in this window, never in a persisted draft. */
export function createReviewKeyRecovery(state) {
  let selected = [];
  function begin(files) {
    selected = [...files];
    state.reviewKeyRecovery = null;
  }
  function missingVariant() {
    state.reviewKeyRecovery ||= {
      fileCount: selected.length,
      missingVariantCount: 0,
      keyChanged: false,
    };
    state.reviewKeyRecovery.missingVariantCount++;
  }
  function keyChanged() {
    if (state.reviewKeyRecovery) state.reviewKeyRecovery.keyChanged = true;
  }
  function retry(review) {
    if (!selected.length) throw new AssessmentError('assessment_no_review_files');
    return review([...selected]);
  }
  return { begin, missingVariant, keyChanged, retry };
}
