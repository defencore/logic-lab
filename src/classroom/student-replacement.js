import { $, $$, esc } from '../shared/ui.js';

/** A dismissible review does not retain the operation lock while awaiting a choice. */
export function createStudentReplacement({
  adapter,
  state,
  L,
  safe,
  operations,
  guardEditableSession,
  saveDraft,
}) {
  return function review({ title, description, confirm, apply }) {
    adapter.showModal(
      `<h2>${esc(title)}</h2><p>${esc(description)}</p><p>${esc(state.assignment?.title || adapter.getProject().name)} · ${state.attempt?.journal.length || 0} ${L('змін схеми', 'circuit edits')} · ${state.sequence?.actions.length || 0} ${L('записаних дій', 'recorded actions')}</p><p>${L('Збережіть копію перед заміною, щоб мати змогу повернутися до цієї роботи.', 'Save a copy before replacing it so you can return to this work.')}</p><div class="modal-actions"><button type="button" id="student-replace-cancel" class="soft-btn">${L('Продовжити поточну роботу', 'Keep current work')}</button><button type="button" id="student-replace-save" class="primary-btn">${L('Зберегти копію та продовжити', 'Save copy and continue')}</button><button type="button" id="student-replace-confirm" class="danger-btn">${esc(confirm)}</button></div>`,
    );
    $('#student-replace-cancel').onclick = adapter.closeModal;
    $('#student-replace-confirm').onclick = safe(() => {
      guardEditableSession();
      apply();
    });
    $('#student-replace-save').onclick = safe(async () => {
      guardEditableSession();
      const buttons = $$('.modal-actions button');
      buttons.forEach((button) => (button.disabled = true));
      try {
        await operations.run(async () => {
          await saveDraft();
          apply();
        });
      } finally {
        buttons.forEach((button) => (button.disabled = false));
      }
    });
  };
}
