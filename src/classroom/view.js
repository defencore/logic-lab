import { getDefinition } from '../components/catalog/index.js';
import { SOURCE_PARAMETERS } from '../experiments/actions.js';
import { esc, format } from '../shared/ui.js';
import { createReviewView } from './review-view.js';
import { createTeacherView } from './teacher-view.js';
import { studentPanel as renderStudentPanel } from './student-view.js';
import { sequenceSignature, teacherStatus } from './teacher-state.js';

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
  const isLocked = () => recording || !!player || !!state.preview || busy;
  const { reviewMarkup, cardsMarkup } = createReviewView({ state, language });
  const teacherView = createTeacherView({ state, language, project, possibleProbes, reviewMarkup });
  function button(id, label, disabled = false, primary = false) {
    return `<button type="button" id="${id}" class="${primary ? 'primary-btn' : 'soft-btn'}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
  }
  function dockMarkup() {
    if (state.reviewMode)
      return `<div class="action-session-title"><strong>${state.reviewMode === 'reference' ? `${L('Еталон ключа', 'Key reference')}: ${esc(state.preview.label)} · ${L('лише читання', 'read only')}` : L('Перегляд роботи студента · лише читання', 'Student work preview · read only')}</strong><span id="action-status" role="status"></span></div><div class="action-session-buttons">${button('classroom-open', L('Повернутися до перевірки', 'Return to review'))}${button('action-record', L('Запис недоступний під час перегляду', 'Recording unavailable during preview'), true)}${button('action-replay', L('Відтворити', 'Replay'), true)}${button('action-next', L('Наступна записана дія', 'Next recorded action'), !player || playbackRunning || busy)}${button('action-pause', playbackRunning ? L('Пауза сценарію', 'Pause replay') : L('Продовжити', 'Resume replay'), !player || player.done || busy)}${button('action-stop', L('Завершити перегляд і повернути свою схему', 'End preview and restore my circuit'))}<button id="action-hide" hidden disabled></button></div>`;
    return `<div class="action-session-title"><button id="classroom-open" class="text-btn">${L('Сценарій дій', 'Action sequence')}</button><span id="action-status" role="status" aria-live="off"></span></div><div class="action-session-buttons">${button('action-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || !!state.preview || busy, recording)}${button('action-replay', L('Відтворити', 'Replay'), !sequence || recording || !!player || busy)}${button('action-next', L('Наступна записана дія', 'Next recorded action'), !sequence || recording || playbackRunning || busy)}${button('action-pause', playbackRunning ? L('Пауза сценарію', 'Pause replay') : L('Продовжити', 'Resume replay'), !player || player.done || busy)}${button('action-stop', L('Зупинити', 'Stop'), !player)}<button id="action-hide" class="soft-btn" aria-label="${L('Сховати панель сценарію', 'Hide action panel')}" title="${L('Сховати панель сценарію', 'Hide action panel')}" ${recording || player || busy ? 'disabled' : ''}>×</button></div>`;
  }

  function actionTable() {
    if (!sequence)
      return `<p class="classroom-empty">${L('Запишіть зміни входів SER, CLK, RST чи значень адреси й даних. Відтворення починається з початкової схеми.', 'Record changes to SER, CLK, RST or address/data values. Replay starts from the initial circuit.')}</p>`;
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
    return `<section class="classroom-section"><h3>${L('Запис і відтворення входів', 'Record and replay inputs')}</h3><p>${L('Запис зберігає початкову схему, порядок дій та час симуляції. SER, CLK і RST перемикайте на схемі. Навіть дії в одну мить відтворюються в записаному порядку.', 'A sequence stores the initial circuit, action order and simulation times. Toggle SER, CLK and RST on the canvas. Actions at the same time retain their order.')}</p><div class="classroom-actions">${button('class-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || !!state.preview || busy, true)}${button('class-replay', L('Відтворити на схемі', 'Replay on canvas'), !sequence || recording || !!state.preview || busy)}${button('class-next', L('Наступна записана дія', 'Next recorded action'), !sequence || recording || !!state.preview || busy)}${button('class-sequence-import', L('Відкрити сценарій', 'Open sequence'), isLocked())}${button('class-sequence-export', L('Зберегти сценарій', 'Save sequence'), !sequence || recording || !!state.preview || busy)}${preset ? button('class-preset', L('Навчальний сценарій прикладу', 'Example action sequence'), isLocked()) : ''}</div>${actionTable()}</section>`;
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
      })
      .slice(0, 100);
    for (const probe of useKey ? teacherKey.probes || [] : []) {
      if (
        choices.some(
          (item) =>
            item.node === probe.node && item.port === probe.port && item.side === probe.side,
        )
      )
        continue;
      const node = teacherKey.referenceProject.nodes.find((item) => item.id === probe.node);
      if (node) choices.push({ ...probe, label: `${node.label || node.id} · ${probe.port}` });
    }
    return choices;
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
