import { $ } from '../shared/ui.js';
import {
  parseAssignment,
  createAttempt,
  createSubmission,
  serializeSubmission,
} from '../assessment/index.js';
import { stable } from '../assessment/canonical.js';
import { createStudentWork, serializeStudentWork, parseStudentWork } from './student-work-files.js';
import { studentProgress, progressMessage } from './student-progress.js';
import { cleanName, downloadFile } from './files.js';

export function createStudentActions({
  adapter,
  state,
  session,
  store,
  L,
  guardEditableSession,
  operations,
  review,
  changed,
}) {
  let installing = false;
  function install(project) {
    const previous = adapter.getProject();
    const runtime = adapter.getRuntime?.();
    const running = adapter.isRunning?.();
    installing = true;
    try {
      adapter.loadProject(project);
      if (stable(adapter.getProject()) !== stable(project))
        throw new Error(
          L(
            'Не вдалося відкрити схему. Попередню роботу збережено.',
            'The circuit could not be opened. Your previous work is preserved.',
          ),
        );
    } catch (error) {
      if (adapter.getProject() !== previous && adapter.adoptPlayback && runtime)
        adapter.adoptPlayback(previous, runtime);
      if (running !== undefined) adapter.setRunning(running);
      throw error;
    } finally {
      installing = false;
    }
  }
  function resetStatus() {
    state.studentBuildReady = false;
    state.studentDirty = true;
    state.studentLastSaveKind = null;
    state.studentSavedAt = null;
    state.workOrigin = null;
  }
  function checkIdentity() {
    if (!state.assignment)
      throw new Error(
        L('Спочатку відкрийте завдання викладача.', 'Open an instructor assignment first.'),
      );
    if (!state.student.name.trim() || !state.student.id.trim())
      throw new Error(
        L('Заповніть ім’я та ідентифікатор студента.', 'Enter your name and student ID.'),
      );
    if (
      state.assignment.variant.studentId &&
      state.assignment.variant.studentId !== state.student.id
    )
      throw new Error(
        L(
          'Цей варіант видано для іншого ідентифікатора студента.',
          'This variant was issued for another student ID.',
        ),
      );
  }
  function newAttempt() {
    checkIdentity();
    const next = createAttempt(state.assignment, state.student);
    install(structuredClone(state.assignment.starterProject));
    Object.assign(state, {
      attempt: next,
      sequence: null,
      observations: [],
      notes: '',
      dockOpen: true,
    });
    resetStatus();
    adapter.setRunning(false);
    store.saveProfile(state);
    changed(true);
    adapter.closeModal();
    adapter.notify(
      L(
        'Спробу розпочато. Умова й наступний крок — на панелі біля схеми.',
        'Attempt started. Instructions and your next step are beside the circuit.',
      ),
    );
  }
  function continueWork() {
    guardEditableSession();
    if (state.attempt) {
      adapter.closeModal();
      $('#viewport')?.focus();
      return;
    }
    checkIdentity();
    if (adapter.getProject().nodes.length)
      review({
        title: L('Відкрити початкову схему завдання?', 'Open the assignment starter?'),
        description: L(
          'Поточну схему буде замінено початковою схемою завдання.',
          'The current circuit will be replaced with the assignment starter.',
        ),
        confirm: L('Відкрити без збереження копії', 'Open without saving a copy'),
        apply: newAttempt,
      });
    else newAttempt();
  }
  function restartAttempt() {
    guardEditableSession();
    review({
      title: L('Почати цю спробу заново?', 'Restart this attempt?'),
      description: L(
        'Повернуться початкові елементи. Поточні з’єднання, запис дій, пояснення та журнал цієї спроби буде замінено.',
        'The starter components will return. Current wiring, recorded actions, explanation and this attempt’s journal will be replaced.',
      ),
      confirm: L('Почати заново без збереження копії', 'Restart without saving a copy'),
      apply: newAttempt,
    });
  }
  function importAssignment(source) {
    const assignment = parseAssignment(source);
    if (state.attempt && stable(assignment) === stable(state.assignment)) {
      adapter.closeModal();
      adapter.notify(
        L(
          'Це завдання вже відкрите. Продовжуйте поточну спробу.',
          'This assignment is already open. Continue the current attempt.',
        ),
      );
      return;
    }
    const apply = () => {
      Object.assign(state, {
        assignment,
        attempt: null,
        sequence: null,
        observations: [],
        notes: '',
        mode: 'student',
        dockOpen: true,
      });
      if (!state.student.id && assignment.variant.studentId)
        state.student.id = assignment.variant.studentId;
      resetStatus();
      store.saveProfile(state);
      changed(true);
      adapter.closeModal();
      adapter.notify(
        L(
          'Завдання відкрито. Заповніть ім’я й почніть спробу на панелі біля схеми.',
          'Assignment opened. Enter your name and start the attempt beside the circuit.',
        ),
      );
    };
    if (state.assignment || state.attempt || state.sequence || state.notes)
      review({
        title: L('Відкрити інше завдання?', 'Open another assignment?'),
        description: L(
          'Поточну спробу, запис перевірки й пояснення буде замінено. Схема залишиться до початку нової спроби.',
          'The current attempt, recorded test and explanation will be replaced. The circuit stays until you start the new attempt.',
        ),
        confirm: L('Відкрити без збереження копії', 'Open without saving a copy'),
        apply,
      });
    else apply();
  }
  async function importWork(source) {
    const work = await parseStudentWork(source);
    const apply = () => {
      install(work.project);
      Object.assign(state, {
        assignment: work.assignment,
        attempt: work.attempt,
        student: work.student,
        sequence: work.sequence,
        observations: work.observations || [],
        notes: work.notes,
        workOrigin: work.origin,
        mode: 'student',
        dockOpen: true,
        studentBuildReady: !!work.sequence || !!work.attempt?.journal.length,
        studentDirty: false,
        studentLastSaveKind: work.saveKind,
        studentSavedAt: new Date().toISOString(),
      });
      adapter.setRunning(false);
      store.saveProfile(state);
      changed(true);
      adapter.closeModal();
      adapter.notify(
        L(
          'Роботу відновлено. Ідентифікатор спроби та її журнал збережені.',
          'Work restored. Its attempt ID and construction journal are preserved.',
        ),
      );
    };
    if (state.attempt || state.assignment || adapter.getProject().nodes.length)
      review({
        title: L('Відкрити збережену роботу?', 'Open saved work?'),
        description: L(
          'Буде відновлено схему, завдання, запис і пояснення з файла. Поточну роботу можна спершу зберегти.',
          'The file’s circuit, assignment, recording and explanation will be restored. You can save your current work first.',
        ),
        confirm: L('Відкрити без збереження поточного', 'Open without saving current work'),
        apply,
      });
    else apply();
  }
  async function saveDraft() {
    const work = await createStudentWork({
      ...state,
      project: session.projectToSave(),
      origin: state.workOrigin,
    });
    downloadFile(
      serializeStudentWork(work),
      `${cleanName(state.student.id || 'student')}-${cleanName(adapter.getProject().name)}.student-work.json`,
    );
    state.studentDirty = false;
    state.studentLastSaveKind = 'draft';
    state.studentSavedAt = new Date().toISOString();
    changed();
    adapter.notify(
      L(
        'Чернетку підготовлено до завантаження. Відкрийте її через «Відкрити мою роботу».',
        'Draft prepared for download. Resume it with Open my work.',
      ),
    );
  }
  async function submit() {
    guardEditableSession();
    const progress = studentProgress(state, session.projectToSave());
    if (!progress.ready) throw new Error(progressMessage(progress, adapter.getLanguage()));
    await operations.run(async () => {
      const submission = await createSubmission({ ...state, project: session.projectToSave() });
      downloadFile(
        serializeSubmission(submission),
        `${cleanName(submission.student.id)}-${cleanName(submission.assignment.title)}.submission.json`,
      );
      state.studentDirty = false;
      state.studentLastSaveKind = 'submission';
      state.studentSavedAt = new Date().toISOString();
      changed();
      adapter.notify(
        L(
          'Файл роботи підготовлено. Передайте його викладачеві; його також можна відкрити для продовження.',
          'Work file prepared. Send it to your instructor; you can also reopen it to continue.',
        ),
      );
    });
  }
  return {
    continueWork,
    restartAttempt,
    importAssignment,
    importWork,
    saveDraft,
    submit,
    isInstalling: () => installing,
  };
}
