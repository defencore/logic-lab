import { $, $$ } from '../shared/ui.js';
import { sanitizeTeacherForm } from './storage.js';
import { probeKey } from './teacher-state.js';
import {
  serializeAssignment,
  serializeAssignmentKey,
  assignmentForVariant,
} from '../assessment/index.js';
import { cleanName, downloadFile, readClassroomFile } from './files.js';
import { studentTasksZip, reviewCsv } from './teacher-downloads.js';
import { bindReviewControls } from './review-controller.js';
import { bindProbePicker, teacherProbeIds, probeCriteriaMessage } from './probe-picker.js';

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
  const protect = (action) =>
    safe(async (...args) => {
      try {
        return await action(...args);
      } catch (error) {
        if (error.code?.startsWith('teacher_probe_'))
          throw new Error(probeCriteriaMessage(error, adapter.getLanguage()));
        if (error.code?.startsWith('file_') || error.code?.startsWith('assessment_')) throw error;
        const messages = [
          [
            /reference circuit changed after recording/i,
            'Еталонну схему змінено після запису. Запишіть перевірку її остаточної версії та створіть новий ключ.',
          ],
          [
            /unapplied changes/i,
            'Є незастосовані зміни. Застосуйте назву й умову або створіть новий еталонний ключ перед видачею.',
          ],
          [
            /reference, observed signals or starter changed/i,
            'Змінено еталон, контрольні виходи або заготовку. Створіть новий ключ; попередній залишається окремо.',
          ],
          [
            /Resolve unknown or floating/i,
            'Еталон має невизначені контрольні виходи. Усуньте X/Z перед видачею завдань.',
          ],
          [
            /Enter 1–40 student IDs/i,
            'Вкажіть від 1 до 40 ідентифікаторів студентів, по одному в рядку, до 100 символів.',
          ],
          [
            /at most 200 issued/i,
            'У ключі може бути до 200 варіантів. Збережіть цей ключ і створіть новий для наступної групи.',
          ],
          [
            /reference scenario is too complex/i,
            'Перевірочний сценарій надто складний. Скоротіть його тривалість.',
          ],
          [
            /archive exceeds 100 MB/i,
            'Архів перевищує 100 МБ. Завантажуйте файли меншими групами.',
          ],
        ];
        const match = messages.find(([pattern]) => pattern.test(error.message));
        throw new Error(match ? L(match[1], error.message) : error.message);
      }
    });
  function updateTeacherUi() {
    const locked = !!(state.busy || state.recording || state.player || state.preview);
    const status = teacher.status(adapter.getProject());
    if ($('#teacher-status-message'))
      $('#teacher-status-message').textContent = views().teacherStatusMarkup();
    if ($('#teacher-edit-status')) $('#teacher-edit-status').dataset.dirty = String(status.dirty);
    if ($('#teacher-apply'))
      $('#teacher-apply').disabled =
        !status.metadataChanged ||
        status.structuralChanged ||
        (status.referenceChanged && !status.usingSavedReference) ||
        locked;
    if ($('#teacher-discard'))
      $('#teacher-discard').disabled = !status.hasKey || !status.dirty || locked;
    if ($('#teacher-issue'))
      $('#teacher-issue').disabled =
        !status.hasKey || status.dirty || locked || !!state.referenceWarnings?.undefined;
    if ($('#teacher-tasks-zip'))
      $('#teacher-tasks-zip').disabled = !state.issued?.length || status.dirty || locked;
    $$('[data-task-download]').forEach((button) => (button.disabled = status.dirty || locked));
  }
  function readTeacherForm() {
    if (state.busy) return;
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
    updateTeacherUi();
  }
  function selectedProbes() {
    const choices = views().possibleProbes();
    const selected = state.teacherForm.probes.map((id) =>
      choices.find((probe) => probeKey(probe) === id),
    );
    if (selected.some((probe) => !probe || probe.missing))
      throw Object.assign(new Error('Missing observed signals.'), {
        code: 'teacher_probe_invalid',
      });
    if (!selected.length || selected.length > 32)
      throw new Error(
        L('Оберіть від 1 до 32 сигналів для перевірки.', 'Choose 1–32 observed signals.'),
      );
    return selected.map(({ node, port, side }) => ({ node, port, side }));
  }
  function downloadTasks(tasks, title) {
    downloadFile(
      studentTasksZip(tasks),
      `${cleanName(title)}-student-assignments.zip`,
      'application/zip',
    );
  }
  function bindReview() {
    bindReviewControls({ adapter, state, guardEditableSession, protect, views });
  }
  function reportReview(outcome) {
    adapter.notify(
      outcome.cancelled
        ? L(
            'Перевірку зупинено. Завершені результати збережено; порівняння схожості не завершено.',
            'Checking stopped. Completed results are retained; similarity comparison is incomplete.',
          )
        : L(
            `Перевірено робіт: ${state.batch.length}. Помилок файлів: ${state.batchErrors.length}.`,
            `Reviewed ${state.batch.length} submissions; ${state.batchErrors.length} file errors.`,
          ),
    );
  }
  function bindTeacher() {
    if ($('#teacher-review-cancel')) $('#teacher-review-cancel').onclick = teacher.cancelReview;
    const readFromInput = () => {
      try {
        readTeacherForm();
      } catch (error) {
        adapter.notify(probeCriteriaMessage(error, adapter.getLanguage()));
      }
    };
    for (const element of $$('#task-title,#task-instructions,#task-starter,#issue-students'))
      element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', readFromInput);
    const choices = views().possibleProbes();
    bindProbePicker({
      choices,
      selected: teacherProbeIds(state, choices),
      language: adapter.getLanguage(),
      canChange: () => !(state.busy || state.recording || state.player || state.preview),
      onChange: readFromInput,
    });
    $('#teacher-edit-circuit').onclick = () => adapter.closeModal();
    if ($('#teacher-view-reference'))
      $('#teacher-view-reference').onclick = protect(() => {
        guardEditableSession();
        return adapter.openKeyReference(state.teacherKey, { edit: false });
      });
    if ($('#teacher-edit-reference'))
      $('#teacher-edit-reference').onclick = protect(() => {
        guardEditableSession();
        return adapter.openKeyReference(state.teacherKey, { edit: true });
      });
    $('#teacher-record-sequence').onclick = () => $('#class-tab-sequence').click();
    $('#teacher-apply').onclick = protect(() => {
      guardEditableSession();
      readTeacherForm();
      teacher.applyChanges(adapter.getProject());
      refreshVisible();
    });
    $('#teacher-discard').onclick = protect(() => {
      guardEditableSession();
      teacher.discardChanges(adapter.getProject());
      refreshVisible();
    });
    $('#teacher-create').onclick = protect(async () => {
      guardEditableSession();
      readTeacherForm();
      const selected = selectedProbes();
      if (!state.sequence?.actions.length)
        throw new Error(L('Спочатку запишіть перевірочні дії.', 'Record the test actions first.'));
      await operations.run(() => teacher.createKey(selected, adapter.getProject()));
    });
    bindFile('#teacher-key-import', async (files) =>
      teacher.importKey(await readClassroomFile(files[0]), adapter.getProject()),
    );
    $('#teacher-key-export').onclick = protect(() => {
      downloadFile(
        serializeAssignmentKey(state.teacherKey),
        `${cleanName(state.teacherKey.title)}.teacher-key.json`,
      );
      teacher.markKeyDownloaded();
      refreshVisible();
    });
    $('#teacher-issue').onclick = protect(() => {
      guardEditableSession();
      readTeacherForm();
      teacher.issueVariants(adapter.getProject());
      refreshVisible();
    });
    $('#teacher-tasks-zip').onclick = protect(() => {
      readTeacherForm();
      if (teacher.status(adapter.getProject()).dirty)
        throw new Error(L('Спочатку застосуйте зміни.', 'Apply the changes first.'));
      downloadTasks(state.issued, state.teacherKey.title);
    });
    $$('[data-task-download]').forEach(
      (element) =>
        (element.onclick = protect(() => {
          if (teacher.status(adapter.getProject()).dirty)
            throw new Error(L('Спочатку застосуйте зміни.', 'Apply the changes first.'));
          const task = state.issued[Number(element.dataset.taskDownload)];
          downloadFile(
            serializeAssignment(task),
            `${cleanName(task.variant.studentId)}-${cleanName(task.title)}.assignment.json`,
          );
        })),
    );
    if ($('#teacher-preview-variant'))
      $('#teacher-preview-variant').onchange = (event) => {
        state.teacherPreviewIndex = Number(event.target.value);
        $('#teacher-starter-preview').innerHTML = views().starterPreviewMarkup();
      };
    $$('[data-archive-key]').forEach(
      (button) =>
        (button.onclick = protect(() => {
          const entry = state.teacherArchives[Number(button.dataset.archiveKey)];
          downloadFile(
            serializeAssignmentKey(entry.key),
            `${cleanName(entry.key.title)}-${entry.key.id.slice(0, 8)}.teacher-key.json`,
          );
          teacher.markArchiveDownloaded(Number(button.dataset.archiveKey));
          refreshVisible();
        })),
    );
    $$('[data-archive-tasks]').forEach(
      (button) =>
        (button.onclick = protect(() => {
          const key = state.teacherArchives[Number(button.dataset.archiveTasks)].key;
          downloadTasks(
            key.issued.map((variant) => assignmentForVariant(key, variant.id)),
            key.title,
          );
        })),
    );
    bindFile(
      '#teacher-review',
      async (files) => {
        reportReview(await teacher.reviewFiles(files));
      },
      true,
    );
    if ($('#teacher-review-current-key'))
      $('#teacher-review-current-key').onclick = () => $('#teacher-key-import').click();
    if ($('#teacher-review-retry'))
      $('#teacher-review-retry').onclick = protect(async () => {
        guardEditableSession();
        reportReview(await operations.run(() => teacher.retryReview()));
      });
    $('#teacher-report').onclick = protect(() =>
      downloadFile(
        JSON.stringify(teacher.report(), null, 2),
        `${cleanName(state.teacherKey.title)}.review.json`,
      ),
    );
    $('#teacher-report-csv').onclick = protect(() =>
      downloadFile(
        reviewCsv(teacher.report()),
        `${cleanName(state.teacherKey.title)}.review.csv`,
        'text/csv;charset=utf-8',
      ),
    );
    bindReview();
    updateTeacherUi();
  }
  return { bindTeacher, bindReview };
}
