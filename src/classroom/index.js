import { fileErrorMessage } from './file-error-messages.js';
import { createSequenceVersion } from './sequence-version.js';
import { createKeyReference } from './key-reference.js';
import { syncPlaybackControls } from './playback-controls.js';
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
import { createReviewWorkController } from './review-work-controller.js';

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
  const version = createSequenceVersion(session);
  state.dockOpen ||= !!state.assignment;
  let activeTab = state.mode;
  let fileIntent = 0;
  const teacher = createTeacherWorkspace(state, {
    onSave: persistDraft,
    formatError: (error) =>
      fileErrorMessage(error, { language: adapter.getLanguage(), mode: 'teacher' }),
    onProgress: () => {
      if ($('#review-results')) $('#review-results').innerHTML = views().reviewMarkup();
      if ($('#teacher-review-cancel')) $('#teacher-review-cancel').onclick = teacher.cancelReview;
    },
  });
  const operations = createClassroomOperations((busy) => {
    state.busy = busy;
    updateDock(true);
    if (busy) lockBusyFields();
    else refreshVisible();
  });
  const views = () =>
    createClassroomView({
      state,
      language: adapter.getLanguage(),
      project: session.projectToSave(),
      example: adapter.getExample(),
    });
  const controls = createActionControls({ adapter, state, session, L, guardIdle, operations });
  const dock = createDockController({ adapter, state, session, L, views, safe, open, controls });
  const { bindSequence, playExample } = createSequenceController({
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
    open,
    refreshVisible,
    controls,
  });
  const reference = createKeyReference({
    adapter,
    state,
    session,
    teacher,
    L,
    safe,
    operations,
    guardEditableSession,
    updateDock,
    persistDraft,
  });
  const openReviewedWork = createReviewWorkController({
    adapter,
    session,
    operations,
    guardEditableSession,
    L,
  });
  const { bindTeacher } = createTeacherController({
    adapter: {
      ...adapter,
      getProject: session.projectToSave,
      openReviewedWork,
      openKeyReference: reference.openKeyReference,
    },
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
  function lockBusyFields() {
    $$(
      '.classroom-content button:not(#teacher-review-cancel), .classroom-content input, .classroom-content textarea, .classroom-content select',
    ).forEach((element) => {
      element.disabled = true;
    });
  }
  function updateDock(force = false) {
    state.sequenceVersion = version.refresh();
    dock.updateDock(force);
    const locked = controls.isLocked();
    if ($('#project-name')) $('#project-name').disabled = locked;
    adapter.updateRoutingControls?.(locked);
    student.updateProgress();
    syncPlaybackControls(state, adapter.getLanguage());
  }
  function persistDraft() {
    store.saveDraft({ ...state, sequence: session.sequenceToSave() });
  }
  function safe(action) {
    return async (...args) => {
      try {
        await action(...args);
      } catch (error) {
        adapter.notify(
          fileErrorMessage(error, { language: adapter.getLanguage(), mode: state.mode }),
        );
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
        updateDock(true);
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
    if (state.busy) lockBusyFields();
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
        {
          multiple,
          onError: (error) =>
            adapter.notify(
              fileErrorMessage(error, { language: adapter.getLanguage(), mode: state.mode }),
            ),
        },
      );
    });
  }
  return {
    mount: () => {
      state.sequenceVersion = version.refresh(true);
      dock.mount();
      student.updateProgress();
    },
    getMode: () => state.mode,
    refreshTransport: () => syncPlaybackControls(state, adapter.getLanguage()),
    shouldWarnBeforeUnload: () => teacher.hasUnsavedKeys(),
    togglePlaybackRunning: () => {
      if (state.player && !state.player.done) session.pausePlayback();
      else
        adapter.notify(
          L(
            'Завершіть перегляд, щоб повернутися до симуляції.',
            'End preview to return to simulation.',
          ),
        );
    },
    addObservation: (text) => {
      guardEditableSession();
      const next = [state.notes.trim(), text].filter(Boolean).join('\n\n');
      if (next.length > 20_000)
        throw new Error(
          L(
            'Пояснення перевищує 20 000 символів. Скоротіть його перед додаванням спостереження.',
            'The explanation exceeds 20,000 characters. Shorten it before adding the observation.',
          ),
        );
      state.notes = next;
      state.studentDirty = true;
      persistDraft();
      updateDock();
    },
    recovery: store.recovery,
    acknowledgeRecovery: store.acknowledgeRecovery,
    open,
    playExample,
    isDemonstrating: () => state.reviewMode === 'demo',
    tick: controls.tick,
    inputChanged: controls.inputChanged,
    allowEdit: () => student.isInstalling() || reference.isInstalling() || controls.allowEdit(),
    allowInput: controls.allowInput,
    observeEdit: () => {
      state.sequenceVersion = version.refresh(true);
      if (!reference.isInstalling()) student.observeEdit();
      updateDock();
    },
    isLocked: controls.isLocked,
    isRecording: () => state.recording,
    isPlaying: () => !!state.player || !!state.preview,
    isPlaybackRunning: () => !!state.player && !state.player.done && state.playbackRunning,
    isPlaybackComplete: () => !!state.player?.done,
    stopPlayback: session.stopPlayback,
    stopRecording: controls.stopRecording,
    recordingDelta: session.recordingDelta,
    recordingStepAllowance: session.recordingStepAllowance,
    projectToSave: session.projectToSave,
    viewportToSave: session.viewportToSave,
    onSimulationStateChanged: session.simulationStateChanged,
  };
}
