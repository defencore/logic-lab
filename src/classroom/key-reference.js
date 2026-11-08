import { $, esc } from '../shared/ui.js';
import { validateProject } from '../circuits/project.js';
import { validateSequence } from '../experiments/actions.js';
import { createStudentWork, serializeStudentWork } from './student-work-files.js';
import { cleanName, downloadFile } from './files.js';

export function createKeyReference({
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
}) {
  let installing = false;
  function editCopy(key) {
    const project = validateProject(structuredClone(key.referenceProject));
    const sequence = validateSequence(key.sequence);
    const fields = [
      'sequence',
      'observations',
      'dockOpen',
      'playbackRunning',
      'simulationRunning',
      'teacherEditorBaseline',
      'teacherSequenceBaseline',
      'teacherUseSavedReference',
    ];
    const snapshot = fields.map((name) => ({
      name,
      exists: Object.hasOwn(state, name),
      value: state[name],
    }));
    const restoreSession = () =>
      snapshot.forEach(({ name, exists, value }) => {
        if (exists) state[name] = value;
        else delete state[name];
      });
    const previous = {
      project: adapter.getProject(),
      runtime: adapter.getRuntime(),
      viewport: adapter.getViewport?.(),
      lessonStep: adapter.getLessonStep?.(),
      running: adapter.isRunning?.(),
    };
    installing = true;
    try {
      adapter.loadProject(project);
      if (adapter.getProject() !== project)
        throw new Error(
          L('Не вдалося відкрити копію еталона.', 'The reference copy could not be opened.'),
        );
      session.setSequence(sequence);
      if (!teacher.markReferenceCopyOpened(project, sequence))
        throw new Error(
          L('Копія не відповідає еталону ключа.', 'The copy does not match the key reference.'),
        );
      adapter.setRunning(false);
      adapter.closeModal();
      updateDock(true);
      adapter.notify(
        L(
          'Відкрито редаговану копію. Ключ та видані варіанти збережені; після змін створіть новий ключ.',
          'An editable copy is open. The key and issued variants are preserved; create a new key after making changes.',
        ),
      );
    } catch (error) {
      restoreSession();
      if (previous.lessonStep !== undefined) adapter.restoreLessonStep?.(previous.lessonStep);
      adapter.adoptPlayback(previous.project, previous.runtime);
      if (previous.viewport) adapter.restoreViewport?.(previous.viewport);
      if (previous.running !== undefined) adapter.setRunning(previous.running);
      restoreSession();
      persistDraft();
      updateDock(true);
      throw error;
    } finally {
      installing = false;
    }
  }
  function openKeyReference(key, { edit = false } = {}) {
    guardEditableSession();
    if (!edit) {
      adapter.closeModal();
      session.reviewWork(key.referenceProject, null, { kind: 'reference', label: key.title });
      adapter.fitProject?.();
      updateDock(true);
      return;
    }
    adapter.showModal(
      `<h2>${L('Редагувати копію еталона?', 'Edit a reference copy?')}</h2><p><strong>${esc(key.title)}</strong> · ${esc(key.referenceProject.name)}</p><p>${L('Поточну схему й сценарій редактора буде замінено копією еталона та перевірочними діями ключа. Сам ключ і видані варіанти залишаться без змін. Збережіть поточну роботу перед заміною.', 'The editor circuit and sequence will be replaced with a copy of the key reference and its test actions. The key and issued variants remain unchanged. Save your current work before replacing it.')}</p><div class="modal-actions"><button id="reference-copy-cancel" class="soft-btn">${L('Залишити поточну роботу', 'Keep current work')}</button><button id="reference-copy-backup" class="primary-btn">${L('Зберегти поточну роботу й відкрити копію', 'Save current work and open copy')}</button><button id="reference-copy-open" class="soft-btn">${L('Відкрити копію без збереження поточного', 'Open copy without saving current work')}</button></div>`,
    );
    const cancel = $('#reference-copy-cancel'),
      open = $('#reference-copy-open'),
      backup = $('#reference-copy-backup');
    let preparing = false;
    cancel.onclick = () => {
      if (!preparing) adapter.closeModal();
    };
    open.onclick = safe(() => {
      if (preparing) return;
      guardEditableSession();
      editCopy(key);
    });
    backup.onclick = safe(async () => {
      if (preparing) return;
      guardEditableSession();
      preparing = true;
      for (const button of [cancel, open, backup]) button.disabled = true;
      try {
        await operations.run(async () => {
          const copy = await createStudentWork({ ...state, project: session.projectToSave() });
          downloadFile(
            serializeStudentWork(copy),
            `${cleanName(copy.project.name)}.student-work.json`,
          );
          // Closing or replacing this confirmation while the backup is prepared cancels installation.
          if ($('#reference-copy-open') === open) editCopy(key);
        });
      } finally {
        preparing = false;
        for (const button of [cancel, open, backup]) button.disabled = false;
      }
    });
  }
  return { openKeyReference, isInstalling: () => installing };
}
