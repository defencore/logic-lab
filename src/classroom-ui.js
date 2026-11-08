import './classroom.css';
import { $, $$ } from './ui-utils.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  parseSequence,
  serializeSequence,
} from './action-sequence.js';
import {
  parseAssignment,
  serializeAssignment,
  serializeAssignmentKey,
  createAttempt,
  recordEdit,
  createSubmission,
  serializeSubmission,
} from './lab-assessment.js';
import { createActionSession } from './classroom/action-session.js';
import { createClassroomStorage, sanitizeTeacherForm } from './classroom/storage.js';
import {
  cleanName,
  downloadFile,
  readClassroomFile,
  chooseClassroomFiles,
  createClassroomOperations,
} from './classroom/files.js';
import { createClassroomView } from './classroom/view.js';
import { createTeacherWorkspace, probeKey } from './classroom/teacher-workspace.js';

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createClassroom(adapter) {
  const L = (ua, en) => (adapter.getLanguage() === 'ua' ? ua : en);
  const store = createClassroomStorage(adapter.storage ?? browserStorage(), () =>
    adapter.notify(
      L(
        'Чернетка не помістилася в локальне сховище. Збережіть схему та сценарій у файли.',
        'Draft could not be stored locally. Save the circuit and sequence to files.',
      ),
    ),
  );
  const restored = store.load();
  const session = createActionSession(adapter, {
    sequence: restored.sequence,
    onChange: updateDock,
    onSave: persistDraft,
  });
  const state = Object.assign(session.state, restored, {
    teacherKey: null,
    referenceWarnings: [],
    issued: [],
    batch: [],
    pairs: [],
    batchErrors: [],
    reviewing: false,
    reviewCancelled: false,
    reviewComparisonComplete: false,
    busy: false,
  });
  state.dockOpen ||= !!state.assignment;
  let activeTab = state.mode;
  let lastDockState = '';
  let fileIntent = 0;
  let installingStarter = false;
  const teacher = createTeacherWorkspace(state, {
    onSave: persistDraft,
    onProgress: () => {
      if ($('#review-results')) $('#review-results').innerHTML = views().reviewMarkup();
      if ($('#teacher-review-cancel')) $('#teacher-review-cancel').onclick = teacher.cancelReview;
    },
  });
  const operations = createClassroomOperations((busy) => {
    state.busy = busy;
    updateDock(true);
    if (busy) $$('.classroom-content button').forEach((button) => (button.disabled = true));
    else refreshVisible();
  });
  const views = () =>
    createClassroomView({
      state,
      language: adapter.getLanguage(),
      project: adapter.getProject(),
      example: adapter.getExample(),
    });
  function persistDraft() {
    store.saveDraft(state);
  }
  function safe(action) {
    return async (...args) => {
      try {
        await action(...args);
      } catch (error) {
        adapter.notify(error?.message || String(error));
      }
    };
  }
  function guardIdle() {
    if (state.busy)
      throw new Error(
        L(
          'Дочекайтеся завершення поточної операції.',
          'Wait for the current classroom operation to finish.',
        ),
      );
  }
  function guardEditableSession() {
    guardIdle();
    if (session.isLocked())
      throw new Error(
        L('Завершіть запис або зупиніть відтворення.', 'Finish recording or stop replay first.'),
      );
  }
  function refreshVisible() {
    if ($('.classroom-modal')) open(activeTab);
  }
  function mount() {
    const header = $('#classroom');
    if (header) {
      header.innerHTML = `<span aria-hidden="true">▤</span><span>${L('Лабораторія', 'Classroom')}</span>`;
      header.onclick = () => open();
    }
    updateDock(true);
  }
  function updateDock(force = false) {
    const root = $('#classroom-dock');
    if (!root) return;
    root.hidden = !state.dockOpen && !state.recording && !state.player;
    const key = [
      state.recording,
      !!state.sequence,
      !!state.player,
      state.playbackRunning,
      state.player?.done,
      state.busy,
      adapter.getLanguage(),
    ].join(':');
    if (key !== lastDockState || force) {
      lastDockState = key;
      root.innerHTML = views().dockMarkup();
      $('#classroom-open').onclick = () => open('sequence');
      $('#action-record').onclick = safe(() =>
        state.recording ? stopRecording() : startRecording(),
      );
      $('#action-replay').onclick = safe(replay);
      $('#action-next').onclick = safe(nextAction);
      $('#action-pause').onclick = session.pausePlayback;
      $('#action-stop').onclick = session.stopPlayback;
      $('#action-hide').onclick = () => {
        state.dockOpen = false;
        updateDock();
      };
    }
    const status = state.recording
      ? `${state.simulationRunning ? L('Запис', 'Recording') : L('Запис на паузі', 'Recording paused')} · ${state.sequence.actions.length} ${L('дій', 'actions')} · ${adapter.getRuntime().time.toFixed(3)} s`
      : state.player
        ? `${state.player.done ? L('Сценарій завершено', 'Replay complete') : state.playbackRunning ? L('Відтворення', 'Replay') : L('Відтворення на паузі', 'Replay paused')} · ${state.player.cursor}/${state.sequence.actions.length} · ${state.player.runtime.time.toFixed(3)} s`
        : state.sequence
          ? `${state.sequence.actions.length} ${L('дій', 'actions')} · ${state.sequence.duration.toFixed(3)} s`
          : L('Ще немає запису', 'No sequence yet');
    if ($('#action-status').textContent !== status) $('#action-status').textContent = status;
    root.classList.toggle('is-recording', state.recording);
  }
  function startRecording() {
    guardIdle();
    session.startRecording();
    adapter.closeModal();
    adapter.notify(
      L(
        'Початок з початкового стану. Перемикайте входи; схема під час запису зафіксована.',
        'Started from initial state. Change inputs; circuit editing is locked while recording.',
      ),
    );
  }
  function stopRecording() {
    session.stopRecording();
  }
  function replay() {
    guardIdle();
    session.replay();
    adapter.closeModal();
  }
  function nextAction() {
    guardIdle();
    const result = session.nextAction();
    adapter.closeModal();
    if (!result.actionApplied && !result.done)
      adapter.notify(
        L(
          'Обчислюється пауза перед дією. Натисніть ще раз.',
          'Computing the interval before the action. Press again to continue.',
        ),
      );
  }
  function tick(dt) {
    try {
      const result = session.tick(dt);
      if (result.completed)
        adapter.notify(
          L(
            'Сценарій відтворено. Натисніть «Зупинити», щоб повернутися до своєї схеми.',
            'Replay complete. Stop replay to return to your own circuit.',
          ),
        );
      if (result.limitReached)
        adapter.notify(
          L(
            'Запис завершено на межі 120 секунд. Збережіть сценарій або почніть новий.',
            'Recording completed at the 120-second limit. Save the sequence or start another.',
          ),
        );
      return result.playing;
    } catch (error) {
      session.stopPlayback();
      adapter.notify(error.message);
      return false;
    }
  }
  function inputChanged(node, key, value) {
    try {
      session.inputChanged(node, key, value);
    } catch (error) {
      session.stopRecording();
      adapter.notify(error.message);
    }
  }
  function isLocked() {
    return session.isLocked() || state.busy;
  }
  function allowEdit() {
    if (!isLocked()) return true;
    adapter.notify(
      state.busy
        ? L(
            'Дочекайтеся завершення поточної операції.',
            'Wait for the current classroom operation to finish.',
          )
        : L(
            'Завершіть запис або зупиніть відтворення, щоб змінювати схему.',
            'Finish recording or stop replay before editing the circuit.',
          ),
    );
    return false;
  }
  function allowInput() {
    if (!state.player && !state.busy) return true;
    adapter.notify(
      state.busy
        ? L(
            'Дочекайтеся завершення поточної операції.',
            'Wait for the current classroom operation to finish.',
          )
        : L(
            'Під час відтворення входами керує сценарій. Натисніть «Зупинити» для ручного керування.',
            'The sequence controls inputs during replay. Stop replay to control them manually.',
          ),
    );
    return false;
  }
  function observeEdit() {
    if (!state.attempt || installingStarter || session.isLocked() || state.busy) return;
    try {
      if (
        recordEdit(state.attempt, adapter.getProject(), {
          at: Math.max(0, (Date.now() - Date.parse(state.attempt.startedAt)) / 1000),
          event: 'circuit-edit',
        })
      )
        persistDraft();
    } catch (error) {
      adapter.notify(error.message);
    }
  }
  function open(tab = state.mode) {
    activeTab = ['student', 'teacher', 'sequence'].includes(tab) ? tab : state.mode;
    adapter.showModal(views().mainMarkup(activeTab), true);
    $('.modal').classList.add('classroom-modal');
    $$('[data-class-tab]').forEach((button) => {
      const select = (target) => {
        if (target !== 'sequence') {
          state.mode = target;
          store.saveProfile(state);
        }
        open(target);
        $(`#class-tab-${target}`).focus();
      };
      button.onclick = () => select(button.dataset.classTab);
      button.onkeydown = (event) => {
        const order = ['student', 'teacher', 'sequence'];
        const index = order.indexOf(button.dataset.classTab);
        const next =
          event.key === 'ArrowRight'
            ? (index + 1) % 3
            : event.key === 'ArrowLeft'
              ? (index + 2) % 3
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? 2
                  : null;
        if (next === null) return;
        event.preventDefault();
        event.stopPropagation();
        select(order[next]);
      };
    });
    if (activeTab === 'sequence') bindSequence();
    else if (activeTab === 'teacher') bindTeacher();
    else bindStudent();
  }
  function bindFile(selector, action, multiple = false) {
    $(selector).onclick = safe(() => {
      guardEditableSession();
      const intent = ++fileIntent;
      chooseClassroomFiles(
        (files) =>
          operations.run(async () => {
            if (intent !== fileIntent) return;
            await action(files);
          }),
        { multiple, onError: (error) => adapter.notify(error.message) },
      );
    });
  }
  function bindSequence() {
    $('#class-record').onclick = safe(() =>
      state.recording ? (stopRecording(), refreshVisible()) : startRecording(),
    );
    $('#class-replay').onclick = safe(replay);
    $('#class-next').onclick = safe(nextAction);
    bindFile('#class-sequence-import', async (files) =>
      session.setSequence(parseSequence(await readClassroomFile(files[0]))),
    );
    $('#class-sequence-export').onclick = safe(() =>
      downloadFile(
        serializeSequence(state.sequence),
        `${cleanName(state.sequence.initialProject.name)}.actions.json`,
      ),
    );
    if ($('#class-preset'))
      $('#class-preset').onclick = safe(() => {
        guardEditableSession();
        const example = adapter.getExample();
        const sequence = createSequence(example.create(), { probes: example.actionProbes });
        for (const action of example.actionPreset) appendAction(sequence, action);
        finishSequence(
          sequence,
          Math.max(0, ...example.actionPreset.map((action) => action.at)) + 0.1,
        );
        session.setSequence(sequence);
        refreshVisible();
      });
  }
  function readIdentity() {
    state.student = {
      name: $('#student-name').value.trim(),
      id: $('#student-id').value.trim(),
      group: $('#student-group').value.trim(),
    };
    state.notes = $('#student-notes').value;
    store.saveProfile(state);
    persistDraft();
  }
  function startAttempt() {
    guardEditableSession();
    if (!state.student.name || !state.student.id)
      throw new Error(
        L('Заповніть ім’я та ідентифікатор студента.', 'Enter the student name and ID.'),
      );
    if (
      state.assignment.variant.studentId &&
      state.assignment.variant.studentId !== state.student.id
    )
      throw new Error(
        L(
          'Цей варіант видано для іншого ідентифікатора студента.',
          'This variant was issued for a different student ID.',
        ),
      );
    const next = createAttempt(state.assignment, state.student);
    // Installing the starter must succeed before replacing the existing attempt evidence.
    installingStarter = true;
    try {
      adapter.loadProject(structuredClone(state.assignment.starterProject));
    } finally {
      installingStarter = false;
    }
    state.attempt = next;
    state.sequence = null;
    state.observations = [];
    state.notes = '';
    adapter.setRunning(false);
    state.dockOpen = true;
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
      .filter((element) => ['INPUT', 'TEXTAREA'].includes(element.tagName))
      .forEach((element) => (element.oninput = readIdentity));
    bindFile('#student-task-import', async (files) => {
      const assignment = parseAssignment(await readClassroomFile(files[0]));
      state.assignment = assignment;
      state.attempt = null;
      state.sequence = null;
      state.observations = [];
      state.notes = '';
      persistDraft();
      updateDock();
    });
    $('#student-start').onclick = safe(() => {
      readIdentity();
      startAttempt();
    });
    $('#student-submit').onclick = safe(async () => {
      readIdentity();
      guardEditableSession();
      if (!state.notes.trim())
        throw new Error(
          L(
            'Додайте пояснення результату перед здачею роботи.',
            'Explain your result before exporting the work.',
          ),
        );
      await operations.run(async () => {
        const submission = await createSubmission({
          assignment: state.assignment,
          student: state.student,
          attempt: state.attempt,
          project: adapter.getProject(),
          sequence: state.sequence,
          notes: state.notes,
        });
        downloadFile(
          serializeSubmission(submission),
          `${cleanName(submission.student.id)}-${cleanName(submission.assignment.title)}.submission.json`,
        );
        adapter.notify(
          L(
            'Роботу збережено. Передайте файл викладачеві.',
            'Work saved. Send the file to your instructor.',
          ),
        );
      });
    });
  }
  function readTeacherForm() {
    const choices = views().possibleProbes();
    state.teacherForm = sanitizeTeacherForm({
      title: $('#task-title').value,
      instructions: $('#task-instructions').value,
      starterMode: $('#task-starter').value,
      studentIds: $('#issue-students')?.value ?? state.teacherForm.studentIds,
      probes: $$('[data-task-probe]:checked').map((element) =>
        probeKey(choices[Number(element.dataset.taskProbe)]),
      ),
    });
    persistDraft();
  }
  function bindTeacher() {
    if ($('#teacher-review-cancel')) $('#teacher-review-cancel').onclick = teacher.cancelReview;
    for (const element of $$('[id^="task-"],#issue-students,[data-task-probe]'))
      element.addEventListener(
        element.type === 'checkbox' || element.tagName === 'SELECT' ? 'change' : 'input',
        readTeacherForm,
      );
    $('#teacher-create').onclick = safe(async () => {
      guardEditableSession();
      readTeacherForm();
      const selected = views()
        .possibleProbes()
        .filter((probe) => state.teacherForm.probes.includes(probeKey(probe)))
        .map(({ node, port, side }) => ({ node, port, side }));
      if (!selected.length || selected.length > 32)
        throw new Error(
          L('Оберіть від 1 до 32 сигналів для перевірки.', 'Choose 1–32 observed signals.'),
        );
      if (!state.sequence?.actions.length)
        throw new Error(L('Спочатку запишіть перевірочні дії.', 'Record the test actions first.'));
      await operations.run(() => teacher.createKey(selected));
    });
    bindFile('#teacher-key-import', async (files) =>
      teacher.importKey(await readClassroomFile(files[0])),
    );
    $('#teacher-key-export').onclick = safe(() =>
      downloadFile(
        serializeAssignmentKey(state.teacherKey),
        `${cleanName(state.teacherKey.title)}.teacher-key.json`,
      ),
    );
    if ($('#teacher-issue'))
      $('#teacher-issue').onclick = safe(() => {
        guardEditableSession();
        readTeacherForm();
        teacher.issueVariants();
        refreshVisible();
      });
    $$('[data-task-download]').forEach(
      (element) =>
        (element.onclick = safe(() => {
          const task = state.issued[Number(element.dataset.taskDownload)];
          downloadFile(
            serializeAssignment(task),
            `${cleanName(task.variant.studentId)}-${cleanName(task.title)}.assignment.json`,
          );
        })),
    );
    bindFile(
      '#teacher-review',
      async (files) => {
        const outcome = await teacher.reviewFiles(files);
        if (outcome.cancelled) {
          adapter.notify(
            L(
              'Перевірку зупинено. Завершені результати збережено; порівняння схожості не завершено.',
              'Checking stopped. Completed results are retained; similarity comparison is incomplete.',
            ),
          );
          return;
        }
        adapter.notify(
          L(
            `Перевірено робіт: ${state.batch.length}. Помилок файлів: ${state.batchErrors.length}.`,
            `Reviewed ${state.batch.length} submissions; ${state.batchErrors.length} file errors.`,
          ),
        );
      },
      true,
    );
    $('#teacher-report').onclick = safe(() =>
      downloadFile(
        JSON.stringify(teacher.report(), null, 2),
        `${cleanName(state.teacherKey.title)}.review.json`,
      ),
    );
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
    isRecording: () => state.recording,
    isPlaying: () => !!state.player,
    stopPlayback: session.stopPlayback,
    stopRecording,
    recordingDelta: session.recordingDelta,
    projectToSave: session.projectToSave,
    onSimulationStateChanged: session.simulationStateChanged,
  };
}
