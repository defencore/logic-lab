import { $, esc } from '../shared/ui.js';
import { serializeSequence } from '../experiments/actions.js';
import { sequenceWork, workLimitMessage } from '../experiments/replay-work-policy.js';
import { cleanName, downloadFile } from './files.js';

export function createSequenceTrim({ adapter, state, session, L, guardIdle, operations }) {
  return function openTrim() {
    guardIdle();
    if (!state.sequence || state.recording || state.player || state.preview)
      throw new Error(
        L(
          'Завершіть запис або перегляд перед скороченням.',
          'Finish recording or replay before shortening it.',
        ),
      );
    const original = state.sequence;
    const report = sequenceWork(original);
    const last = original.actions.at(-1)?.at || 0;
    const recommended = Math.max(
      0,
      Math.floor(Math.min(last + 0.1, report.maxDuration, original.duration - 0.001) * 1000) / 1000,
    );
    adapter.showModal(
      `<h2>${L('Скоротити запис досліду', 'Shorten the recorded experiment')}</h2><p>${L('Залишиться початок запису до обраного часу. Усі дії на цій часовій позначці зберігаються у своєму порядку. Пізніші дії буде вилучено.', 'Keep the beginning through the chosen time. All actions at that timestamp retain their order. Later actions will be removed.')}</p><p>${esc(workLimitMessage(report, adapter.getLanguage()))}</p><p>${L('Початкова схема, контрольні сигнали та журнал побудови зберігаються. Результати скороченого досліду обчисляться заново.', 'The initial circuit, observed signals and construction journal are preserved. Results will be recalculated for the shortened experiment.')}</p><label>${L('Залишити від початку, секунд симуляції', 'Keep from the start, simulation seconds')}<input id="sequence-trim-until" type="number" min="0" max="${original.duration}" step="any" value="${recommended}"></label><p id="sequence-trim-preview" role="status"></p><div class="modal-actions"><button type="button" id="sequence-trim-copy" class="soft-btn">${L('Зберегти початковий запис', 'Save the original recording')}</button><button type="button" id="sequence-trim-cancel" class="soft-btn">${L('Скасувати', 'Cancel')}</button><button type="button" id="sequence-trim-apply" class="primary-btn">${L('Застосувати скорочення', 'Apply shorter recording')}</button></div>`,
      true,
    );
    const input = $('#sequence-trim-until');
    let controller = null,
      working = false,
      closed = false;
    const cancel = () => {
      closed = true;
      controller?.abort();
      adapter.closeModal();
    };
    const dialog = $('.modal');
    if ($('#close-modal')) $('#close-modal').onclick = cancel;
    if ($('.modal-backdrop'))
      $('.modal-backdrop').onclick = (event) => {
        if (event.target === event.currentTarget) cancel();
      };
    if (dialog)
      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        cancel();
      });
    function preview() {
      const cutoff = input.value === '' ? NaN : Number(input.value);
      const actions = original.actions.filter((action) => action.at <= cutoff);
      const valid =
        Number.isFinite(cutoff) && cutoff >= 0 && cutoff < original.duration && actions.length > 0;
      const info = valid ? sequenceWork({ ...original, actions, duration: cutoff }) : null;
      $('#sequence-trim-apply').disabled =
        working || !valid || (!info.supported && !info.requiresVerification);
      $('#sequence-trim-preview').textContent = !valid
        ? L(
            'Оберіть менший час, що залишає хоча б одну дію.',
            'Choose a shorter time that retains at least one action.',
          )
        : `${L('Залишиться', 'Keep')} ${actions.length}/${original.actions.length} ${L('дій', 'actions')} · ${cutoff.toFixed(3)} ${L('с', 's')}. ${L('Буде вилучено', 'Remove')} ${original.actions.length - actions.length}. ${info.supported ? L('Скорочений запис придатний для перевірки.', 'The shorter recording can be checked.') : info.requiresVerification ? L('Придатність буде перевірено перед збереженням скорочення.', 'Processing limits will be checked before the shorter recording is saved.') : workLimitMessage(info, adapter.getLanguage())}`;
      return cutoff;
    }
    input.oninput = preview;
    $('#sequence-trim-copy').onclick = () =>
      downloadFile(
        serializeSequence(original),
        `${cleanName(original.initialProject.name)}.original.actions.json`,
      );
    $('#sequence-trim-cancel').onclick = cancel;
    $('#sequence-trim-apply').onclick = async () => {
      const cutoff = preview();
      if ($('#sequence-trim-apply').disabled) return;
      try {
        guardIdle();
        controller = new AbortController();
        working = true;
        input.disabled = true;
        $('#sequence-trim-copy').disabled = true;
        $('#sequence-trim-apply').disabled = true;
        $('#sequence-trim-preview').textContent = L(
          'Обчислюються результати скороченого запису…',
          'Calculating results for the shorter recording…',
        );
        await operations.run(async () => {
          const result = await session.trimRecording(cutoff, { signal: controller.signal });
          if (controller.signal.aborted || closed) return;
          closed = true;
          adapter.closeModal();
          adapter.notify(
            L(
              `Запис скорочено до ${result.duration.toFixed(3)} с. Вилучено дій: ${result.removedActions}.`,
              `Recording shortened to ${result.duration.toFixed(3)} s. Removed actions: ${result.removedActions}.`,
            ),
          );
        });
      } catch (error) {
        if (error.name !== 'AbortError') adapter.notify(error.message);
      } finally {
        working = false;
        if (!closed && $('#sequence-trim-until') === input) {
          input.disabled = false;
          $('#sequence-trim-copy').disabled = false;
          preview();
        }
      }
    };
    preview();
  };
}
