import { esc, format } from '../shared/ui.js';
import { studentProgress, progressMessage } from './student-progress.js';

const labels = [
  ['Завдання', 'Task'],
  ['Побудова', 'Build'],
  ['Запис перевірки', 'Record test'],
  ['Пояснення', 'Explain'],
  ['Збереження', 'Save'],
];
function stepsMarkup(progress, L) {
  return `<ol class="student-steps">${labels.map(([ua, en], index) => `<li class="${progress.steps[index] ? 'is-complete' : ''}"><span aria-hidden="true">${progress.steps[index] ? '✓' : index + 1}</span>${L(ua, en)}<small class="sr-only">${progress.steps[index] ? L('Готово', 'Complete') : L('Ще не завершено', 'Not complete')}</small></li>`).join('')}</ol>`;
}
export function studentTask({ state, language }) {
  const task = state.assignment;
  const L = (ua, en) => (language === 'ua' ? ua : en);
  if (!task)
    return `<p>${L('Для здачі відкрийте завдання викладача. Для звичайного тренування можна записувати й зберігати сценарії без завдання.', 'Open your instructor assignment to submit work. For practice, record and export sequences without an assignment.')}</p>`;
  const values = task.variant.sourceValues
    .map((source) => {
      const node = task.starterProject.nodes.find((item) => item.id === source.node);
      return `${esc(node?.label || source.node)}: <strong>${esc(format(source.value))}</strong>`;
    })
    .join(' · ');
  return `<article class="classroom-task"><span class="eyebrow">${L('Ваш варіант', 'Your variant')} · ${esc(task.variant.id)}</span><h4>${esc(task.title)}</h4><p class="preserve-lines">${esc(task.instructions)}</p><p>${L('Призначено для', 'Assigned to')}: <strong>${esc(task.variant.studentId || '—')}</strong></p>${values ? `<p>${L('Початкові значення входів', 'Initial input values')}: ${values}</p>` : ''}</article>`;
}
export function studentPanel({ state, language, project }) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const progress = studentProgress(state, project, state.reviewMode ? { stale: false } : {});
  const locked = !!state.recording || !!state.player || !!state.preview || state.busy;
  const button = (id, label, disabled = false, primary = false) =>
    `<button type="button" id="${id}" class="${primary ? 'primary-btn' : 'soft-btn'}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  return `<section class="classroom-section student-panel"><h3>${L('Виконання лабораторної', 'Complete a laboratory')}</h3>${stepsMarkup(progress, L)}<p id="student-next-message" class="student-next-message" role="status">${esc(progressMessage(progress, language))}</p><div class="classroom-fields"><label>${L('Ім’я та прізвище', 'Student name')}<input id="student-name" maxlength="200" value="${esc(state.student.name)}" autocomplete="name" ${locked ? 'disabled' : ''}></label><label>${L('Ідентифікатор студента', 'Student ID')}<input id="student-id" maxlength="100" value="${esc(state.student.id)}" ${state.attempt ? 'readonly' : ''} ${locked ? 'disabled' : ''}></label><label>${L('Група', 'Group')}<input id="student-group" maxlength="100" value="${esc(state.student.group)}" ${locked ? 'disabled' : ''}></label></div><div class="classroom-actions">${button('student-task-import', L('Відкрити завдання викладача', 'Open instructor assignment'), locked)}${button('student-work-import', L('Відкрити мою роботу', 'Open my work'), locked)}${button('student-start', state.attempt ? L('Продовжити роботу', 'Continue work') : L('Почати спробу', 'Start attempt'), !state.assignment || locked, true)}${state.attempt ? button('student-restart', L('Почати заново…', 'Restart…'), locked) : ''}</div>${studentTask({ state, language })}${state.attempt ? `<p class="classroom-attempt">${L('Спроба', 'Attempt')}: ${esc(state.attempt.id)} · ${state.attempt.journal.length} ${L('змістовних змін схеми', 'semantic circuit edits')}</p>` : ''}<p id="student-stale" class="classroom-error" ${progress.stale ? '' : 'hidden'}>${L('Схему змінено після запису. Запишіть перевірку ще раз.', 'The circuit changed after recording. Record the test again.')}</p><div class="classroom-actions">${button('student-rerecord', progress.stale ? L('Записати перевірку ще раз', 'Record test again') : L('Записати перевірку', 'Record test'), !state.attempt || locked)}</div><label class="classroom-notes">${L('Пояснення результату', 'Explain your result')}<textarea id="student-notes" rows="4" maxlength="20000" ${locked ? 'disabled' : ''} placeholder="${L('Що перевіряли, який результат прогнозували, що побачили та чому?', 'What did you test and predict, what happened, and why?')}">${esc(state.notes)}</textarea></label><p id="student-export-reason" class="classroom-hint">${esc(progressMessage(progress, language))}</p><div class="classroom-actions">${button('student-save-draft', L('Зберегти чернетку для продовження', 'Save draft to continue later'), locked)}<button type="button" id="student-submit" class="primary-btn" aria-describedby="student-export-reason" ${progress.ready ? '' : 'disabled'}>${L('Зберегти роботу для викладача', 'Export work for instructor')}</button></div><p class="classroom-hint">${L('Чернетка зберігає незавершену роботу; її можна відкрити вдома. Файл для викладача містить схему, запис перевірки, результати, пояснення й справжній журнал побудови. Просте пересування не додає записів до журналу.', 'A draft preserves unfinished work and can be opened at home. The instructor file contains the circuit, recorded test, results, explanation and actual construction journal. Moving components alone adds no construction evidence.')}</p></section>`;
}
export function studentWorkflow({ state, language, progress }) {
  if (!state.assignment) return '';
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const locked = state.busy || state.recording || state.player || state.preview;
  const action =
    progress.code === 'recording'
      ? 'finish'
      : progress.code === 'playing'
        ? 'stop'
        : progress.code === 'stale' || progress.code === 'record'
          ? 'record'
          : progress.ready
            ? 'save'
            : 'continue';
  const next = {
    finish: L('Завершити запис дій', 'Finish recording actions'),
    stop: L('Зупинити відтворення', 'Stop replay'),
    record: progress.stale
      ? L('Записати перевірку ще раз', 'Record test again')
      : L('Записати перевірку', 'Record test'),
    save: L('Зберегти роботу', 'Save work'),
    continue:
      progress.code === 'explain'
        ? L('Додати пояснення', 'Add explanation')
        : L('Продовжити роботу', 'Continue work'),
  }[action];
  return `<div class="student-workflow-heading"><strong>${esc(state.assignment.title)}</strong><button type="button" class="text-btn" data-student-action="task">${L('Умова завдання', 'Assignment instructions')}</button></div>${stepsMarkup(progress, L)}<div class="student-workflow-next"><p class="student-next-message" role="status">${esc(progressMessage(progress, language))}</p><button type="button" class="primary-btn" data-student-action="${action}" ${state.busy ? 'disabled' : ''}>${next}</button>${progress.active && !locked && progress.code === 'build' ? `<button type="button" class="soft-btn" data-student-action="record">${L('Схема готова — записати перевірку', 'Circuit ready — record test')}</button>` : ''}</div><details data-student-condition><summary>${L('Переглянути умову та варіант', 'Show instructions and variant')}</summary>${studentTask({ state, language })}</details>`;
}
