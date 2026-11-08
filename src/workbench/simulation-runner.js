import { advanceRuntime } from '../simulation/advance.js';

/** Keep requested simulation time while sharing the main thread with editing and painting. */
export function createSimulationRunner({
  getProject,
  getRuntime,
  onStep,
  now = () => performance.now(),
}) {
  let activeRuntime = null;
  let targetTime = 0;
  function synchronize() {
    const runtime = getRuntime();
    if (runtime !== activeRuntime) {
      activeRuntime = runtime;
      targetTime = runtime.time;
    }
    return runtime;
  }
  function pendingSeconds() {
    const runtime = synchronize();
    return Math.max(0, targetTime - runtime.time);
  }
  function queue(duration) {
    if (!Number.isFinite(duration) || duration < 0)
      throw new Error('Invalid requested simulation duration.');
    const runtime = synchronize();
    targetTime = Math.max(runtime.time, targetTime) + duration;
  }
  function discard() {
    targetTime = synchronize().time;
  }
  function process({ maxSteps = 250, milliseconds = 8 } = {}) {
    if (
      !Number.isInteger(maxSteps) ||
      maxSteps < 1 ||
      maxSteps > 5000 ||
      !Number.isFinite(milliseconds) ||
      milliseconds <= 0
    )
      throw new Error('Invalid frame work budget.');
    const runtime = synchronize();
    const project = getProject();
    const started = now();
    const complexity = Math.max(1, project.nodes.length + project.wires.length);
    const chunkSize = Math.max(1, Math.min(25, Math.floor(10000 / complexity)));
    let steps = 0;
    while (runtime.time < targetTime && steps < maxSteps && now() - started < milliseconds) {
      const result = advanceRuntime(project, runtime, targetTime - runtime.time, {
        maxSteps: Math.min(chunkSize, maxSteps - steps),
        onStep,
      });
      steps += result.steps;
    }
    return { steps, pendingSeconds: pendingSeconds(), reached: runtime.time >= targetTime };
  }
  return { queue, process, discard, pendingSeconds };
}
