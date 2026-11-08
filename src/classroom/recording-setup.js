import { $, esc } from '../shared/ui.js';
import { recordingProbeOptions, probeId } from '../experiments/probes.js';
import { recordingWorkLimit, workLimitMessage } from '../experiments/replay-work-policy.js';
import {
  bindProbePicker,
  describeProbeChoices,
  probePickerMarkup,
  probeCriteriaMessage,
} from './probe-picker.js';

export function createRecordingSetup({ adapter, state, session, L, begin, guardIdle }) {
  return function openRecordingSetup() {
    guardIdle();
    const project = session.projectToSave();
    const language = adapter.getLanguage();
    const options = recordingProbeOptions(project, {
      assignment: state.assignment,
      example: adapter.getExample?.(),
    });
    const choices = describeProbeChoices(project, options.choices, language);
    const selected = options.recommended.map(probeId);
    const pickerOptions = { choices, selected, language, prefix: 'recording' };
    adapter.showModal(
      `<h2>${L('Що спостерігати під час запису?', 'What should the recording observe?')}</h2><p>${L('Дії на входах записуються автоматично. Оберіть сигнали для порівняння результатів до й після кожної дії.', 'Input actions are recorded automatically. Choose signals to compare before and after each action.')}</p>${options.preferred.length ? `<p class="classroom-hint">${state.assignment ? L('Рекомендовано контрольні сигнали завдання.', 'The assignment’s observed signals are recommended.') : L('Рекомендовано контрольні сигнали навчального прикладу.', 'The learning example’s observed signals are recommended.')}</p>` : ''}<p id="recording-limit-hint" class="classroom-hint">${esc(workLimitMessage(recordingWorkLimit(project), language))}</p>${probePickerMarkup({ ...pickerOptions, marked: options.preferred.map(probeId), markedLabel: state.assignment ? L('(завдання)', '(assignment)') : undefined })}<div class="modal-actions"><button id="recording-cancel" class="soft-btn">${L('Скасувати', 'Cancel')}</button><button id="recording-begin" class="primary-btn">${L('Почати запис дій', 'Start recording actions')}</button></div>`,
      true,
    );
    const picker = bindProbePicker({
      ...pickerOptions,
      onCount: (count) => {
        $('#recording-begin').disabled = count < 1;
      },
    });
    $('#recording-cancel').onclick = adapter.closeModal;
    $('#recording-begin').onclick = () => {
      try {
        guardIdle();
        begin(picker.probes());
      } catch (error) {
        adapter.notify(probeCriteriaMessage(error, language));
      }
    };
  };
}
