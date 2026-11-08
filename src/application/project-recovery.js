import { recoverProjectCopy } from '../circuits/recover-project.js';
import {
  loadProjectRecovery,
  acknowledgeProjectRecovery,
  saveProject,
} from '../circuits/project.js';
import { downloadFile } from '../classroom/files.js';
import { $, $$, esc } from '../shared/ui.js';

export function createProjectRecovery({ state, services, actions }) {
  const L = (ua, en) => (state.lang === 'ua' ? ua : en);
  function entries(includeHandled = false) {
    state.projectRecovery = loadProjectRecovery();
    return [
      {
        record: state.projectRecovery,
        acknowledge: acknowledgeProjectRecovery,
        label: L('Збережена схема', 'Saved circuit'),
        filename: 'logic-lab-saved-project-original.logic.json',
      },
      {
        record: services.classroom.recovery?.(),
        acknowledge: services.classroom.acknowledgeRecovery,
        label: L('Чернетка лабораторної', 'Classroom draft'),
        filename: 'logic-lab-classroom-draft-original.json',
      },
    ].filter(({ record }) => record && (includeHandled || !record.handled));
  }
  function open(includeHandled = false) {
    const pending = entries(includeHandled);
    if (!pending.length) return false;
    actions.setRunning(false);
    const needsAttention = pending.some(({ record }) => !record.handled);
    const title = needsAttention
      ? L('Збережені дані потребують уваги', 'Saved work needs attention')
      : L('Збережені оригінали', 'Saved originals');
    const explanation = needsAttention
      ? L(
          'Попередню схему або частину чернетки не вдалося відкрити. Оригінальні дані збережено для відновлення. Завантажте їх перед продовженням; доступна схема залишиться в редакторі.',
          'The previous circuit or part of a draft could not be opened. The original data is retained for recovery. Download it before continuing; the available circuit will remain in the editor.',
        )
      : L(
          'Ці оригінальні файли збережені перед переходом до поточної роботи. Завантаження збереже їх без змін.',
          'These original files were retained before continuing with the current work. Downloading keeps their contents unchanged.',
        );
    const backupFailure = L(
      'Резервну копію поки не вдалося записати в браузері. Оригінал залишається на місці; автоматичне збереження заблоковано. Завантажте оригінал і повторіть спробу після звільнення місця. Роботу також можна експортувати окремим файлом.',
      'The browser could not store a recovery copy. The original remains in place and automatic saving is blocked. Download the original and retry after freeing space. You can also export your current work as a separate file.',
    );
    services.dialogs.open(
      `<h2>${title}</h2><p>${explanation}</p>${pending
        .map(
          ({ record, label }, index) =>
            `<section class="property-section"><h3>${label}</h3><p>${esc(record.reason)}</p><button type="button" class="soft-btn" data-recovery-download="${index}">${L('Завантажити оригінальний JSON', 'Download original JSON')}</button>${record.kind === 'project' && record.backedUp && recoverProjectCopy(record.raw) ? `<p>${L('Можна відкрити копію для перепідключення серво. Старі аналогові з’єднання серво буде від’єднано; підключіть цифровий PWM і задайте імпульси 1000–2000 мкс. Оригінал залишиться збереженим.', 'You can open a copy to reconnect the servos. Old analog servo connections will be disconnected; connect digital PWM and set 1000–2000 µs pulses. The original will remain saved.')}</p><button type="button" class="soft-btn" data-recovery-copy="${index}">${L('Відкрити копію для виправлення', 'Open editable copy')}</button>` : ''}</section>`,
        )
        .join(
          '',
        )}<p id="recovery-status" role="status">${pending.some(({ record }) => !record.backedUp) ? backupFailure : L('Локальна резервна копія перевірена. Після продовження вона залишиться доступною для відновлення.', 'The local recovery copy is verified. It will be retained after you continue.')}</p><div class="modal-actions"><button type="button" id="recovery-continue" class="primary-btn">${L('Продовжити роботу', 'Continue working')}</button></div>`,
    );
    $$('[data-recovery-download]').forEach((button) => {
      button.onclick = () => {
        const entry = pending[Number(button.dataset.recoveryDownload)];
        downloadFile(entry.record.raw, entry.filename);
      };
    });
    $$('[data-recovery-copy]').forEach((button) => {
      button.onclick = () => {
        if (services.classroom && !services.classroom.allowEdit()) return;
        const entry = pending[Number(button.dataset.recoveryCopy)];
        const copy = recoverProjectCopy(entry.record.raw);
        if (!copy || !entry.record.backedUp || !entry.acknowledge?.(entry.record.raw)) return;
        actions.replaceProject(copy.project);
        saveProject(copy.project);
        services.dialogs.close();
        if (entries().length) open();
        else
          actions.notify(
            L(
              'Копію відкрито. Перепідключіть серво до цифрових імпульсів PWM.',
              'Copy opened. Reconnect servos to digital PWM pulses.',
            ),
          );
      };
    });
    $('#recovery-continue').onclick = () => {
      if (includeHandled && !entries().length) {
        services.dialogs.close();
        return;
      }
      for (const entry of entries()) {
        if (!entry.record.backedUp || !entry.acknowledge?.(entry.record.raw)) {
          $('#recovery-status').textContent = backupFailure;
          return;
        }
      }
      // Handling an older pending copy can reveal another original that still needs attention.
      if (entries().length) {
        open();
        return;
      }
      if (!saveProject(services.classroom.projectToSave?.() || state.project)) {
        $('#recovery-status').textContent = backupFailure;
        return;
      }
      services.dialogs.close();
      actions.notify(
        L(
          'Роботу можна продовжувати. Оригінальна резервна копія збережена.',
          'You can continue working. The original recovery copy is retained.',
        ),
      );
    };
    return true;
  }
  function mount() {
    const menu = $('.file-menu-panel');
    if (!menu || $('#saved-originals') || !entries(true).length) return;
    const button = document.createElement('button');
    button.id = 'saved-originals';
    button.type = 'button';
    button.className = 'file-menu-item';
    button.textContent = L('Збережені оригінали', 'Saved originals');
    button.onclick = () => open(true);
    menu.append(button);
  }
  return { open, mount };
}
