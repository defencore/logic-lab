import { validateProject } from '../circuits/project.js';
import { createRuntime, simulate } from '../simulation/index.js';
import { run } from '../assessment/replay.js';
import {
  SEQUENCE_LIMITS,
  createSequence,
  validateSequence,
  appendAction,
  finishSequence,
  createPlayback,
  advancePlayback,
  stepPlayback,
  captureObservation,
} from '../experiments/actions.js';

/** Owns the recording/replay lifecycle without depending on document or browser storage. */
export function createActionSession(
  adapter,
  { sequence = null, onChange = () => {}, onSave = () => {} } = {},
) {
  const state = {
    sequence,
    observations: [],
    recording: false,
    player: null,
    preview: null,
    reviewMode: null,
    reviewCheck: null,
    playbackRunning: false,
    simulationRunning: false,
    dockOpen: !!sequence,
  };
  let editable = null;
  let target = 0;
  let reviewOriginal = null;
  function preserveEditor() {
    if (!editable)
      editable = {
        project: adapter.getProject(),
        runtime: adapter.getRuntime(),
        viewport: adapter.getViewport?.(),
        lessonStep: adapter.getLessonStep?.(),
      };
  }
  const changed = (save = false) => {
    if (save) onSave();
    onChange();
  };
  function setSequence(value) {
    if (state.recording || state.player || state.preview)
      throw new Error('Finish the current action session first.');
    state.sequence = validateSequence(value);
    state.observations = [];
    state.dockOpen = true;
    changed(true);
  }
  function startRecording({ probes } = {}) {
    if (state.reviewMode) throw new Error('Return to your circuit before recording.');
    if (state.recording) throw new Error('An action recording is already in progress.');
    const sequence = createSequence(editable?.project || adapter.getProject(), { probes });
    if (state.player) stopPlayback();
    adapter.resetForSequence();
    state.sequence = sequence;
    state.recording = true;
    state.dockOpen = true;
    state.observations = [captureObservation(sequence, adapter.getRuntime(), -1)];
    state.simulationRunning = true;
    adapter.setRunning(true);
    changed(true);
  }
  function stopRecording() {
    if (!state.recording) return;
    finishSequence(state.sequence, Math.min(SEQUENCE_LIMITS.duration, adapter.getRuntime().time));
    state.recording = false;
    state.simulationRunning = false;
    adapter.setRunning(false);
    changed(true);
  }
  function inputChanged(node, key, value) {
    if (!state.recording) return;
    appendAction(state.sequence, {
      at: Math.min(SEQUENCE_LIMITS.duration, adapter.getRuntime().time),
      node,
      key,
      value,
    });
    state.observations.push(captureObservation(state.sequence, adapter.getRuntime()));
    if (state.sequence.actions.length >= SEQUENCE_LIMITS.actions) stopRecording();
    else changed(true);
  }
  function beginPlayback() {
    if (state.preview) throw new Error('Return to your circuit before replaying actions.');
    if (state.recording) throw new Error('Finish recording before replaying actions.');
    if (!state.sequence) throw new Error('Record or import an action sequence first.');
    // Validate before taking over the editor so an invalid import cannot change its state.
    const next = createPlayback(
      state.sequence,
      ['replay', 'check'].includes(state.reviewMode) ? { project: reviewOriginal.project } : {},
    );
    preserveEditor();
    adapter.setRunning(false);
    state.player = next;
    state.observations = next.observations;
    state.dockOpen = true;
    target = 0;
    adapter.adoptPlayback(next.project, next.runtime);
  }
  function replay() {
    beginPlayback();
    state.playbackRunning = true;
    changed();
  }
  function nextAction() {
    if (state.player?.done)
      return { actionApplied: false, atTarget: true, doneAtTarget: true, done: true, steps: 0 };
    if (!state.player) beginPlayback();
    state.playbackRunning = false;
    const result = stepPlayback(state.player, { maxSteps: 1000 });
    state.observations = state.player.observations;
    target = state.player.runtime.time;
    adapter.refreshPlayback(state.player.project, state.player.runtime);
    changed();
    return result;
  }
  function pausePlayback() {
    if (!state.player || state.player.done) return;
    state.playbackRunning = !state.playbackRunning;
    changed();
  }
  function stopPlayback() {
    if (!state.player && !state.preview && !editable) return;
    state.preview = null;
    state.reviewMode = null;
    state.reviewCheck = null;
    state.player = null;
    state.playbackRunning = false;
    adapter.setRunning(false);
    if (editable) {
      const original = editable;
      editable = null;
      if (original.lessonStep !== undefined) adapter.restoreLessonStep?.(original.lessonStep);
      adapter.adoptPlayback(original.project, original.runtime);
      if (original.viewport) adapter.restoreViewport?.(original.viewport);
    }
    if (reviewOriginal) {
      state.sequence = reviewOriginal.sequence;
      state.observations = reviewOriginal.observations;
      reviewOriginal = null;
    }
    adapter.refreshPlayback();
    changed();
  }
  function reviewWork(project, sequence = null, { label = '', kind = '' } = {}) {
    if (state.recording || state.player || state.preview)
      throw new Error('Finish the current action session first.');
    // Validate and initialize completely before taking over the editor.
    const next = sequence ? createPlayback(sequence, { project }) : null;
    installReview(project, next, { label, kind });
  }
  function installReview(project, next, { label = '', kind = '', paused = false } = {}) {
    const reviewed = next?.project || validateProject(structuredClone(project));
    const runtime = next?.runtime || createRuntime();
    if (!next) simulate(reviewed, runtime, 0);
    preserveEditor();
    reviewOriginal = {
      sequence: state.sequence,
      observations: state.observations,
      project: structuredClone(project),
    };
    adapter.setRunning(false);
    state.dockOpen = true;
    state.reviewMode = kind || (next ? 'replay' : 'circuit');
    state.preview = next ? null : { name: reviewed.name, label };
    state.player = next;
    if (next) {
      state.sequence = next.sequence;
      state.observations = next.observations;
      state.playbackRunning = !paused;
      target = next.runtime.time;
    }
    adapter.adoptPlayback(reviewed, runtime);
    changed();
  }
  async function reviewCheck(project, sequence, checkpoint, { label = '' } = {}) {
    if (state.recording || state.player || state.preview)
      throw new Error('Finish the current action session first.');
    if (!checkpoint) throw new Error('Choose a reference-check checkpoint.');
    // Seek in a detached player; failures cannot take over or overwrite the editor.
    const next = await run(sequence, project, { checkpoint });
    if (state.recording || state.player || state.preview)
      throw new Error('Finish the current action session first.');
    state.reviewCheck = { label, checkpoint: { ...checkpoint } };
    installReview(project, next, { label, kind: 'check', paused: true });
  }
  function tick(dt) {
    let completed = false;
    let limitReached = false;
    if (state.player && state.playbackRunning) {
      target = Math.min(state.sequence.duration, target + dt);
      const cursor = state.player.cursor;
      advancePlayback(state.player, target, { maxSteps: 150 });
      state.observations = state.player.observations;
      adapter.refreshPlayback(
        state.player.project,
        state.player.runtime,
        cursor !== state.player.cursor,
      );
      if (state.player.done) {
        state.playbackRunning = false;
        completed = true;
      }
    }
    if (state.recording && adapter.getRuntime().time >= SEQUENCE_LIMITS.duration - 1e-8) {
      stopRecording();
      limitReached = true;
    }
    if (state.recording || state.player || state.preview) changed();
    return { playing: !!state.player || !!state.preview, completed, limitReached };
  }
  function simulationStateChanged(running) {
    state.simulationRunning = !!running;
    if (state.recording) changed();
  }
  return {
    state,
    setSequence,
    reviewWork,
    reviewCheck,
    startRecording,
    stopRecording,
    inputChanged,
    replay,
    nextAction,
    pausePlayback,
    stopPlayback,
    tick,
    simulationStateChanged,
    isLocked: () => state.recording || !!state.player || !!state.preview,
    sequenceToSave: () => (reviewOriginal ? reviewOriginal.sequence : state.sequence),
    viewportToSave: () => editable?.viewport || adapter.getViewport?.(),
    recordingDelta: (dt) =>
      state.recording
        ? Math.min(dt, Math.max(0, SEQUENCE_LIMITS.duration - adapter.getRuntime().time))
        : dt,
    projectToSave: () => editable?.project || adapter.getProject(),
  };
}
