import {
  createAssignment,
  issueAssignment,
  assignmentForVariant,
  parseAssignmentKey,
  parseSubmission,
  gradeSubmission,
  compareSubmissionsAsync,
} from '../assessment/index.js';
import { readClassroomFile } from './files.js';
import { sanitizeTeacherForm } from './storage.js';
import { sameCircuitStructure } from '../assessment/topology.js';
import { yieldToMain } from '../assessment/scheduling.js';

import { inspectReference } from './reference-inspection.js';
import { probeKey, teacherStatus, sequenceSignature, keySignature } from './teacher-state.js';
import {
  reviseAssignmentMetadata,
  publicStarterPreview,
} from '../assessment/assignment-revision.js';
export { inspectReference } from './reference-inspection.js';
export { probeKey } from './teacher-state.js';

/** Teacher operations commit a complete result only after validation/replay succeeds. */
export function createTeacherWorkspace(state, { onSave = () => {}, onProgress = () => {} } = {}) {
  let reviewController = null;
  function setKey(key, warnings, project, saved = false) {
    if (state.teacherKey && keySignature(state.teacherKey) !== keySignature(key)) {
      state.teacherArchives ||= [];
      state.teacherArchives.push({
        key: structuredClone(state.teacherKey),
        downloaded: !teacherStatus(state).keyNeedsDownload,
      });
    }
    state.teacherSequenceBaseline = sequenceSignature(state.sequence);
    state.teacherEditorBaseline = project ? structuredClone(project) : null;
    state.teacherUseSavedReference = null;
    state.teacherSavedKeySignature = saved ? keySignature(key) : null;
    state.teacherKey = key;
    state.teacherPreviewIndex = 0;
    state.referenceWarnings = warnings;
    state.issued = key.issued.map((variant) => assignmentForVariant(key, variant.id));
    state.batch = [];
    state.pairs = [];
    state.batchErrors = [];
    state.reviewCancelled = false;
    state.reviewComparisonComplete = false;
    state.teacherForm = sanitizeTeacherForm({
      title: key.title,
      instructions: key.instructions,
      starterMode: key.starterMode,
      probes: key.probes.map(probeKey),
    });
    onSave();
  }
  async function createKey(probes, project) {
    if (project && sameCircuitStructure(project, state.sequence?.initialProject) !== true)
      throw new Error(
        'The reference circuit changed after recording. Record its final version before creating a new key.',
      );
    const key = createAssignment({
      title: state.teacherForm.title,
      instructions: state.teacherForm.instructions,
      referenceProject: state.sequence.initialProject,
      sequence: state.sequence,
      probes,
      starterMode: state.teacherForm.starterMode,
    });
    setKey(key, await inspectReference(key), project);
  }
  async function importKey(source, project) {
    const key = parseAssignmentKey(source);
    setKey(key, await inspectReference(key), project, true);
  }
  function applyChanges(project) {
    const status = teacherStatus(state, project);
    if (!status.hasKey) throw new Error('Create or import an instructor key first.');
    if (status.structuralChanged || (status.referenceChanged && !status.usingSavedReference))
      throw new Error(
        'The reference, observed signals or starter changed. Create a new reference key; previous keys and variants remain available separately.',
      );
    const revised = reviseAssignmentMetadata(state.teacherKey, state.teacherForm);
    state.teacherKey = revised.key;
    state.issued = revised.assignments;
    onSave();
    return revised.key;
  }
  function discardChanges(project) {
    const key = state.teacherKey;
    state.teacherForm = sanitizeTeacherForm({
      ...state.teacherForm,
      title: key.title,
      instructions: key.instructions,
      starterMode: key.starterMode,
      probes: key.probes.map(probeKey),
    });
    state.teacherUseSavedReference = {
      sequence: sequenceSignature(state.sequence),
      project: project ? structuredClone(project) : null,
    };
    onSave();
  }
  function issueVariants(project) {
    if (!state.teacherKey) throw new Error('Create or import an instructor key first.');
    if (state.referenceWarnings?.undefined)
      throw new Error('Resolve unknown or floating reference signals before issuing variants.');
    if (teacherStatus(state, project).dirty)
      throw new Error(
        'There are unapplied changes. Apply the title/instructions or create a new reference key before generating variants.',
      );
    const ids = [
      ...new Set(
        state.teacherForm.studentIds
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (!ids.length || ids.length > 40 || ids.some((value) => value.length > 100))
      throw new Error('Enter 1–40 student IDs of at most 100 characters.');
    const key = structuredClone(state.teacherKey);
    const tasks = ids.map((studentId) => issueAssignment(key, { studentId }));
    state.teacherKey = key;
    state.issued.push(...tasks);
    state.teacherForm.studentIds = '';
    onSave();
  }
  async function reviewFiles(files) {
    if (files.length > 40) throw new Error('Review up to 40 files at a time.');
    const key = state.teacherKey;
    state.batch = [];
    state.pairs = [];
    state.batchErrors = [];
    state.reviewCancelled = false;
    state.reviewComparisonComplete = false;
    state.reviewing = true;
    reviewController = new AbortController();
    const { signal } = reviewController;
    onProgress();
    try {
      for (const file of files) {
        signal.throwIfAborted();
        try {
          const source = await readClassroomFile(file);
          signal.throwIfAborted();
          const submission = parseSubmission(source);
          state.batch.push({
            submission,
            result: await gradeSubmission(submission, key, { signal }),
          });
        } catch (error) {
          if (signal.aborted) throw error;
          state.batchErrors.push(`${file.name}: ${error.message}`);
        }
        onProgress();
        await yieldToMain(signal);
      }
      state.pairs = await compareSubmissionsAsync(
        state.batch.map((item) => item.submission),
        { assignmentKey: key, signal },
      );
      state.reviewComparisonComplete = true;
    } catch (error) {
      if (!signal.aborted) throw error;
      state.reviewCancelled = true;
    } finally {
      state.reviewing = false;
      reviewController = null;
      onProgress();
    }
    return { cancelled: state.reviewCancelled };
  }
  function report() {
    return {
      kind: 'logic-lab-review',
      version: 1,
      taskId: state.teacherKey.id,
      results: state.batch.map(({ submission, result }) => ({
        student: submission.student,
        variant: submission.assignment.variant.id,
        notes: submission.notes,
        result,
      })),
      similarities: state.pairs,
      errors: state.batchErrors,
      complete: !state.reviewCancelled,
      comparisonComplete: state.reviewComparisonComplete,
      limitation: 'Similarity evidence does not prove authorship or copying.',
    };
  }
  return {
    createKey,
    importKey,
    issueVariants,
    applyChanges,
    discardChanges,
    status: (project) => teacherStatus(state, project),
    preview: (variantId) =>
      state.teacherKey ? publicStarterPreview(state.teacherKey, variantId) : null,
    markKeyDownloaded: () => {
      state.teacherSavedKeySignature = keySignature(state.teacherKey);
      onSave();
    },
    reviewFiles,
    report,
    cancelReview: () => reviewController?.abort(),
  };
}
