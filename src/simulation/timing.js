import { getDefinition } from '../components/catalog/index.js';

const EPSILON = Number.EPSILON * 4;
const MAX_STEP = 0.0005;
const MIN_REGULAR_STEP = 0.00005;
const fail = (message) => {
  throw new Error(message);
};

function periodicSources(project, runtime) {
  return project.nodes
    .filter((node) => node.enabled !== false && ['clock', 'pwm'].includes(node.type))
    .map((node) => {
      const defaults = getDefinition(node.type).defaults;
      const frequency = Math.max(0, Number(node.params?.frequency ?? defaults.frequency) || 0);
      const controlled = node.type === 'pwm' && runtime?.signals.inputs[node.id]?.control;
      const duty = Math.max(
        0,
        Math.min(
          1,
          typeof controlled === 'number' ? controlled : Number(node.params?.duty ?? defaults.duty),
        ),
      );
      return { type: node.type, frequency, duty };
    })
    .filter((source) => source.frequency > 0 && source.duty > 0 && source.duty < 1);
}
// Regular physics sampling is bounded; explicit periodic checkpoints below also visit
// phases narrower than this floor instead of demanding millions of uniform microsteps.
export function simulationResolution(project, runtime) {
  return resolution(periodicSources(project, runtime));
}
function resolution(sources) {
  let interval = MAX_STEP;
  for (const { frequency, duty } of sources)
    interval = Math.min(interval, Math.min(duty, 1 - duty) / frequency / 2);
  return Math.max(MIN_REGULAR_STEP, interval);
}
export function nextSimulationInterval(project, runtime, remaining) {
  if (!Number.isFinite(remaining) || remaining < 0) fail('Simulation interval is invalid.');
  const sources = periodicSources(project, runtime);
  let interval = Math.min(remaining, resolution(sources));
  const now = runtime.time;
  for (const { type, frequency, duty } of sources) {
    const cycle = Math.floor(now * frequency);
    // One point strictly inside each high and low phase avoids numerical edge
    // ambiguity while ensuring that even a very narrow phase cannot be skipped.
    const phases = type === 'clock' ? [(1 - duty) / 2, 1 - duty / 2] : [duty / 2, (1 + duty) / 2];
    for (const phase of phases) {
      let checkpoint = (cycle + phase) / frequency;
      if (checkpoint <= now + EPSILON) checkpoint = (cycle + 1 + phase) / frequency;
      const distance = checkpoint - now;
      if (distance > 0 && distance < interval) interval = distance;
    }
  }
  return interval;
}
