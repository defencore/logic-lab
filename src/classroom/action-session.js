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
    playbackRunning: false,
    simulationRunning: false,
    dockOpen: !!sequence,
  };
  let editable = null;
  let target = 0;
  const changed = (save = false) => {
    if (save) onSave();
    onChange();
  };
  function setSequence(value) {
    if (state.recording || state.player)
      throw new Error('Finish the current action session first.');
    state.sequence = validateSequence(value);
    state.observations = [];
    state.dockOpen = true;
    changed(true);
  }
  function startRecording() {
    if (state.recording) throw new Error('An action recording is already in progress.');
    const sequence = createSequence(editable?.project || adapter.getProject());
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
    if (state.recording) throw new Error('Finish recording before replaying actions.');
    if (!state.sequence) throw new Error('Record or import an action sequence first.');
    // Validate before taking over the editor so an invalid import cannot change its state.
    const next = createPlayback(state.sequence);
    if (!editable) editable = { project: adapter.getProject(), runtime: adapter.getRuntime() };
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
    if (!state.player || state.player.done) beginPlayback();
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
    if (!state.player && !editable) return;
    state.player = null;
    state.playbackRunning = false;
    adapter.setRunning(false);
    if (editable) {
      const original = editable;
      editable = null;
      adapter.adoptPlayback(original.project, original.runtime);
    }
    adapter.refreshPlayback();
    changed();
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
    if (state.recording || state.player) changed();
    return { playing: !!state.player, completed, limitReached };
  }
  function simulationStateChanged(running) {
    state.simulationRunning = !!running;
    if (state.recording) changed();
  }
  return {
    state,
    setSequence,
    startRecording,
    stopRecording,
    inputChanged,
    replay,
    nextAction,
    pausePlayback,
    stopPlayback,
    tick,
    simulationStateChanged,
    isLocked: () => state.recording || !!state.player,
    recordingDelta: (dt) =>
      state.recording
        ? Math.min(dt, Math.max(0, SEQUENCE_LIMITS.duration - adapter.getRuntime().time))
        : dt,
    projectToSave: () => editable?.project || adapter.getProject(),
  };
}
