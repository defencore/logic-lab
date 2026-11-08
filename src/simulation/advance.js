import { simulate } from './index.js';
import { nextSimulationInterval } from './timing.js';

/** Advance a bounded amount of work, returning all unprocessed simulation time. */
export function advanceRuntime(project, runtime, duration, { maxSteps = 250, onStep } = {}) {
  if (!Number.isFinite(duration) || duration < 0)
    throw new Error('Simulation duration must be a finite nonnegative number.');
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 5000)
    throw new Error('Simulation work budget must be between 1 and 5000 steps.');
  if (onStep !== undefined && typeof onStep !== 'function')
    throw new Error('Simulation step observer must be a function.');
  const start = runtime.time;
  const targetTime = start + duration;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(targetTime) ||
    (duration > 0 && targetTime === start)
  )
    throw new Error('Simulation time exceeds numeric precision. Reset the simulation.');
  let steps = 0;
  while (runtime.time < targetTime && steps < maxSteps) {
    const sampleInterval =
      Number.isFinite(runtime.sampleInterval) && runtime.sampleInterval > 0
        ? runtime.sampleInterval
        : Infinity;
    const interval = Math.min(
      sampleInterval,
      nextSimulationInterval(project, runtime, targetTime - runtime.time),
    );
    if (!(interval > 0) || runtime.time + interval === runtime.time)
      throw new Error(
        'Simulation interval exceeds numeric precision. Reduce the clock frequency or reset.',
      );
    simulate(project, runtime, interval);
    steps++;
    onStep?.(runtime);
  }
  const remainingSeconds = Math.max(0, targetTime - runtime.time);
  return {
    reached: remainingSeconds === 0,
    steps,
    advancedSeconds: runtime.time - start,
    remainingSeconds,
    targetTime,
  };
}
