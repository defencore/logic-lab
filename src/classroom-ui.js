import './classroom.css';
import { getDefinition } from './catalog.js';
import { $, $$, esc, format } from './ui-utils.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  parseSequence,
  serializeSequence,
  createPlayback,
  advancePlayback,
  stepPlayback,
  captureObservation,
} from './action-sequence.js';
import {
  createAssignment,
  issueAssignment,
  parseAssignment,
  serializeAssignment,
  parseAssignmentKey,
  serializeAssignmentKey,
  createAttempt,
  recordEdit,
  createSubmission,
  parseSubmission,
  serializeSubmission,
  validateAttempt,
  gradeSubmission,
  compareSubmissions,
} from './lab-assessment.js';

const sourceTypes = new Set(['switch', 'bus_input', 'clock', 'pwm', 'dc', 'sine', 'am', 'fm']);
const cleanName = (name) =>
  String(name)
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .slice(0, 100) || 'logic-lab';

function download(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readFile(file) {
  if (file.size > 20_000_000) throw new Error('File exceeds 20 MB.');
  return file.text();
}

function pickFiles(onFiles, multiple = false) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.multiple = multiple;
  input.hidden = true;
  document.body.append(input);
  input.addEventListener(
    'change',
    () => {
      const files = [...input.files];
      input.remove();
      if (files.length) onFiles(files);
    },
    { once: true },
  );
  input.addEventListener('cancel', () => input.remove(), { once: true });
  input.click();
}

export function createClassroom(adapter) {
  const L = (ua, en) => (adapter.getLanguage() === 'ua' ? ua : en);
  let mode = 'student';
  let student = { name: '', id: '', group: '' };
  let assignment = null;
  let teacherKey = null;
  let referenceWarnings = [];
  let issued = [];
  let attempt = null;
  let sequence = null;
  let observations = [];
  let recording = false;
  let player = null;
  let editableBeforePlayback = null;
  let playbackTarget = 0;
  let playbackRunning = false;
  let dockOpen = false;
  let batch = [];
  let pairs = [];
  let batchErrors = [];
  let busy = false;
  let notes = '';
  let lastDockState = '';
  try {
    const saved = JSON.parse(localStorage.getItem('logic-lab.classroom-profile') || '{}');
    if (saved.mode === 'teacher') mode = 'teacher';
    if (saved.student && typeof saved.student === 'object') {
      student = Object.fromEntries(
        ['name', 'id', 'group'].map((key) => [key, String(saved.student[key] || '').slice(0, 200)]),
      );
    }
  } catch {}
  try {
    const saved = JSON.parse(localStorage.getItem('logic-lab.classroom-draft') || 'null');
    if (saved && typeof saved === 'object') {
      assignment = saved.assignment ? parseAssignment(JSON.stringify(saved.assignment)) : null;
      attempt = saved.attempt && assignment ? validateAttempt(saved.attempt, assignment) : null;
      sequence = saved.sequence ? parseSequence(JSON.stringify(saved.sequence)) : null;
      notes = typeof saved.notes === 'string' ? saved.notes.slice(0, 10000) : '';
      dockOpen = !!sequence || !!assignment;
    }
  } catch {}

  function persistDraft() {
    try {
      localStorage.setItem(
        'logic-lab.classroom-draft',
        JSON.stringify({ assignment, attempt, sequence, notes }),
      );
    } catch {
      adapter.notify(
        L(
          'Чернетка не помістилася в локальне сховище. Збережіть схему та сценарій у файли.',
          'Draft could not be stored locally. Save the circuit and sequence to files.',
        ),
      );
    }
  }

  function profile() {
    try {
      localStorage.setItem('logic-lab.classroom-profile', JSON.stringify({ mode, student }));
    } catch {}
  }

  function safe(action) {
    return async (...args) => {
      try {
        await action(...args);
      } catch (error) {
        adapter.notify(error.message);
      }
    };
  }

  function button(id, label, disabled = false, primary = false) {
    return `<button type="button" id="${id}" class="${primary ? 'primary-btn' : 'soft-btn'}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
  }

  function mount() {
    const header = $('#classroom');
    if (header) {
      header.innerHTML = `<span aria-hidden="true">▤</span><span>${L('Лабораторія', 'Classroom')}</span>`;
      header.onclick = () => open();
    }
    updateDock(true);
  }

  function dockMarkup() {
    return `<div class="action-session-title"><button id="classroom-open" class="text-btn">${L('Сценарій дій', 'Action sequence')}</button><span id="action-status" role="status" aria-live="polite"></span></div><div class="action-session-buttons">${button('action-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player || busy, recording)}${button('action-replay', L('Відтворити', 'Replay'), !sequence || recording || !!player)}${button('action-next', L('Наступна дія', 'Next action'), !sequence || recording || playbackRunning)}${button('action-pause', playbackRunning ? L('Пауза сценарію', 'Pause replay') : L('Продовжити', 'Resume replay'), !player)}${button('action-stop', L('Зупинити', 'Stop'), !player)}${button('action-hide', '×', recording || !!player)}</div>`;
  }

  function updateDock(force = false) {
    const root = $('#classroom-dock');
    if (!root) return;
    root.hidden = !dockOpen && !recording && !player;
    const state = [
      recording,
      !!sequence,
      !!player,
      playbackRunning,
      busy,
      adapter.getLanguage(),
    ].join(':');
    if (state !== lastDockState || force) {
      lastDockState = state;
      root.innerHTML = dockMarkup();
      $('#classroom-open').onclick = () => open('sequence');
      $('#action-record').onclick = safe(() => (recording ? stopRecording() : startRecording()));
      $('#action-replay').onclick = safe(() => replay());
      $('#action-next').onclick = safe(() => nextAction());
      $('#action-pause').onclick = () => {
        playbackRunning = !playbackRunning;
        updateDock();
      };
      $('#action-stop').onclick = stopPlayback;
      $('#action-hide').onclick = () => {
        dockOpen = false;
        updateDock();
      };
    }
    const status = recording
      ? `${L('Запис', 'Recording')} · ${sequence.actions.length} ${L('дій', 'actions')} · ${adapter.getRuntime().time.toFixed(3)} s`
      : player
        ? `${L('Відтворення', 'Replay')} · ${player.cursor}/${sequence.actions.length} · ${player.runtime.time.toFixed(3)} s`
        : sequence
          ? `${sequence.actions.length} ${L('дій', 'actions')} · ${sequence.duration.toFixed(3)} s`
          : L('Ще немає запису', 'No sequence yet');
    if ($('#action-status').textContent !== status) $('#action-status').textContent = status;
    root.classList.toggle('is-recording', recording);
  }

  function startRecording() {
    if (busy)
      throw new Error(
        L('Дочекайтеся завершення перевірки робіт.', 'Wait for submission checking to finish.'),
      );
    if (player) stopPlayback();
    sequence = createSequence(adapter.getProject());
    adapter.resetForSequence();
    recording = true;
    observations = [captureObservation(sequence, adapter.getRuntime(), -1)];
    persistDraft();
    dockOpen = true;
    adapter.closeModal();
    adapter.setRunning(true);
    updateDock();
    adapter.notify(
      L(
        'Початок з початкового стану. Перемикайте входи; схема під час запису зафіксована.',
        'Started from initial state. Change inputs; circuit editing is locked while recording.',
      ),
    );
  }

  function stopRecording() {
    if (!recording) return;
    sequence = finishSequence(sequence, adapter.getRuntime().time);
    recording = false;
    persistDraft();
    adapter.setRunning(false);
    updateDock();
  }

  function beginPlayback() {
    if (busy)
      throw new Error(
        L('Дочекайтеся завершення перевірки робіт.', 'Wait for submission checking to finish.'),
      );
    if (!sequence)
      throw new Error(
        L(
          'Спочатку запишіть або імпортуйте сценарій.',
          'Record or import an action sequence first.',
        ),
      );
    adapter.setRunning(false);
    if (!editableBeforePlayback)
      editableBeforePlayback = { project: adapter.getProject(), runtime: adapter.getRuntime() };
    player = createPlayback(sequence);
    playbackTarget = 0;
    dockOpen = true;
    adapter.adoptPlayback(player.project, player.runtime);
    adapter.closeModal();
  }

  function replay() {
    beginPlayback();
    playbackRunning = true;
    updateDock();
  }

  function nextAction() {
    if (!player || player.done) beginPlayback();
    playbackRunning = false;
    const result = stepPlayback(player, { maxSteps: 1000 });
    observations = player.observations;
    playbackTarget = player.runtime.time;
    adapter.refreshPlayback(player.project, player.runtime);
    updateDock();
    if (!result.actionApplied && !result.done)
      adapter.notify(
        L(
          'Обчислюється пауза перед дією. Натисніть ще раз.',
          'Computing the interval before the action. Press again to continue.',
        ),
      );
  }

  function stopPlayback() {
    player = null;
    playbackRunning = false;
    adapter.setRunning(false);
    if (editableBeforePlayback) {
      adapter.adoptPlayback(editableBeforePlayback.project, editableBeforePlayback.runtime);
      editableBeforePlayback = null;
    }
    updateDock();
    adapter.refreshPlayback();
  }

  function tick(dt) {
    if (player && playbackRunning) {
      playbackTarget = Math.min(sequence.duration, playbackTarget + dt);
      const cursor = player.cursor;
      advancePlayback(player, playbackTarget, { maxSteps: 150 });
      observations = player.observations;
      adapter.refreshPlayback(player.project, player.runtime, cursor !== player.cursor);
      if (player.done) {
        playbackRunning = false;
        adapter.notify(
          L(
            'Сценарій відтворено. Можна переглянути сигнали або повторити.',
            'Replay complete. Inspect the signals or replay again.',
          ),
        );
      }
    }
    if (recording && adapter.getRuntime().time >= 120 - 1e-8) {
      stopRecording();
      adapter.notify(
        L(
          'Запис завершено на межі 120 секунд. Збережіть сценарій або почніть новий.',
          'Recording completed at the 120-second limit. Save the sequence or start another.',
        ),
      );
    }
    if (recording || player) updateDock();
    return !!player;
  }

  function inputChanged(node, key, value) {
    if (!recording) return;
    try {
      appendAction(sequence, { at: Math.min(120, adapter.getRuntime().time), node, key, value });
      observations.push(captureObservation(sequence, adapter.getRuntime()));
      persistDraft();
      if (sequence.actions.length >= 2000) stopRecording();
    } catch (error) {
      stopRecording();
      adapter.notify(error.message);
    }
    updateDock();
  }

  function isLocked() {
    return recording || !!player || busy;
  }

  function allowEdit() {
    if (!isLocked()) return true;
    adapter.notify(
      L(
        'Завершіть запис або зупиніть відтворення, щоб змінювати схему.',
        'Finish recording or stop replay before editing the circuit.',
      ),
    );
    return false;
  }

  function allowInput() {
    if (!player) return true;
    adapter.notify(
      L(
        'Під час відтворення входами керує сценарій. Натисніть «Зупинити» для ручного керування.',
        'The sequence controls inputs during replay. Stop replay to control them manually.',
      ),
    );
    return false;
  }

  function observeEdit() {
    if (attempt && !player && !recording) {
      try {
        recordEdit(attempt, adapter.getProject(), {
          at: Math.max(0, (Date.now() - Date.parse(attempt.startedAt)) / 1000),
          event: 'circuit-edit',
        });
        persistDraft();
      } catch (error) {
        adapter.notify(error.message);
      }
    }
  }

  function fileButton(id, label, action, multiple = false) {
    $(id).onclick = () => pickFiles(safe(action), multiple);
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
    return `<section class="classroom-section"><h3>${L('Запис і відтворення входів', 'Record and replay inputs')}</h3><p>${L('Запис зберігає початкову схему, порядок дій та час симуляції. SER, CLK і RST перемикайте на схемі. Навіть дії в одну мить відтворюються в записаному порядку.', 'A sequence stores the initial circuit, action order and simulation times. Toggle SER, CLK and RST on the canvas. Actions at the same time retain their order.')}</p><div class="classroom-actions">${button('class-record', recording ? L('Завершити запис', 'Finish recording') : L('Записати дії', 'Record actions'), !!player, true)}${button('class-replay', L('Відтворити на схемі', 'Replay on canvas'), !sequence || recording)}${button('class-next', L('Дія за дією', 'Step through actions'), !sequence || recording)}${button('class-sequence-import', L('Відкрити сценарій', 'Open sequence'), isLocked())}${button('class-sequence-export', L('Зберегти сценарій', 'Save sequence'), !sequence || recording)}${preset ? button('class-preset', L('Навчальний сценарій прикладу', 'Example action sequence'), isLocked()) : ''}</div>${actionTable()}</section>`;
  }

  function identityFields() {
    return `<div class="classroom-fields"><label>${L('Ім’я та прізвище', 'Student name')}<input id="student-name" maxlength="200" value="${esc(student.name)}" autocomplete="name"></label><label>${L('Ідентифікатор студента', 'Student ID')}<input id="student-id" maxlength="200" value="${esc(student.id)}"></label><label>${L('Група', 'Group')}<input id="student-group" maxlength="200" value="${esc(student.group)}"></label></div>`;
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
    return `<section class="classroom-section"><h3>${L('Підготовка завдання', 'Prepare an assignment')}</h3><p>${L('Побудуйте еталонну схему й запишіть перевірочний сценарій. У студентський файл потраплять умова, індивідуальні початкові значення та заготовка. Еталон і перевірочні дії залишаться лише у ключі викладача.', 'Build the reference circuit and record a test sequence. Student files contain instructions, individual initial values and a starter. The reference circuit and test actions remain in the instructor key.')}</p><div class="classroom-fields"><label>${L('Назва роботи', 'Assignment title')}<input id="task-title" maxlength="200" value="${esc(teacherKey?.title || adapter.getProject().name)}"></label><label>${L('Заготовка студента', 'Student starter')}<select id="task-starter"><option value="interfaces">${L('Лише входи та контрольні виходи', 'Inputs and observed outputs only')}</option><option value="components">${L('Усі елементи без з’єднань', 'All components without wiring')}</option></select></label></div><label>${L('Умова та критерії', 'Instructions and criteria')}<textarea id="task-instructions" rows="3" maxlength="10000">${esc(teacherKey?.instructions || '')}</textarea></label><p class="classroom-hint">${L('Якщо обрати внутрішній регістр чи пам’ять для спостереження, цей елемент залишиться в заготовці. Для самостійного вибору елементів обирайте зовнішні індикатори чи осцилографи.', 'If an internal register or memory is observed, it remains in the starter. Choose external indicators or scopes when students should choose the internal components themselves.')}</p><fieldset class="classroom-probes"><legend>${L('Що перевіряти', 'Observed signals')} <small>≤32</small></legend>${probes.map((probe, index) => `<label><input type="checkbox" data-task-probe="${index}" ${index < 8 ? 'checked' : ''}>${esc(probe.label)}</label>`).join('') || `<p>${L('Додайте до схеми регістр, пам’ять чи індикатор.', 'Add a register, memory or indicator to the circuit.')}</p>`}</fieldset><div class="classroom-actions">${button('teacher-create', L('Створити ключ з еталона', 'Create reference key'), !sequence?.actions.length || isLocked(), true)}${button('teacher-key-import', L('Відкрити ключ викладача', 'Open instructor key'), busy)}${button('teacher-key-export', L('Зберегти ключ викладача', 'Save instructor key'), !teacherKey || busy)}</div>${referenceWarnings.map((message) => `<p class="classroom-error">${esc(message)}</p>`).join('')}${teacherKey ? `<div class="classroom-task"><h4>${esc(teacherKey.title)}</h4><p>${L('Ключ викладача містить розв’язання. Передавайте студентам лише окремі файли варіантів нижче.', 'The instructor key contains the solution. Give students only the individual variant files below.')}</p><label>${L('Ідентифікатори студентів, по одному в рядку', 'Student IDs, one per line')}<textarea id="issue-students" rows="3" placeholder="student-01&#10;student-02"></textarea></label><div class="classroom-actions">${button('teacher-issue', L('Сформувати варіанти', 'Generate variants'), busy, true)}</div>${issued.length ? `<ul class="issued-assignments">${issued.map((task, index) => `<li><span>${esc(task.variant.studentId)} · ${esc(task.variant.id)}</span><button type="button" class="soft-btn" data-task-download="${index}">${L('Файл студента', 'Student file')}</button></li>`).join('')}</ul><p class="classroom-hint">${L('Після видачі варіантів збережіть оновлений ключ викладача: він містить перелік виданих варіантів.', 'Save the updated instructor key after issuing variants: it contains the issued variant registry.')}</p>` : ''}</div>` : ''}</section><section class="classroom-section"><h3>${L('Перевірка робіт', 'Review submissions')}</h3><p>${L('Завантажте свій ключ і до 40 робіт. Кожна схема повторно запускається зі студентським та прихованим перевірочним сценарієм. Результати з файлу не приймаються на віру.', 'Load your key and up to 40 work files. Each circuit is rerun with the student sequence and instructor test. Claimed results are not trusted.')}</p><div class="classroom-actions">${button('teacher-review', busy ? L('Перевірка…', 'Checking…') : L('Завантажити роботи', 'Load submissions'), !teacherKey || busy, true)}${button('teacher-report', L('Зберегти звіт', 'Save report'), !batch.length || busy)}</div><div id="review-results" aria-live="polite">${reviewMarkup()}</div></section>`;
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

  function studentLabel(submission, index) {
    if (!submission) return `${L('Робота', 'Submission')} ${index + 1}`;
    const { name, id } = submission.student;
    return name && id && name !== id ? `${name} (${id})` : name || id;
  }

  function observedSignalLabel(probe) {
    const node = teacherKey?.referenceProject.nodes.find(
      (candidate) => candidate.id === probe?.node,
    );
    if (!node) return L('Контрольний сигнал', 'Observed signal');
    const definition = getDefinition(node.type);
    const port = definition.signals[probe.side || 'outputs']?.find(
      (candidate) => candidate.id === probe.port,
    );
    const label = node.label || (adapter.getLanguage() === 'ua' ? definition.ua : definition.label);
    return `${label} · ${port?.label || probe.port}`;
  }

  function observedValue(value) {
    if (value === undefined) return L('немає результату', 'no result');
    if (value === 'X') return L('невизначено (X)', 'unknown (X)');
    if (value === 'Z') return L('високий імпеданс (Z)', 'high impedance (Z)');
    return format(value);
  }

  function mismatchMarkup(mismatches) {
    if (!mismatches?.length) return '';
    const visible = mismatches.slice(0, 8);
    return `<details><summary>${mismatches.length} ${L('розбіжностей', 'differences')}</summary><ul>${visible
      .map((mismatch) => {
        const position =
          mismatch.after < 0
            ? L('початковий стан', 'initial state')
            : `${L('після дії', 'after action')} ${mismatch.after + 1}`;
        const time = Number.isFinite(mismatch.at) ? `${mismatch.at.toFixed(3)} ${L('с', 's')}` : '';
        return `<li><strong>${esc(observedSignalLabel(mismatch.probe))}</strong> · ${esc(time)} · ${esc(position)}<br>${L('Очікується', 'Expected')}: ${esc(observedValue(mismatch.expected))}; ${L('отримано', 'received')}: ${esc(observedValue(mismatch.actual))}.${mismatch.expected === 'X' || mismatch.expected === 'Z' ? `<br>${L('Еталонний сигнал не визначений. Викладачеві потрібно уточнити еталон.', 'The reference signal is not defined. The instructor should correct the reference.')}` : ''}</li>`;
      })
      .join(
        '',
      )}</ul>${mismatches.length > visible.length ? `<p class="classroom-hint">${L('Показано перші 8 розбіжностей. Повний перелік зберігається у звіті.', 'Showing the first 8 differences. The saved report contains the complete list.')}</p>` : ''}</details>`;
  }

  function referenceCheckMarkup(result) {
    const checksPassed = result.functionalPassed ?? result.passed;
    return `<span class="classroom-badge ${checksPassed ? 'pass' : 'fail'}">${checksPassed ? L('Перевірки пройдено', 'Checks passed') : L('Є розбіжності', 'Differences')}</span><p>${L('Збігається', 'Matched')}: <strong>${result.matched ?? 0}/${result.totalChecks ?? result.checks ?? 0}</strong></p>${result.workEvidenceMissing || result.reviewRequired ? `<p><span class="classroom-badge">${L('Потрібен перегляд викладача', 'Instructor review needed')}</span></p>` : ''}${mismatchMarkup(result.mismatches)}`;
  }

  function evidenceMarkup(result) {
    const evidence = result.evidence || {};
    const warnings = [];
    if (result.workEvidenceMissing)
      warnings.push(
        L(
          'Немає журналу змістовних змін побудови. Навіть якщо схема працює правильно, самостійне виконання потрібно перевірити окремо.',
          'There is no history of semantic construction changes. Even if the circuit works correctly, independent completion needs separate review.',
        ),
      );
    if (result.reviewRequired && evidence.studentBound === false)
      warnings.push(
        L(
          'Цей варіант не закріплено за конкретним студентом. Уточніть, хто виконував роботу.',
          'This variant is not assigned to a specific student. Confirm who completed the work.',
        ),
      );
    return `<ul><li>${L('Зміни побудови схеми', 'Circuit construction changes')}: <strong>${Number.isInteger(evidence.constructionChanges) ? evidence.constructionChanges : 0}</strong></li><li>${L('Записані дії', 'Recorded actions')}: <strong>${Number.isInteger(evidence.actions) ? evidence.actions : 0}</strong></li><li>${L('Схема відповідає запису', 'Circuit matches the recording')}: <strong>${result.structureMatches ? L('так', 'yes') : L('ні', 'no')}</strong></li><li>${L('Результат повторного запуску збігається', 'Recomputed results match')}: <strong>${result.observationsMatch ? L('так', 'yes') : L('ні', 'no')}</strong></li></ul>${warnings.map((warning) => `<p class="classroom-hint"><strong>${esc(warning)}</strong></p>`).join('')}<p class="classroom-hint">${L('Журнал є свідченням роботи, але сам по собі не підтверджує авторство.', 'The journal provides work evidence but does not establish authorship by itself.')}</p>`;
  }

  function similarityMarkup(pair) {
    const left = studentLabel(batch[pair.a]?.submission, pair.a);
    const right = studentLabel(batch[pair.b]?.submission, pair.b);
    const reasons = [];
    if (pair.sharedAttempt)
      reasons.push(
        L('Однаковий ідентифікатор спроби.', 'The submissions share an attempt identifier.'),
      );
    if (pair.sharedVariant)
      reasons.push(
        L('Використано один і той самий виданий варіант.', 'The same issued variant was used.'),
      );
    if (pair.topologyExact)
      reasons.push(
        L(
          'Структура схем і параметри елементів однакові, навіть після перейменування, пересування та зміни форми проводів.',
          'Circuit structure and component parameters match despite renaming, repositioning and wire routing changes.',
        ),
      );
    else if (Number.isFinite(pair.topologySimilarity))
      reasons.push(
        `${L('Схожість доданих елементів і з’єднань', 'Similarity of added components and connections')}: ${Math.round(pair.topologySimilarity * 100)}%.`,
      );
    if (pair.actionsExact)
      reasons.push(
        L(
          'Послідовність значень входів і час дій збігаються.',
          'The ordered input values and action times match.',
        ),
      );
    if (pair.resultsExact)
      reasons.push(
        L(
          'Записані результати та час вимірювань збігаються.',
          'Recorded results and observation times match.',
        ),
      );
    if (pair.topologyUndetermined)
      reasons.push(
        L(
          'Точне зіставлення цієї великої схеми не завершено; оцінка схожості орієнтовна.',
          'Exact matching of this large circuit was not completed; the similarity estimate is approximate.',
        ),
      );
    return `<article><strong>${esc(left)} ↔ ${esc(right)}</strong><p>${pair.suspected ? L('Потребує індивідуального обговорення.', 'Discuss the work individually.') : L('Є спільні ознаки для перегляду.', 'There are shared features to review.')}</p><ul>${reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul><p class="classroom-hint">${L('Правильні розв’язання можуть мати спільну структуру й однакові результати. Ці збіги не доводять списування; запропонуйте пояснити схему або виконати змінений дослід.', 'Correct solutions can share structure and results. These matches do not prove copying; ask the student to explain the circuit or perform a modified experiment.')}</p></article>`;
  }

  function reviewMarkup() {
    const meaningfulPairs = pairs.filter(
      (pair) =>
        pair.sharedAttempt ||
        pair.sharedVariant ||
        pair.topologyExact ||
        pair.actionsExact ||
        pair.suspected ||
        (pair.reasons?.length || 0) > Number(!!pair.resultsExact),
    );
    const visiblePairs = meaningfulPairs.slice(0, 100);
    return `${busy ? `<p class="classroom-processing">${L('Перераховую схеми. Вікно можна закрити; перевірка продовжиться.', 'Recomputing circuits. You may close this window; checking will continue.')}</p>` : ''}${batchErrors.map((error) => `<p class="classroom-error">${esc(error)}</p>`).join('')}${batch.length ? `<div class="classroom-table-scroll"><table class="classroom-table"><thead><tr><th>${L('Студент', 'Student')}</th><th>${L('Варіант', 'Variant')}</th><th>${L('Еталонні перевірки', 'Reference checks')}</th><th>${L('Цілісність файлу', 'File integrity')}</th><th>${L('Свідчення роботи', 'Work evidence')}</th></tr></thead><tbody>${batch.map(({ submission, result }, index) => `<tr><td>${esc(studentLabel(submission, index))}</td><td><span title="${esc(submission.assignment.variant.id)}">${esc(submission.assignment.variant.id.slice(0, 8))}</span></td><td>${referenceCheckMarkup(result)}</td><td>${result.integrity ? L('Контрольна сума збігається', 'Checksum matches') : L('Контрольна сума не збігається', 'Checksum mismatch')}<p class="classroom-hint">${L('Це перевірка цілісності, а не авторства.', 'This checks integrity, not authorship.')}</p></td><td>${evidenceMarkup(result)}</td></tr>`).join('')}</tbody></table></div><h4>${L('Збіги між роботами', 'Similarity between submissions')}</h4>${meaningfulPairs.length ? `<div class="classroom-similarities">${visiblePairs.map(similarityMarkup).join('')}</div>${meaningfulPairs.length > visiblePairs.length ? `<p class="classroom-hint">${L('Показано перші 100 пар. Повний перелік доступний у збереженому звіті.', 'Showing the first 100 pairs. The saved report contains the complete list.')}</p>` : ''}` : `<p>${L('Суттєвих збігів структури, сценарію чи ідентифікаторів у цьому наборі не виявлено. Самі по собі однакові правильні результати не позначаються як підозрілі.', 'No significant structural, sequence or identifier matches were found in this batch. Matching correct results alone are not flagged as suspicious.')}</p>`}` : ''}`;
  }

  function open(tab = mode) {
    adapter.showModal(
      `<span class="eyebrow">LOGIC LAB · ${L('НАВЧАННЯ', 'LEARNING')}</span><h2>${L('Лабораторні роботи', 'Classroom')}</h2><div class="classroom-tabs" role="tablist">${[
        ['student', L('Студент', 'Student')],
        ['teacher', L('Викладач', 'Instructor')],
        ['sequence', L('Сценарій дій', 'Action sequence')],
      ]
        .map(
          ([id, label]) =>
            `<button type="button" role="tab" id="class-tab-${id}" data-class-tab="${id}" aria-selected="${tab === id}">${label}</button>`,
        )
        .join(
          '',
        )}</div><div class="classroom-content">${tab === 'sequence' ? sequencePanel() : tab === 'teacher' ? teacherPanel() : studentPanel()}</div><p class="classroom-trust-note">${L('Це локальна навчальна перевірка без облікових записів. Контрольна сума перевіряє цілісність файлу, але не підтверджує авторство. Збіги структури чи дій — привід обговорити роботу, а не доказ списування.', 'This is a local classroom workflow without accounts. A checksum checks file integrity, not authorship. Matching structures or actions warrant discussion, not an automatic accusation.')}</p>`,
      true,
    );
    $('.modal').classList.add('classroom-modal');
    $$('[data-class-tab]').forEach(
      (el) =>
        (el.onclick = () => {
          if (el.dataset.classTab !== 'sequence') {
            mode = el.dataset.classTab;
            profile();
          }
          open(el.dataset.classTab);
        }),
    );
    if (tab === 'sequence') bindSequence();
    else if (tab === 'teacher') bindTeacher();
    else bindStudent();
  }

  function bindSequence() {
    $('#class-record').onclick = safe(() =>
      recording ? (stopRecording(), open('sequence')) : startRecording(),
    );
    $('#class-replay').onclick = safe(replay);
    $('#class-next').onclick = safe(nextAction);
    fileButton('#class-sequence-import', L('Сценарій', 'Sequence'), async (files) => {
      sequence = parseSequence(await readFile(files[0]));
      observations = [];
      dockOpen = true;
      persistDraft();
      open('sequence');
      updateDock();
    });
    $('#class-sequence-export').onclick = safe(() =>
      download(
        serializeSequence(sequence),
        `${cleanName(sequence.initialProject.name)}.actions.json`,
      ),
    );
    if ($('#class-preset'))
      $('#class-preset').onclick = safe(() => {
        const example = adapter.getExample();
        sequence = createSequence(example.create(), { probes: example.actionProbes });
        for (const action of example.actionPreset) appendAction(sequence, action);
        sequence = finishSequence(
          sequence,
          Math.max(0, ...example.actionPreset.map((action) => action.at)) + 0.1,
        );
        observations = [];
        dockOpen = true;
        persistDraft();
        open('sequence');
        updateDock();
      });
  }

  function readIdentity() {
    student = {
      name: $('#student-name').value.trim(),
      id: $('#student-id').value.trim(),
      group: $('#student-group').value.trim(),
    };
    notes = $('#student-notes').value;
    profile();
    persistDraft();
  }

  function startAttempt() {
    if (busy)
      throw new Error(
        L('Дочекайтеся завершення перевірки робіт.', 'Wait for submission checking to finish.'),
      );
    if (!student.name || !student.id)
      throw new Error(
        L('Заповніть ім’я та ідентифікатор студента.', 'Enter the student name and ID.'),
      );
    if (assignment.variant.studentId && assignment.variant.studentId !== student.id)
      throw new Error(
        L(
          'Цей варіант видано для іншого ідентифікатора студента.',
          'This variant was issued for a different student ID.',
        ),
      );
    attempt = createAttempt(assignment, student);
    sequence = null;
    adapter.loadProject(structuredClone(assignment.starterProject));
    adapter.setRunning(false);
    dockOpen = true;
    persistDraft();
    updateDock();
    adapter.notify(
      L(
        'Спробу розпочато. Побудуйте схему, запишіть дії та поясніть результат.',
        'Attempt started. Build the circuit, record actions and explain the result.',
      ),
    );
  }

  function bindStudent() {
    $$('[id^="student-"]')
      .filter((el) => ['INPUT', 'TEXTAREA'].includes(el.tagName))
      .forEach((el) => (el.oninput = readIdentity));
    fileButton('#student-task-import', '', async (files) => {
      readIdentity();
      assignment = parseAssignment(await readFile(files[0]));
      attempt = null;
      sequence = null;
      observations = [];
      persistDraft();
      open('student');
    });
    $('#student-start').onclick = safe(() => {
      readIdentity();
      startAttempt();
    });
    $('#student-submit').onclick = safe(async () => {
      readIdentity();
      if (!notes.trim())
        throw new Error(
          L(
            'Додайте пояснення результату перед здачею роботи.',
            'Explain your result before exporting the work.',
          ),
        );
      const submission = await createSubmission({
        assignment,
        student,
        attempt,
        project: adapter.getProject(),
        sequence,
        notes,
      });
      download(
        serializeSubmission(submission),
        `${cleanName(student.id)}-${cleanName(assignment.title)}.submission.json`,
      );
      adapter.notify(
        L(
          'Роботу збережено. Передайте файл викладачеві.',
          'Work saved. Send the file to your instructor.',
        ),
      );
    });
  }

  async function inspectReference(key) {
    const playback = createPlayback(
      { ...key.sequence, probes: key.probes },
      { project: key.referenceProject },
    );
    while (!playback.done) {
      advancePlayback(playback, key.sequence.duration, { maxSteps: 250 });
      if (!playback.done) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const warnings = [];
    const changes = key.probes.map(
      (probe, index) =>
        new Set(playback.observations.map((observation) => observation.values[index])).size,
    );
    if (changes.every((count) => count < 2))
      warnings.push(
        L(
          'Слабка перевірка: жоден обраний вихід не змінюється. Додайте до сценарію різні входи, запис/читання та скидання, інакше правильне стале значення може пройти перевірку.',
          'Weak test: none of the selected outputs changes. Add varied inputs, writes/reads and resets; a constant output could otherwise pass.',
        ),
      );
    if (
      playback.observations.some((observation) =>
        observation.values.some((value) => value === 'X' || value === 'Z'),
      )
    )
      warnings.push(
        L(
          'Еталон містить невідомі чи непідключені контрольні сигнали. Усуньте їх перед видачею завдання.',
          'The reference contains unknown or floating observed signals. Resolve them before issuing the task.',
        ),
      );
    return warnings;
  }

  function bindTeacher() {
    $('#teacher-create').onclick = safe(async () => {
      const choices = possibleProbes();
      const probes = $$('[data-task-probe]:checked')
        .map((el) => choices[Number(el.dataset.taskProbe)])
        .map(({ node, port, side }) => ({ node, port, side }));
      if (!probes.length || probes.length > 32)
        throw new Error(
          L('Оберіть від 1 до 32 сигналів для перевірки.', 'Choose 1–32 observed signals.'),
        );
      teacherKey = createAssignment({
        title: $('#task-title').value,
        instructions: $('#task-instructions').value,
        referenceProject: sequence.initialProject,
        sequence,
        probes,
        starterMode: $('#task-starter').value,
      });
      issued = [];
      referenceWarnings = await inspectReference(teacherKey);
      open('teacher');
    });
    fileButton('#teacher-key-import', '', async (files) => {
      teacherKey = parseAssignmentKey(await readFile(files[0]));
      issued = [];
      referenceWarnings = await inspectReference(teacherKey);
      open('teacher');
    });
    $('#teacher-key-export').onclick = safe(() =>
      download(
        serializeAssignmentKey(teacherKey),
        `${cleanName(teacherKey.title)}.teacher-key.json`,
      ),
    );
    if ($('#teacher-issue'))
      $('#teacher-issue').onclick = safe(() => {
        const ids = [
          ...new Set(
            $('#issue-students')
              .value.split(/\r?\n/)
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ];
        if (!ids.length || ids.length > 40)
          throw new Error(L('Введіть від 1 до 40 ідентифікаторів.', 'Enter 1–40 student IDs.'));
        issued = ids.map((studentId) => issueAssignment(teacherKey, { studentId }));
        open('teacher');
      });
    $$('[data-task-download]').forEach(
      (el) =>
        (el.onclick = safe(() => {
          const task = issued[Number(el.dataset.taskDownload)];
          download(
            serializeAssignment(task),
            `${cleanName(task.variant.studentId)}-${cleanName(task.title)}.assignment.json`,
          );
        })),
    );
    fileButton('#teacher-review', '', reviewFiles, true);
    $('#teacher-report').onclick = safe(() =>
      download(
        JSON.stringify(
          {
            kind: 'logic-lab-review',
            version: 1,
            taskId: teacherKey.id,
            results: batch.map(({ submission, result }) => ({
              student: submission.student,
              variant: submission.assignment.variant.id,
              result,
            })),
            similarities: pairs,
            errors: batchErrors,
            limitation: L(
              'Свідчення схожості не доводять авторства чи списування.',
              'Similarity evidence does not prove authorship or copying.',
            ),
          },
          null,
          2,
        ),
        `${cleanName(teacherKey.title)}.review.json`,
      ),
    );
  }

  async function reviewFiles(files) {
    if (files.length > 40)
      throw new Error(
        L('За один раз можна перевірити до 40 робіт.', 'Review up to 40 files at a time.'),
      );
    busy = true;
    batch = [];
    pairs = [];
    batchErrors = [];
    const key = teacherKey;
    open('teacher');
    try {
      for (const file of files) {
        try {
          const submission = parseSubmission(await readFile(file));
          const result = await gradeSubmission(submission, key);
          batch.push({ submission, result });
        } catch (error) {
          batchErrors.push(`${file.name}: ${error.message}`);
        }
        if ($('#review-results')) $('#review-results').innerHTML = reviewMarkup();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      pairs = compareSubmissions(
        batch.map((item) => item.submission),
        { assignmentKey: key },
      );
    } finally {
      busy = false;
      if ($('#review-results')) open('teacher');
      updateDock(true);
      adapter.notify(
        L(
          `Перевірено робіт: ${batch.length}. Помилок файлів: ${batchErrors.length}.`,
          `Reviewed ${batch.length} submissions; ${batchErrors.length} file errors.`,
        ),
      );
    }
  }

  return {
    mount,
    open,
    tick,
    inputChanged,
    allowEdit,
    allowInput,
    observeEdit,
    isLocked,
    isRecording: () => recording,
    isPlaying: () => !!player,
    stopPlayback,
    stopRecording,
    recordingDelta: (dt) =>
      recording ? Math.min(dt, Math.max(0, 120 - adapter.getRuntime().time)) : dt,
    projectToSave: () => editableBeforePlayback?.project || adapter.getProject(),
  };
}
