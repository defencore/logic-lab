import { validateSequence } from './actions.js';

/** Keep a complete time prefix; actions sharing the cutoff retain their exact order. */
export function trimSequence(source, cutoff) {
  const sequence = validateSequence(source);
  if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff > sequence.duration)
    throw new Error('Оберіть точку скорочення від 0 до поточної тривалості запису.');
  return validateSequence({
    ...sequence,
    actions: sequence.actions.filter((action) => action.at <= cutoff),
    duration: cutoff,
  });
}
