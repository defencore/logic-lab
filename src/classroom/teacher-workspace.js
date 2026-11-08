import { createPlayback, advancePlayback } from '../experiments/actions.js';
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
import { yieldToMain } from '../assessment/scheduling.js';

export const probeKey = (probe) => `${probe.node}:${probe.side}:${probe.port}`;

export async function inspectReference(key) {
  const playback = createPlayback(
    { ...key.sequence, probes: key.probes },
    { project: key.referenceProject },
  );
  const complexity = Math.max(
    1,
    key.referenceProject.nodes.length + key.referenceProject.wires.length,
  );
  const budget = Math.min(250000, Math.floor(20000000 / complexity));
  const chunk = Math.max(1, Math.min(250, Math.floor(20000 / complexity)));
  let operations = 0;
  while (!playback.done) {
    operations += advancePlayback(playback, key.sequence.duration, { maxSteps: chunk }).steps;
    if (operations > budget)
      throw new Error('The reference scenario is too complex. Shorten its duration.');
    if (!playback.done) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return {
    constant: key.probes.every(
      (probe, index) =>
        new Set(playback.observations.map((observation) => observation.values[index])).size < 2,
    ),
    undefined: playback.observations.some((observation) =>
      observation.values.some((value) => value === 'X' || value === 'Z'),
    ),
  };
}

/** Teacher operations commit a complete result only after validation/replay succeeds. */
export function createTeacherWorkspace(state, { onSave = () => {}, onProgress = () => {} } = {}) {
  let reviewController = null;
  function setKey(key, warnings) {
    state.teacherKey = key;
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
  async function createKey(probes) {
    const key = createAssignment({
      title: state.teacherForm.title,
      instructions: state.teacherForm.instructions,
      referenceProject: state.sequence.initialProject,
      sequence: state.sequence,
      probes,
      starterMode: state.teacherForm.starterMode,
    });
    setKey(key, await inspectReference(key));
  }
  async function importKey(source) {
    const key = parseAssignmentKey(source);
    setKey(key, await inspectReference(key));
  }
  function issueVariants() {
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
    reviewFiles,
    report,
    cancelReview: () => reviewController?.abort(),
  };
}
