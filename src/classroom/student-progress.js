import { sameCircuitStructure } from '../assessment/topology.js';
import { sequenceWork, workLimitMessage } from '../experiments/replay-work-policy.js';

export function sequenceIsStale(sequence, project) {
  if (!sequence) return false;
  try {
    return sameCircuitStructure(project, sequence.initialProject) !== true;
  } catch {
    return true;
  }
}
export function studentProgress(
  state,
  project,
  { stale = sequenceIsStale(state.sequence, project) } = {},
) {
  const identity = !!state.student?.name?.trim() && !!state.student?.id?.trim();
  const mismatch =
    !!state.assignment?.variant.studentId &&
    state.assignment.variant.studentId !== state.student?.id;
  const active = !!state.attempt && state.attempt.assignment.id === state.assignment?.id;
  const built =
    active && (!!state.studentBuildReady || !!state.attempt.journal.length || !!state.sequence);
  const recorded = !!state.sequence?.actions?.length && !stale && !state.recording;
  const work = recorded ? sequenceWork(state.sequence, project) : null;
  const explained = !!state.notes?.trim();
  let code = !state.assignment
    ? 'task'
    : !identity
      ? 'identity'
      : mismatch
        ? 'identityMismatch'
        : !active
          ? 'start'
          : state.recording
            ? 'recording'
            : state.player || state.preview
              ? 'playing'
              : stale
                ? 'stale'
                : !built
                  ? 'build'
                  : !recorded
                    ? 'record'
                    : work.requiresVerification && !work.verified
                      ? 'verify'
                      : !work.supported
                        ? 'workLimit'
                        : !explained
                          ? 'explain'
                          : 'save';
  if (state.busy) code = 'busy';
  const ready =
    !!state.assignment &&
    identity &&
    !mismatch &&
    active &&
    recorded &&
    work.supported &&
    explained &&
    !state.busy &&
    !state.player &&
    !state.preview;
  const saved = ready && !state.studentDirty && state.studentLastSaveKind === 'submission';
  return {
    code,
    ready,
    saved,
    draftSaved: !state.studentDirty && state.studentLastSaveKind === 'draft',
    stale,
    active,
    built,
    recorded,
    work,
    explained,
    identity,
    mismatch,
    steps: [
      !!state.assignment && identity && !mismatch,
      built,
      recorded && !!work?.supported,
      explained,
      saved,
    ],
  };
}
const messages = {
  task: [
    'Відкрийте завдання викладача або свою збережену роботу.',
    'Open your instructor assignment or your saved work.',
  ],
  identity: ['Заповніть ім’я та ідентифікатор студента.', 'Enter your name and student ID.'],
  identityMismatch: [
    'Ідентифікатор не збігається зі студентом, для якого видано варіант.',
    'The student ID does not match the assigned variant.',
  ],
  start: [
    'Почніть спробу: відкриється початкова схема цього завдання.',
    'Start the attempt to open this assignment’s starter circuit.',
  ],
  recording: [
    'Запис триває. Виконайте перевірку та завершіть запис дій.',
    'Recording is active. Perform the test and finish recording actions.',
  ],
  playing: [
    'Зупиніть відтворення, щоб повернутися до своєї роботи.',
    'Stop replay to return to your own work.',
  ],
  stale: [
    'Схему змінено після запису. Запишіть перевірку ще раз.',
    'The circuit changed after recording. Record the test again.',
  ],
  build: [
    'Побудуйте схему. Коли готові, перейдіть до запису перевірки.',
    'Build the circuit. When ready, record your test.',
  ],
  record: [
    'Запишіть перевірку: змініть хоча б один вхід і завершіть запис.',
    'Record a test: change at least one input, then finish recording.',
  ],
  explain: [
    'Поясніть, що перевіряли та чому отримали такий результат.',
    'Explain what you tested and why you obtained this result.',
  ],
  save: [
    'Робота готова. Збережіть файл і передайте його викладачеві.',
    'Your work is ready. Save the file and send it to your instructor.',
  ],
  busy: ['Дочекайтеся завершення поточної операції.', 'Wait for the current operation to finish.'],
};
export function progressMessage(progress, language) {
  if (progress.code === 'workLimit' || progress.code === 'verify')
    return workLimitMessage(progress.work, language);
  if (progress.saved)
    return language === 'ua'
      ? 'Файл роботи підготовлено. Передайте його викладачеві.'
      : 'The work file is prepared. Send it to your instructor.';
  if (progress.ready && progress.draftSaved)
    return language === 'ua'
      ? 'Чернетку збережено для продовження. Для здачі підготуйте файл роботи для викладача.'
      : 'A draft is saved for later. Export the instructor work file to submit it.';
  return messages[progress.code][language === 'ua' ? 0 : 1];
}
