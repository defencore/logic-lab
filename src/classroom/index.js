import '../styles/classroom.css';
import { $, $$ } from '../shared/ui.js';
import { createActionSession } from './action-session.js';
import { createClassroomStorage } from './storage.js';
import { chooseClassroomFiles, createClassroomOperations } from './files.js';
import { createClassroomView } from './view.js';
import { createTeacherWorkspace } from './teacher-workspace.js';
import { createActionControls } from './action-controls.js';
import { createDockController } from './dock-controller.js';
import { createSequenceController } from './sequence-controller.js';
import { createStudentWorkspace } from './student-workspace.js';
import { createTeacherController } from './teacher-controller.js';

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
  let fileIntent = 0;
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
  const controls = createActionControls({ adapter, state, session, L, guardIdle });
  const dock = createDockController({ adapter, state, session, L, views, safe, open, controls });
  const { bindSequence } = createSequenceController({
    adapter,
    state,
    session,
    safe,
    bindFile,
    guardEditableSession,
    refreshVisible,
    controls,
  });
  const student = createStudentWorkspace({
    adapter,
    state,
    session,
    store,
    L,
    persistDraft,
    updateDock,
    guardEditableSession,
    safe,
    bindFile,
    operations,
  });
  const { bindTeacher } = createTeacherController({
    adapter,
    state,
    teacher,
    L,
    views,
    persistDraft,
    guardEditableSession,
    safe,
    bindFile,
    operations,
    refreshVisible,
  });
  function updateDock(force = false) {
    dock.updateDock(force);
  }
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
    else student.bindStudent();
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
  return {
    mount: dock.mount,
    open,
    tick: controls.tick,
    inputChanged: controls.inputChanged,
    allowEdit: controls.allowEdit,
    allowInput: controls.allowInput,
    observeEdit: student.observeEdit,
    isLocked: controls.isLocked,
    isRecording: () => state.recording,
    isPlaying: () => !!state.player,
    stopPlayback: session.stopPlayback,
    stopRecording: controls.stopRecording,
    recordingDelta: session.recordingDelta,
    projectToSave: session.projectToSave,
    onSimulationStateChanged: session.simulationStateChanged,
  };
}
