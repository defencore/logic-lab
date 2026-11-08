import { stable } from '../assessment/canonical.js';

export function referenceReviewReason(key, submission, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const assignment = submission?.assignment;
  const variant = Array.isArray(key?.issued)
    ? key.issued.find((entry) => entry?.id === assignment?.id)
    : null;
  if (
    !key?.id ||
    key.kind !== 'logic-lab-assignment-key' ||
    key.version !== 1 ||
    !key.referenceProject ||
    !Array.isArray(key.sequence?.actions) ||
    !Number.isFinite(key.sequence.duration) ||
    assignment?.taskId !== key.id ||
    !variant ||
    assignment.id !== assignment.variant?.id ||
    stable(variant) !== stable(assignment.variant) ||
    (variant.studentId && variant.studentId !== submission.student?.id) ||
    !submission.project
  )
    return L(
      'Для відтворення еталонної перевірки потрібен відповідний ключ викладача з виданим цій роботі варіантом.',
      'Replaying the instructor reference check requires the matching instructor key and this submission’s issued variant.',
    );
  return '';
}

export function referenceCheckpointReason(sequence, checkpoint, language) {
  const { after, at } = checkpoint || {};
  const actions = sequence?.actions;
  const target =
    after === -1 ? 0 : after === actions?.length ? sequence?.duration : actions?.[after]?.at;
  if (
    !Array.isArray(actions) ||
    !Number.isInteger(after) ||
    after < -1 ||
    after > actions.length ||
    !Number.isFinite(at) ||
    !Number.isFinite(target) ||
    Math.abs(at - target) > 1e-8
  )
    return language === 'ua'
      ? 'Ця точка еталонної перевірки недоступна. Повторно перевірте роботу.'
      : 'This instructor reference checkpoint is unavailable. Check the submission again.';
  return '';
}
