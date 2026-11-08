export const REVIEW_PAGE_SIZES = Object.freeze({ mismatches: 20, rows: 40, signals: 8, pairs: 20 });
const sectionFields = {
  mismatches: 'mismatchesOpen',
  observations: 'observationsOpen',
  evidence: 'evidenceOpen',
};
const pageFields = { mismatches: 'mismatchPage', rows: 'rowPage', signals: 'signalPage' };
const defaults = () => ({
  mismatchPage: 0,
  rowPage: 0,
  signalPage: 0,
  mismatchesOpen: false,
  observationsOpen: false,
  evidenceOpen: false,
});
const keyFor = (submission, index) =>
  submission.id
    ? `submission:${submission.id}:${index}`
    : `batch:${index}:${submission.assignment?.variant?.id || submission.student?.id || ''}`;

export function pageRange(total, size, requested = 0) {
  if (!Number.isInteger(total) || total < 0 || !Number.isInteger(size) || size < 1)
    throw new RangeError('Invalid review page dimensions.');
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Number.isFinite(requested)
    ? Math.max(0, Math.min(pages - 1, Math.floor(requested)))
    : 0;
  const start = page * size,
    end = Math.min(total, start + size);
  return { page, pages, start, end, first: total ? start + 1 : 0, last: end, total };
}
export function reviewDetail(state, submission, index) {
  return { ...defaults(), ...state.reviewDetails?.get(keyFor(submission, index)) };
}
function write(state, submission, index, detail) {
  state.reviewDetails ||= new Map();
  const key = keyFor(submission, index);
  state.reviewDetails.delete(key);
  state.reviewDetails.set(key, detail);
  if (state.reviewDetails.size > 200)
    state.reviewDetails.delete(state.reviewDetails.keys().next().value);
}
export function setReviewPage(state, index, kind, requested) {
  const item = Number.isInteger(index) && index >= 0 ? state.batch?.[index] : null;
  if (!item || !Object.hasOwn(pageFields, kind)) return false;
  const totals = {
    mismatches: item.result.mismatches?.length || 0,
    rows: item.result.studentObservations?.length || 0,
    signals: item.submission.sequence?.probes?.length || 0,
  };
  const detail = reviewDetail(state, item.submission, index);
  detail[pageFields[kind]] = pageRange(totals[kind], REVIEW_PAGE_SIZES[kind], requested).page;
  detail[kind === 'mismatches' ? 'mismatchesOpen' : 'observationsOpen'] = true;
  write(state, item.submission, index, detail);
  return true;
}
export function setReviewSection(state, index, section, open) {
  const item = Number.isInteger(index) && index >= 0 ? state.batch?.[index] : null;
  if (!item || !Object.hasOwn(sectionFields, section)) return false;
  const detail = reviewDetail(state, item.submission, index);
  detail[sectionFields[section]] = !!open;
  write(state, item.submission, index, detail);
  return true;
}
