import { previousVersionMessage } from './sequence-version.js';
import { referenceReviewPosition } from './review-position.js';
import { getDefinition } from '../components/catalog/index.js';
import { SOURCE_PARAMETERS } from '../experiments/actions.js';
import { esc, format } from '../shared/ui.js';
import { createReviewView } from './review-view.js';
import { createTeacherView } from './teacher-view.js';
import { studentPanel as renderStudentPanel } from './student-view.js';
import { sequenceSignature, teacherStatus } from './teacher-state.js';
import { describeProbeChoices } from './probe-picker.js';
import { hasProbe, probeId } from '../experiments/probes.js';
import { recordingInputHint } from '../learning/recording-hints.js';
import { sequenceWork, workLimitMessage } from '../experiments/replay-work-policy.js';

const sourceTypes = new Set(Object.keys(SOURCE_PARAMETERS));

export function createClassroomView({ state, language, project, example }) {
  const { mode, teacherKey, sequence, observations, recording, player, playbackRunning, busy } =
    state;
  const adapter = {
    getLanguage: () => language,
    getProject: () => project,
    getExample: () => example,
  };
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const previous = !!state.sequenceVersion?.previous && !state.reviewMode && !recording;
  const previousWarning = previous
    ? `<p class="previous-recording-warning" role="note">${esc(previousVersionMessage(state.sequenceVersion, language))}</p>`
    : '';
  const completed = !!player?.done;
  const replayLabel = previous
    ? completed
      ? L('Почати попередній запис спочатку', 'Restart previous recording')
      : L('Переглянути попередній запис', 'View previous recording')
    : completed
      ? L('Почати запис спочатку', 'Restart recording')
      : L('Відтворити', 'Replay');
  const replayDisabled =
    !sequence || recording || !!state.preview || (!!player && !completed) || busy;
  const nextDisabled =
    !sequence || recording || !!state.preview || playbackRunning || completed || busy;
  const reviewedRecording = ['check', 'replay'].includes(state.reviewMode);
  const reviewRestartLabel =
    completed && reviewedRecording
      ? state.reviewMode === 'check'
        ? L('Почати перевірку спочатку', 'Restart reference check')
        : L('Почати запис спочатку', 'Restart student recording')
      : null;
  const isLocked = () => recording || !!player || !!state.preview || busy;
  const { reviewMarkup, cardsMarkup } = createReviewView({ state, language });
  const teacherView = createTeacherView({ state, language, project, possibleProbes, reviewMarkup });
  function button(id, label, disabled = false, primary = false) {
    return `<button type="button" id="${id}" class="${primary ? 'primary-btn' : 'soft-btn'}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
  }
  function reviewTitle() {
    if (state.reviewMode === 'reference')
      return `${L('Еталон ключа', 'Key reference')}: ${state.preview.label} · ${L('лише читання', 'read only')}`;
    if (state.reviewMode === 'check')
      return `${L('Еталонна перевірка на схемі студента', 'Instructor reference check on the student circuit')}: ${state.reviewCheck.label} · ${L('Обрана розбіжність', 'Selected difference')}: ${referenceReviewPosition(state.reviewCheck.checkpoint.after, sequence.actions.length, language)} · ${L('лише читання', 'read only')}`;
    return L('Перегляд роботи студента · лише читання', 'Student work preview · read only');
  }
  function dockMarkup() {
    if (state.reviewMode === 'demo') {
      const title = L('Демонстрація прикладу · 1×', 'Example demonstration · 1×');
      return `<div class="action-session-title"><strong>${title}</strong><span id="action-status" role="status" aria-live="off"></span></div>
        <div class="action-session-buttons">
        ${
          completed
            ? button('action-replay', L('Повторити демо', 'Replay demo'))
            : button(
                'action-pause',
                playbackRunning
                  ? L('Пауза демо', 'Pause demo')
                  : L('Продовжити демо', 'Resume demo'),
              )
        }
        ${button('action-stop', L('Повернутися до своєї схеми', 'Return to my circuit'))}</div>`;
    }
    if (state.reviewMode) {
      return `<div class="action-session-title"><strong title="${esc(reviewTitle())}">${esc(reviewTitle())}</strong><span id="action-status" role="status"></span></div><div class="action-session-buttons">${button('classroom-open', L('Повернутися до перевірки', 'Return to review'))}${button('action-record', L('Запис недоступний під час перегляду', 'Recording unavailable during preview'), true)}${button('action-replay', reviewRestartLabel || L('Відтворити', 'Replay'), !reviewedRecording || !completed || recording || playbackRunning || busy)}${button('action-next', L('Наступна записана дія', 'Next recorded action'), !player || completed || playbackRunning || busy)}${button('action-pause', playbackRunning ? L('Пауза сценарію', 'Pause replay') : L('Продовжити', 'Resume replay'), !player || player.done || busy)}${button('action-stop', L('Завершити перегляд і повернути свою схему', 'End preview and restore my circuit'))}<button id="action-hide" hidden disabled></button></div>`;
    }
    return `<div class="action-session-title"><button id="classroom-open" class="text-btn">${L('Сценарій дій', 'Action sequence')}</button><span id="action-status" role="status" aria-live="off"></span></div><div class="action-session-buttons">${button('action-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || !!state.preview || busy, recording)}${button('action-replay', replayLabel, replayDisabled)}${button('action-next', L('Наступна записана дія', 'Next recorded action'), nextDisabled)}${button('action-pause', playbackRunning ? L('Пауза сценарію', 'Pause replay') : L('Продовжити', 'Resume replay'), !player || player.done || busy)}${button('action-stop', L('Зупинити', 'Stop'), !player)}<button id="action-hide" class="soft-btn" aria-label="${L('Сховати панель сценарію', 'Hide action panel')}" title="${L('Сховати панель сценарію', 'Hide action panel')}" ${recording || player || busy ? 'disabled' : ''}>×</button></div>`;
  }

  function actionTable() {
    if (!sequence)
      return `<p class="classroom-empty">${esc(recordingInputHint(project, language))}</p>`;
    const nodes = new Map(sequence.initialProject.nodes.map((node) => [node.id, node]));
    return `<div class="classroom-table-scroll"><table class="classroom-table"><thead><tr><th>#</th><th>${L('Час, с', 'Time, s')}</th><th>${L('Вхід', 'Input')}</th><th>${L('Значення', 'Value')}</th></tr></thead><tbody>${sequence.actions
      .slice(0, 300)
      .map(
        (action, index) =>
          `<tr><td>${index + 1}</td><td>${action.at.toFixed(3)}</td><td>${esc(action.op === 'reset' ? L('Скидання', 'Reset') : `${nodes.get(action.node)?.label || action.node} · ${action.key}`)}</td><td>${esc(action.op === 'reset' ? '—' : format(action.value))}</td></tr>`,
      )
      .join(
        '',
      )}</tbody></table></div>${sequence.actions.length > 300 ? `<p>${L('Показано перші 300 дій; у файлі збережено всі.', 'Showing the first 300 actions; the file contains all actions.')}</p>` : ''}${observationTable()}`;
  }

  function observationTable() {
    if (!observations.length) return '';
    const nodes = new Map(sequence.initialProject.nodes.map((node) => [node.id, node]));
    const probes = sequence.probes.map((probe, index) => ({ ...probe, index }));
    if (!probes.length) return '';
    return `<h4>${L('Результати після кожної дії', 'Results after each action')}</h4><div class="classroom-table-scroll"><table class="classroom-table"><thead><tr><th>${L('Дія', 'Action')}</th>${probes.map((probe) => `<th>${esc(nodes.get(probe.node)?.label || probe.node)} · ${esc(probe.port)}</th>`).join('')}</tr></thead><tbody>${observations
      .slice(0, 300)
      .map(
        (observation) =>
          `<tr><td>${observation.after < 0 ? L('Початковий стан', 'Initial state') : observation.after + 1}</td>${probes.map((probe) => `<td>${esc(format(observation.values[probe.index]))}</td>`).join('')}</tr>`,
      )
      .join('')}</tbody></table></div>`;
  }

  function sequencePanel() {
    const preset = adapter.getExample()?.actionPreset;
    const work = sequence && !recording ? sequenceWork(sequence) : null;
    return `<section class="classroom-section"><h3>${L('Запис і відтворення входів', 'Record and replay inputs')}</h3>${previousWarning}<p>${esc(recordingInputHint(project, language))}</p>${work ? `<p class="classroom-hint" role="status">${esc(workLimitMessage(work, language))}</p>` : ''}<div class="classroom-actions">${button('class-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || !!state.preview || busy, true)}${button('class-replay', reviewRestartLabel || (previous || completed ? replayLabel : L('Відтворити на схемі', 'Replay on canvas')), replayDisabled)}${button('class-next', L('Наступна записана дія', 'Next recorded action'), nextDisabled)}${button('class-sequence-import', L('Відкрити сценарій', 'Open sequence'), isLocked())}${button('class-sequence-export', L('Зберегти сценарій', 'Save sequence'), !sequence || recording || !!state.preview || busy)}${button('class-sequence-trim', L('Скоротити запис', 'Shorten recording'), !sequence || isLocked())}${work?.requiresVerification && !work.verified ? button('class-sequence-verify', L('Перевірити запис', 'Verify recording'), !sequence || isLocked()) : ''}${preset ? button('class-preset', L('Навчальний сценарій прикладу', 'Example action sequence'), isLocked()) : ''}</div>${actionTable()}</section>`;
  }

  function possibleProbes() {
    const useKey =
      teacherKey &&
      (sequenceSignature(sequence) === state.teacherSequenceBaseline ||
        teacherStatus(state, project).usingSavedReference);
    const circuit = useKey
      ? teacherKey.referenceProject
      : sequence?.initialProject || adapter.getProject();
    const choices = circuit.nodes
      .filter(
        (node) =>
          !sourceTypes.has(node.type) && !['note', 'group', 'vcc', 'gnd'].includes(node.type),
      )
      .flatMap((node) => {
        const definition = getDefinition(node.type);
        const side = definition.signals.outputs.length ? 'outputs' : 'inputs';
        return definition.signals[side].map((port) => ({
          node: node.id,
          port: port.id,
          side,
          label: `${node.label || node.id} · ${port.label || port.id}`,
        }));
      });
    const ids = new Set(choices.map(probeId));
    const retained = [
      ...(useKey ? teacherKey.probes || [] : sequence?.probes || []),
      ...(state.teacherForm.probes || []).map((id) => {
        const [node, side, port] = id.split(':');
        return { node, side, port };
      }),
    ];
    for (const probe of retained) {
      if (ids.has(probeId(probe))) continue;
      choices.push({ ...probe, missing: !hasProbe(circuit, probe) });
      ids.add(probeId(probe));
    }
    return describeProbeChoices(circuit, choices, language);
  }

  function mainMarkup(tab = mode) {
    const tabs = [
      ['student', L('Студент', 'Student')],
      ['teacher', L('Викладач', 'Instructor')],
      ['sequence', L('Сценарій дій', 'Action sequence')],
    ];
    return `<span class="eyebrow">LOGIC LAB · ${L('НАВЧАННЯ', 'LEARNING')}</span><h2>${L('Лабораторні роботи', 'Classroom')}</h2><div class="classroom-tabs" role="tablist" aria-label="${L('Навчальні режими', 'Classroom modes')}">${tabs.map(([id, label]) => `<button type="button" role="tab" id="class-tab-${id}" data-class-tab="${id}" aria-controls="class-panel-${id}" tabindex="${tab === id ? 0 : -1}" aria-selected="${tab === id}">${label}</button>`).join('')}</div><div id="class-panel-${tab}" class="classroom-content" role="tabpanel" aria-labelledby="class-tab-${tab}">${tab === 'sequence' ? sequencePanel() : tab === 'teacher' ? teacherView.teacherPanel() : renderStudentPanel({ state, language, project })}</div><p class="classroom-trust-note">${L('Це локальна навчальна перевірка без облікових записів. Контрольна сума перевіряє цілісність файлу, але не підтверджує авторство. Збіги структури чи дій — привід обговорити роботу, а не доказ списування.', 'This is a local classroom workflow without accounts. A checksum checks file integrity, not authorship. Matching structures or actions warrant discussion, not an automatic accusation.')}</p>`;
  }
  return {
    mainMarkup,
    dockMarkup,
    reviewMarkup,
    reviewCardsMarkup: cardsMarkup,
    possibleProbes,
    starterPreviewMarkup: teacherView.starterPreviewMarkup,
    teacherStatusMarkup: teacherView.editStatusMarkup,
  };
}
