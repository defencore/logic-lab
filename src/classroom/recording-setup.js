import { $, $$, esc } from '../shared/ui.js';
import { getDefinition } from '../components/catalog/index.js';
import { SEQUENCE_LIMITS } from '../experiments/actions.js';
import { availableProbes, recommendedProbes, probeId } from '../experiments/probes.js';

export function createRecordingSetup({ adapter, state, session, L, begin, guardIdle }) {
  return function openRecordingSetup() {
    guardIdle();
    const project = session.projectToSave();
    const choices = availableProbes(project);
    const recommended = recommendedProbes(project, state.assignment?.probes || []);
    const selected = new Set(recommended.map(probeId));
    const nodes = new Map(project.nodes.map((node) => [node.id, node]));
    const taskSignals = new Set((state.assignment?.probes || []).map(probeId));
    adapter.showModal(
      `<h2>${L('Що спостерігати під час запису?', 'What should the recording observe?')}</h2><p>${L('Дії на входах записуються автоматично. Оберіть сигнали для порівняння результатів до й після кожної дії.', 'Input actions are recorded automatically. Choose signals to compare before and after each action.')}</p>${taskSignals.size ? `<p class="classroom-hint">${L('Рекомендовано контрольні виходи завдання. Їх позначено нижче.', 'The assignment’s observed outputs are recommended and marked below.')}</p>` : ''}<fieldset class="classroom-probes recording-probes"><legend>${L('Сигнали спостереження', 'Observed signals')}</legend>${choices
        .map((probe, index) => {
          const node = nodes.get(probe.node),
            definition = getDefinition(node.type);
          const port = definition.signals[probe.side].find((port) => port.id === probe.port);
          return `<label><input type="checkbox" data-recording-probe="${index}" ${selected.has(probeId(probe)) ? 'checked' : ''}>${esc(node.label || (adapter.getLanguage() === 'ua' ? definition.ua : definition.label))} · ${esc(port.label || port.id)}${taskSignals.has(probeId(probe)) ? ` <strong>${L('(завдання)', '(assignment)')}</strong>` : ''}</label>`;
        })
        .join(
          '',
        )}</fieldset><p id="recording-probe-count" role="status"></p><div class="modal-actions"><button id="recording-cancel" class="soft-btn">${L('Скасувати', 'Cancel')}</button><button id="recording-begin" class="primary-btn">${L('Почати запис дій', 'Start recording actions')}</button></div>`,
      true,
    );
    const checked = () =>
      $$('[data-recording-probe]:checked').map(
        (input) => choices[Number(input.dataset.recordingProbe)],
      );
    const update = () => {
      const count = checked().length;
      $('#recording-probe-count').textContent =
        `${L('Обрано сигналів', 'Selected signals')}: ${count}/${SEQUENCE_LIMITS.probes}`;
      $('#recording-begin').disabled = count < 1 || count > SEQUENCE_LIMITS.probes;
    };
    $$('[data-recording-probe]').forEach((input) => {
      input.onchange = update;
    });
    $('#recording-cancel').onclick = adapter.closeModal;
    $('#recording-begin').onclick = () => {
      try {
        guardIdle();
        begin(checked());
      } catch (error) {
        adapter.notify(error.message);
      }
    };
    update();
  };
}
