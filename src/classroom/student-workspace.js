import { $, $$ } from '../shared/ui.js';
import {
  parseAssignment,
  createAttempt,
  recordEdit,
  createSubmission,
  serializeSubmission,
} from '../assessment/index.js';
import { cleanName, downloadFile, readClassroomFile } from './files.js';

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
}) {
  let installingStarter = false;
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
  return { bindStudent, observeEdit };
}
