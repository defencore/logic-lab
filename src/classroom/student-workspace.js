import { $, $$ } from '../shared/ui.js';
import { recordEdit } from '../assessment/index.js';
import { readClassroomFile } from './files.js';
import { createStudentActions } from './student-actions.js';
import { createStudentReplacement } from './student-replacement.js';
import { createStudentProgressController } from './student-progress-controller.js';

export function createStudentWorkspace({
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
  controls,
}) {
  let actions, progress;
  const review = createStudentReplacement({
    adapter,
    state,
    L,
    safe,
    operations,
    guardEditableSession,
    saveDraft: () => actions.saveDraft(),
  });
  function changed(reset = false) {
    if (reset) progress?.reset();
    persistDraft();
    updateDock();
    progress?.update();
  }
  actions = createStudentActions({
    adapter,
    state,
    session,
    store,
    L,
    guardEditableSession,
    operations,
    review,
    changed,
  });
  progress = createStudentProgressController({
    adapter,
    state,
    session,
    actions,
    controls,
    open,
    safe,
    persistDraft,
  });
  function readIdentity() {
    if (state.busy) return;
    const previous = JSON.stringify([state.student, state.notes]);
    if ($('#student-name'))
      state.student = {
        name: $('#student-name').value.trim(),
        id: $('#student-id').value.trim(),
        group: $('#student-group').value.trim(),
      };
    if ($('#student-notes')) state.notes = $('#student-notes').value;
    if (previous !== JSON.stringify([state.student, state.notes])) state.studentDirty = true;
    store.saveProfile(state);
    changed();
  }
  function bindStudent() {
    $$('[id^="student-"]')
      .filter((element) => ['INPUT', 'TEXTAREA'].includes(element.tagName))
      .forEach((element) => (element.oninput = readIdentity));
    bindFile('#student-task-import', async (files) =>
      actions.importAssignment(await readClassroomFile(files[0])),
    );
    bindFile('#student-work-import', async (files) =>
      actions.importWork(await readClassroomFile(files[0])),
    );
    $('#student-start').onclick = safe(() => {
      readIdentity();
      actions.continueWork();
    });
    if ($('#student-restart'))
      $('#student-restart').onclick = safe(() => {
        readIdentity();
        actions.restartAttempt();
      });
    $('#student-rerecord').onclick = safe(progress.record);
    $('#student-save-draft').onclick = safe(() => {
      readIdentity();
      guardEditableSession();
      return operations.run(actions.saveDraft);
    });
    $('#student-submit').onclick = safe(() => {
      readIdentity();
      return actions.submit();
    });
    progress.update();
  }
  function observeEdit() {
    if (actions.isInstalling()) return;
    progress.refreshStaleness();
    if (state.attempt && !state.player && !state.preview && !state.busy) {
      state.studentDirty = true;
      if (!session.isLocked())
        try {
          recordEdit(state.attempt, adapter.getProject(), {
            at: Math.max(0, (Date.now() - Date.parse(state.attempt.startedAt)) / 1000),
            event: 'circuit-edit',
          });
        } catch (error) {
          adapter.notify(error.message);
        }
      persistDraft();
    }
    progress.update();
  }
  return {
    bindStudent,
    observeEdit,
    updateProgress: progress.update,
    progressMarkup: progress.markup,
    continueWork: actions.continueWork,
    restartAttempt: actions.restartAttempt,
    importWork: actions.importWork,
    isInstalling: actions.isInstalling,
  };
}
