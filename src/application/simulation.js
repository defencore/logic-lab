import { createRuntime } from '../simulation/index.js';
import { icon } from '../shared/icons.js';
import { $ } from '../shared/ui.js';
import { frameSimulationDelta } from '../signals/time.js';
export function createSimulation(context) {
  const { state, services, actions, t } = context;
  function newRuntime() {
    services.simulationRunner?.discard();
    services.monitor?.stopCapture();
    const value = createRuntime();
    value.sampleInterval = state.timeBase / 255;
    return value;
  }
  function setRunning(next) {
    if (next && services.classroom?.isPlaying()) return;
    const wasRunning = state.running;
    state.running = next;
    if (wasRunning && !next) services.simulationRunner?.discard();
    $('#run').innerHTML =
      icon(next ? 'pause' : 'play', 14) + `<span>${t(next ? 'pause' : 'run')}</span><kbd>R</kbd>`;
    $('#run').classList.toggle('running', next);
    $('#simulation-badge').innerHTML = `<i></i>${t(next ? 'live' : 'paused')}`;
    $('#simulation-badge').classList.toggle('live', next);
    services.classroom?.refreshTransport?.();
    services.monitor.updateUi();
    services.classroom?.onSimulationStateChanged?.(next);
    services.inspector?.updateSignals();
  }
  function toggleRunning() {
    if (services.classroom?.isPlaying()) {
      services.classroom.togglePlaybackRunning();
      return;
    }
    setRunning(!state.running);
  }
  function advance(dt) {
    const pending = services.simulationRunner.pendingSeconds();
    const allowed = services.classroom?.recordingDelta(dt + pending) ?? dt + pending;
    services.simulationRunner.queue(Math.max(0, allowed - pending));
    actions.drainSimulation();
  }
  function drainSimulation() {
    try {
      services.simulationRunner.process();
    } catch (error) {
      services.simulationRunner.discard();
      services.monitor.stopCapture();
      services.classroom?.stopRecording();
      actions.setRunning(false);
      actions.notify(error.message);
    }
  }
  function tick(now) {
    const elapsed = frameSimulationDelta(now, state.lastFrame, state.simulationRate);
    if (services.classroom?.isPlaying()) {
      services.simulationRunner.discard();
      services.classroom.tick(elapsed);
    } else if (state.running) {
      actions.advance(elapsed);
      actions.updateSignals();
      services.classroom?.tick(0);
    } else if (services.simulationRunner.pendingSeconds() > 0) {
      actions.drainSimulation();
      actions.updateSignals();
      services.classroom?.tick(0);
    }
    state.lastFrame = now;
    requestAnimationFrame(tick);
  }
  return { newRuntime, setRunning, toggleRunning, advance, drainSimulation, tick };
}
