import { $, $$ } from '../shared/ui.js';
import { sanitizeTeacherForm } from './storage.js';
import { probeKey } from './teacher-workspace.js';
import { serializeAssignment, serializeAssignmentKey } from '../assessment/index.js';
import { cleanName, downloadFile, readClassroomFile } from './files.js';

export function createTeacherController({
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
}) {
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
  return { bindTeacher };
}
