export function teacherReviewRecoveryMarkup(state, language) {
  const recovery = state.reviewKeyRecovery;
  if (!recovery) return '';
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const locked = !!(state.busy || state.recording || state.player || state.preview);
  const title = recovery.keyChanged
    ? L('Копію ключа відкрито', 'Key copy opened')
    : L('Потрібна актуальна копія ключа', 'A current key copy is needed');
  const message = recovery.keyChanged
    ? L(
        'Повторіть перевірку збережених у цій сесії робіт за відкритим ключем.',
        'Retry the retained submissions with the opened key.',
      )
    : L(
        'У цьому ключі немає виданого варіанта. Відкрийте актуальну копію ключа, збережену після формування варіантів.',
        'This key does not contain the issued variant. Open the current key copy saved after generating variants.',
      );
  return `<aside class="teacher-review-recovery" role="status"><strong>${title}</strong><p>${message}</p><p>${L('Повторно вибирати файли не потрібно. Вибрано файлів:', 'You do not need to select the files again. Selected files:')} ${recovery.fileCount}.</p><div class="classroom-actions"><button type="button" class="soft-btn" id="teacher-review-current-key" ${locked ? 'disabled' : ''}>${L('Відкрити актуальний ключ', 'Open current key')}</button><button type="button" class="primary-btn" id="teacher-review-retry" ${locked || !recovery.keyChanged ? 'disabled' : ''}>${L('Повторити перевірку вибраних робіт', 'Retry selected submissions')}</button></div></aside>`;
}
