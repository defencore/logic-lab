import { getDefinition } from '../components/catalog/index.js';

const MAX_STEP = 0.0005;
const MIN_REGULAR_STEP = 0.00005;
const ANALOG_SAMPLES = 32;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const numeric = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const toleranceAt = (value) => Number.EPSILON * 8 * Math.max(1, Math.abs(value));

/** Right-continuous source levels agree with the exact edge checkpoints below. */
export function periodicLevel(type, time, frequency, duty) {
  if (duty <= 0) return 0;
  if (duty >= 1) return 1;
  const cycles = time * frequency;
  const tolerance = Math.min(toleranceAt(cycles), Math.min(duty, 1 - duty) / 4);
  const phase =
    Math.abs(cycles - Math.round(cycles)) <= tolerance ? 0 : cycles - Math.floor(cycles);
  if (type === 'clock')
    return Number(phase >= 1 - duty || Math.abs(phase - (1 - duty)) <= tolerance);
  return Number(phase < duty && Math.abs(phase - duty) > tolerance);
}

function sourceTiming(project, runtime) {
  const periodic = [];
  let analogFrequency = 0;
  for (const node of project.nodes) {
    if (node.enabled === false || !['clock', 'pwm', 'am', 'fm'].includes(node.type)) continue;
    const parameters = { ...getDefinition(node.type).defaults, ...node.params };
    if (node.type === 'am' || node.type === 'fm') {
      const carrier = Math.max(0, numeric(parameters.carrier, 8));
      const modulation = Math.max(0, numeric(parameters.frequency, 1));
      const depth = clamp(numeric(parameters.depth, 0.6), 0, 1);
      const highest =
        node.type === 'am' ? carrier + modulation : carrier * (1 + depth) + modulation;
      analogFrequency = Math.max(analogFrequency, highest);
      continue;
    }
    const frequency = Math.max(0, numeric(parameters.frequency, 0));
    const controlled = node.type === 'pwm' && runtime?.signals.inputs[node.id]?.control;
    const duty = clamp(
      typeof controlled === 'number' ? controlled : numeric(parameters.duty, 0.5),
      0,
      1,
    );
    if (frequency > 0 && duty > 0 && duty < 1) periodic.push({ type: node.type, frequency, duty });
  }
  return { periodic, analogFrequency };
}

function resolution({ periodic, analogFrequency }) {
  let interval = MAX_STEP;
  for (const { frequency, duty } of periodic)
    interval = Math.min(interval, Math.min(duty, 1 - duty) / frequency / 2);
  interval = Math.max(MIN_REGULAR_STEP, interval);
  return analogFrequency > 0
    ? Math.min(interval, 1 / (analogFrequency * ANALOG_SAMPLES))
    : interval;
}

export function simulationResolution(project, runtime) {
  return resolution(sourceTiming(project, runtime));
}

/** A display trace needs multiple samples per period independently of physics precision. */
export function maximumTraceWindow(project, runtime) {
  const { periodic, analogFrequency } = sourceTiming(project, runtime);
  let interval = analogFrequency > 0 ? 1 / (analogFrequency * 16) : Infinity;
  for (const { frequency, duty } of periodic)
    interval = Math.min(interval, Math.min(duty, 1 - duty) / frequency / 2);
  return interval * 255;
}

export function nextSimulationInterval(project, runtime, remaining) {
  if (!Number.isFinite(remaining) || remaining < 0)
    throw new Error('Simulation interval is invalid.');
  const timing = sourceTiming(project, runtime);
  let interval = Math.min(remaining, resolution(timing));
  const now = runtime.time;
  for (const { type, frequency, duty } of timing.periodic) {
    const cycle = Math.floor(now * frequency);
    const boundary = type === 'clock' ? 1 - duty : duty;
    // Edge visits measure real pulse widths; interior visits retain even very narrow pulses.
    const phases = [0, boundary, boundary / 2, (1 + boundary) / 2];
    for (const phase of phases) {
      let checkpoint = (cycle + phase) / frequency;
      if (checkpoint <= now + toleranceAt(now)) checkpoint = (cycle + 1 + phase) / frequency;
      const distance = checkpoint - now;
      if (distance > 0 && distance < interval) interval = distance;
    }
  }
  return interval;
}
