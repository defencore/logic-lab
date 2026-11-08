import { buildReferenceCheck } from '../assessment/index.js';

export function createReviewWorkController({
  adapter,
  session,
  operations,
  guardEditableSession,
  L,
}) {
  return async function openReviewedWork(
    submission,
    { replay = false, referenceKey, checkpoint } = {},
  ) {
    guardEditableSession();
    if (referenceKey) {
      const check = buildReferenceCheck(submission, referenceKey);
      await operations.run(async () => {
        await session.reviewCheck(check.submission.project, check.sequence, checkpoint, {
          label: `${check.key.title} · ${check.submission.student.name || check.submission.student.id}`,
        });
        adapter.closeModal();
        adapter.fitProject?.();
        adapter.notify(
          L(
            'Еталонна перевірка на паузі. Завершіть перегляд, щоб повернути свою схему.',
            'Reference check paused. End preview to restore your circuit.',
          ),
        );
      });
      return;
    }
    session.reviewWork(submission.project, replay ? submission.sequence : null);
    adapter.closeModal();
    adapter.fitProject?.();
    adapter.notify(
      L(
        'Тимчасовий перегляд роботи. «Зупинити» поверне вашу схему й сценарій.',
        'Temporary work review. Stop restores your circuit and sequence.',
      ),
    );
  };
}
