import { $, $$ } from '../shared/ui.js';
import { sequenceIsStale, studentProgress, progressMessage } from './student-progress.js';
import { studentWorkflow } from './student-view.js';

export function createStudentProgressController({
  adapter,
  state,
  session,
  actions,
  controls,
  open,
  safe,
  persistDraft,
}) {
  const editableSequence = () => (state.reviewMode ? session.sequenceToSave() : state.sequence);
  const progressState = () =>
    state.reviewMode ? { ...state, sequence: editableSequence() } : state;
  let lastSequence = editableSequence();
  let stale = sequenceIsStale(lastSequence, session.projectToSave());
  let lastMarkup = '';
  function refreshStaleness() {
    stale = sequenceIsStale(editableSequence(), session.projectToSave());
  }
  function reset() {
    lastSequence = editableSequence();
    refreshStaleness();
    lastMarkup = '';
  }
  function record() {
    if (!state.attempt) return open('student');
    state.studentBuildReady = true;
    state.studentDirty = true;
    persistDraft();
    controls.startRecording();
  }
  function showStudent(focusNotes = false) {
    if (state.attempt && !focusNotes) {
      adapter.closeModal();
      $('#viewport')?.focus();
      return;
    }
    open('student');
    if (focusNotes) $('#student-notes')?.focus();
  }
  function bindProgress() {
    $$('[data-student-action]', $('#student-workflow')).forEach(
      (button) =>
        (button.onclick = safe(() => {
          const action = button.dataset.studentAction;
          if (action === 'task') {
            open('student');
            $('.classroom-task')?.scrollIntoView({ block: 'nearest' });
          } else if (action === 'record') record();
          else if (action === 'finish') controls.stopRecording();
          else if (action === 'stop') session.stopPlayback();
          else if (action === 'save') return actions.submit();
          else {
            const progress = studentProgress(progressState(), session.projectToSave(), { stale });
            if (progress.code === 'explain') showStudent(true);
            else if (
              progress.code === 'identity' ||
              progress.code === 'identityMismatch' ||
              !state.attempt
            )
              open('student');
            else showStudent();
          }
        })),
    );
  }
  function update() {
    if (lastSequence !== editableSequence()) {
      lastSequence = editableSequence();
      refreshStaleness();
      if (state.attempt && !state.reviewMode) {
        state.studentDirty = true;
        persistDraft();
      }
    }
    if (state.recording) state.studentDirty = true;
    const progress = studentProgress(progressState(), session.projectToSave(), { stale });
    const root = $('#student-workflow');
    if (root) {
      root.hidden = state.mode !== 'student' || !state.assignment || !!state.reviewMode;
      if (!root.hidden) {
        const markup = studentWorkflow({ state, language: adapter.getLanguage(), progress });
        if (markup !== lastMarkup || !root.innerHTML) {
          const expanded = !!$('[data-student-condition]', root)?.open;
          root.innerHTML = markup;
          const details = $('[data-student-condition]', root);
          if (details) details.open = expanded;
          lastMarkup = markup;
          bindProgress();
        }
      }
    }
    const reason = progressMessage(progress, adapter.getLanguage());
    for (const id of ['student-next-message', 'student-export-reason'])
      if ($('#' + id)) $('#' + id).textContent = reason;
    if ($('#student-submit')) $('#student-submit').disabled = !progress.ready;
    if ($('#student-stale')) $('#student-stale').hidden = !progress.stale;
    if ($('#student-rerecord'))
      $('#student-rerecord').disabled =
        !state.attempt || state.busy || !!state.player || !!state.preview || state.recording;
    return progress;
  }
  return {
    update,
    reset,
    refreshStaleness,
    record,
    markup: () =>
      studentWorkflow({
        state,
        language: adapter.getLanguage(),
        progress: studentProgress(progressState(), session.projectToSave(), { stale }),
      }),
  };
}
