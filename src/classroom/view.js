import { getDefinition } from '../catalog.js';
import { SOURCE_PARAMETERS } from '../action-sequence.js';
import { esc, format } from '../ui-utils.js';
import { createReviewView } from './review-view.js';

const sourceTypes = new Set(Object.keys(SOURCE_PARAMETERS));

export function createClassroomView({ state, language, project, example }) {
  const {
    mode,
    student,
    assignment,
    teacherKey,
    referenceWarnings,
    issued,
    attempt,
    sequence,
    observations,
    recording,
    player,
    playbackRunning,
    busy,
    notes,
    teacherForm,
    batch,
  } = state;
  const adapter = {
    getLanguage: () => language,
    getProject: () => project,
    getExample: () => example,
  };
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const isLocked = () => recording || !!player || busy;
  const { reviewMarkup } = createReviewView({ state, language });
  function button(id, label, disabled = false, primary = false) {
    return `<button type="button" id="${id}" class="${primary ? 'primary-btn' : 'soft-btn'}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
  }
  function dockMarkup() {
    return `<div class="action-session-title"><button id="classroom-open" class="text-btn">${L('Сценарій дій', 'Action sequence')}</button><span id="action-status" role="status" aria-live="off"></span></div><div class="action-session-buttons">${button('action-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || busy, recording)}${button('action-replay', L('Відтворити', 'Replay'), !sequence || recording || !!player || busy)}${button('action-next', L('Наступна дія', 'Next action'), !sequence || recording || playbackRunning || busy)}${button('action-pause', playbackRunning ? L('Пауза сценарію', 'Pause replay') : L('Продовжити', 'Resume replay'), !player || player.done || busy)}${button('action-stop', L('Зупинити', 'Stop'), !player)}<button id="action-hide" class="soft-btn" aria-label="${L('Сховати панель сценарію', 'Hide action panel')}" title="${L('Сховати панель сценарію', 'Hide action panel')}" ${recording || player || busy ? 'disabled' : ''}>×</button></div>`;
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
    const probes = sequence.probes
      .map((probe, index) => ({ ...probe, index }))
      .filter((probe) => !sourceTypes.has(nodes.get(probe.node)?.type))
      .slice(0, 8);
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
    return `<section class="classroom-section"><h3>${L('Запис і відтворення входів', 'Record and replay inputs')}</h3><p>${L('Запис зберігає початкову схему, порядок дій та час симуляції. SER, CLK і RST перемикайте на схемі. Навіть дії в одну мить відтворюються в записаному порядку.', 'A sequence stores the initial circuit, action order and simulation times. Toggle SER, CLK and RST on the canvas. Actions at the same time retain their order.')}</p><div class="classroom-actions">${button('class-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || busy, true)}${button('class-replay', L('Відтворити на схемі', 'Replay on canvas'), !sequence || recording || busy)}${button('class-next', L('Дія за дією', 'Step through actions'), !sequence || recording || busy)}${button('class-sequence-import', L('Відкрити сценарій', 'Open sequence'), isLocked())}${button('class-sequence-export', L('Зберегти сценарій', 'Save sequence'), !sequence || recording || busy)}${preset ? button('class-preset', L('Навчальний сценарій прикладу', 'Example action sequence'), isLocked()) : ''}</div>${actionTable()}</section>`;
  }

  function identityFields() {
    return `<div class="classroom-fields"><label>${L('Ім’я та прізвище', 'Student name')}<input id="student-name" maxlength="200" value="${esc(student.name)}" autocomplete="name"></label><label>${L('Ідентифікатор студента', 'Student ID')}<input id="student-id" maxlength="100" value="${esc(student.id)}"></label><label>${L('Група', 'Group')}<input id="student-group" maxlength="100" value="${esc(student.group)}"></label></div>`;
  }

  function studentPanel() {
    return `<section class="classroom-section"><h3>${L('Виконання лабораторної', 'Complete a laboratory')}</h3>${identityFields()}<div class="classroom-actions">${button('student-task-import', L('Відкрити завдання викладача', 'Open instructor assignment'), isLocked(), true)}${button('student-start', L('Почати нову спробу', 'Start a new attempt'), !assignment || isLocked())}</div>${assignment ? `<article class="classroom-task"><span class="eyebrow">${L('Ваш варіант', 'Your variant')} · ${esc(assignment.variant.id)}</span><h4>${esc(assignment.title)}</h4><p class="preserve-lines">${esc(assignment.instructions)}</p><p>${L('Призначено для', 'Assigned to')}: <strong>${esc(assignment.variant.studentId || '—')}</strong></p><p>${L('Початкові значення входів', 'Initial input values')}: ${variantSourceMarkup(assignment)}</p>${attempt ? `<p class="classroom-attempt">${L('Спроба', 'Attempt')}: ${esc(attempt.id)} · ${attempt.journal.length} ${L('змістовних змін схеми', 'semantic circuit edits')}</p>` : `<p>${L('Натисніть «Почати нову спробу»: схема викладача відкриється без готових з’єднань.', 'Start a new attempt to open the instructor starter without completed wiring.')}</p>`}</article>` : `<p class="classroom-empty">${L('Для звичайного тренування завдання не потрібне: запишіть сценарій й експортуйте його. Для здачі з варіантом відкрийте файл завдання від викладача.', 'Practice without an assignment by recording and exporting a sequence. To submit an individual variant, open your instructor’s assignment file.')}</p>`}<label class="classroom-notes">${L('Пояснення результату', 'Explain your result')}<textarea id="student-notes" rows="3" maxlength="10000" placeholder="${L('Що перевіряли, чому отримали такий результат?', 'What did you test, and why did the circuit produce this result?')}">${esc(notes)}</textarea></label><div class="classroom-actions">${button('student-submit', L('Зберегти роботу для викладача', 'Export work for instructor'), !assignment || !attempt || !sequence || isLocked(), true)}</div><p class="classroom-hint">${L('У файл роботи входять схема, сценарій входів, повторно обчислені результати, пояснення й журнал побудови. Просте пересування елементів не додає записів до журналу.', 'The work file includes the circuit, input sequence, recomputed results, explanation and construction journal. Moving components alone adds no construction evidence.')}</p></section>`;
  }

  function possibleProbes() {
    const circuit = sequence?.initialProject || adapter.getProject();
    return circuit.nodes
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
  }

  function teacherPanel() {
    const probes = possibleProbes();
    const warnings = [];
    if (referenceWarnings.constant)
      warnings.push(
        L(
          'Слабка перевірка: жоден обраний вихід не змінюється. Додайте різні входи, запис/читання та скидання.',
          'Weak test: none of the selected outputs changes. Add varied inputs, writes/reads and resets.',
        ),
      );
    if (referenceWarnings.undefined)
      warnings.push(
        L(
          'Еталон містить невідомі чи непідключені контрольні сигнали. Усуньте їх перед видачею завдання.',
          'The reference contains unknown or floating observed signals. Resolve them before issuing the task.',
        ),
      );
    return `<section class="classroom-section"><h3>${L('Підготовка завдання', 'Prepare an assignment')}</h3><p>${L('Побудуйте еталонну схему й запишіть перевірочний сценарій. У студентський файл потраплять умова, індивідуальні початкові значення та заготовка. Еталон і перевірочні дії залишаться лише у ключі викладача.', 'Build the reference circuit and record a test sequence. Student files contain instructions, individual initial values and a starter. The reference circuit and test actions remain in the instructor key.')}</p><div class="classroom-fields"><label>${L('Назва роботи', 'Assignment title')}<input id="task-title" maxlength="200" value="${esc(teacherForm.title || adapter.getProject().name)}"></label><label>${L('Заготовка студента', 'Student starter')}<select id="task-starter"><option value="interfaces" ${teacherForm.starterMode === 'interfaces' ? 'selected' : ''}>${L('Лише входи та контрольні виходи', 'Inputs and observed outputs only')}</option><option value="components" ${teacherForm.starterMode === 'components' ? 'selected' : ''}>${L('Усі елементи без з’єднань', 'All components without wiring')}</option></select></label></div><label>${L('Умова та критерії', 'Instructions and criteria')}<textarea id="task-instructions" rows="3" maxlength="10000">${esc(teacherForm.instructions)}</textarea></label><p class="classroom-hint">${L('Якщо обрати внутрішній регістр чи пам’ять для спостереження, цей елемент залишиться в заготовці. Для самостійного вибору елементів обирайте зовнішні індикатори чи осцилографи.', 'If an internal register or memory is observed, it remains in the starter. Choose external indicators or scopes when students should choose the internal components themselves.')}</p><fieldset class="classroom-probes"><legend>${L('Що перевіряти', 'Observed signals')} <small>≤32</small></legend>${probes.map((probe, index) => `<label><input type="checkbox" data-task-probe="${index}" ${teacherForm.probes === null ? (index < 8 ? 'checked' : '') : teacherForm.probes.includes(`${probe.node}:${probe.side}:${probe.port}`) ? 'checked' : ''}>${esc(probe.label)}</label>`).join('') || `<p>${L('Додайте до схеми регістр, пам’ять чи індикатор.', 'Add a register, memory or indicator to the circuit.')}</p>`}</fieldset><div class="classroom-actions">${button('teacher-create', L('Створити ключ з еталона', 'Create reference key'), !sequence?.actions.length || isLocked(), true)}${button('teacher-key-import', L('Відкрити ключ викладача', 'Open instructor key'), busy)}${button('teacher-key-export', L('Зберегти ключ викладача', 'Save instructor key'), !teacherKey || busy)}</div>${warnings.map((message) => `<p class="classroom-error">${esc(message)}</p>`).join('')}${teacherKey ? `<div class="classroom-task"><h4>${esc(teacherKey.title)}</h4><p>${L('Ключ викладача містить розв’язання. Передавайте студентам лише окремі файли варіантів нижче.', 'The instructor key contains the solution. Give students only the individual variant files below.')}</p><label>${L('Ідентифікатори студентів, по одному в рядку', 'Student IDs, one per line')}<textarea id="issue-students" rows="3" placeholder="student-01&#10;student-02">${esc(teacherForm.studentIds)}</textarea></label><div class="classroom-actions">${button('teacher-issue', L('Сформувати варіанти', 'Generate variants'), busy, true)}</div>${issued.length ? `<ul class="issued-assignments">${issued.map((task, index) => `<li><span>${esc(task.variant.studentId)} · ${esc(task.variant.id)}</span><button type="button" class="soft-btn" data-task-download="${index}">${L('Файл студента', 'Student file')}</button></li>`).join('')}</ul><p class="classroom-hint">${L('Після видачі варіантів збережіть оновлений ключ викладача: він містить перелік виданих варіантів.', 'Save the updated instructor key after issuing variants: it contains the issued variant registry.')}</p>` : ''}</div>` : ''}</section><section class="classroom-section"><h3>${L('Перевірка робіт', 'Review submissions')}</h3><p>${L('Завантажте свій ключ і до 40 робіт. Кожна схема повторно запускається зі студентським та прихованим перевірочним сценарієм. Результати з файлу не приймаються на віру.', 'Load your key and up to 40 work files. Each circuit is rerun with the student sequence and instructor test. Claimed results are not trusted.')}</p><div class="classroom-actions">${button('teacher-review', busy ? L('Перевірка…', 'Checking…') : L('Завантажити роботи', 'Load submissions'), !teacherKey || busy, true)}${button('teacher-report', L('Зберегти звіт', 'Save report'), !batch.length || busy)}</div><div id="review-results" aria-live="polite">${reviewMarkup()}</div></section>`;
  }

  function variantSourceMarkup(task) {
    const values = task.variant.sourceValues;
    if (!values.length)
      return L('визначаються умовою та сценарієм', 'defined by the instructions and sequence');
    return values
      .map((source) => {
        const node = task.starterProject.nodes.find((candidate) => candidate.id === source.node);
        const definition = node && getDefinition(node.type);
        const label =
          node?.label ||
          (adapter.getLanguage() === 'ua' ? definition?.ua : definition?.label) ||
          source.node;
        return `<span>${esc(label)}: <strong>${esc(format(source.value))}</strong></span>`;
      })
      .join(' · ');
  }

  function mainMarkup(tab = mode) {
    const tabs = [
      ['student', L('Студент', 'Student')],
      ['teacher', L('Викладач', 'Instructor')],
      ['sequence', L('Сценарій дій', 'Action sequence')],
    ];
    return `<span class="eyebrow">LOGIC LAB · ${L('НАВЧАННЯ', 'LEARNING')}</span><h2>${L('Лабораторні роботи', 'Classroom')}</h2><div class="classroom-tabs" role="tablist" aria-label="${L('Навчальні режими', 'Classroom modes')}">${tabs.map(([id, label]) => `<button type="button" role="tab" id="class-tab-${id}" data-class-tab="${id}" aria-controls="class-panel-${id}" tabindex="${tab === id ? 0 : -1}" aria-selected="${tab === id}">${label}</button>`).join('')}</div><div id="class-panel-${tab}" class="classroom-content" role="tabpanel" aria-labelledby="class-tab-${tab}">${tab === 'sequence' ? sequencePanel() : tab === 'teacher' ? teacherPanel() : studentPanel()}</div><p class="classroom-trust-note">${L('Це локальна навчальна перевірка без облікових записів. Контрольна сума перевіряє цілісність файлу, але не підтверджує авторство. Збіги структури чи дій — привід обговорити роботу, а не доказ списування.', 'This is a local classroom workflow without accounts. A checksum checks file integrity, not authorship. Matching structures or actions warrant discussion, not an automatic accusation.')}</p>`;
  }
  return { mainMarkup, dockMarkup, reviewMarkup, possibleProbes };
}
