import { availableProbes } from './probes.js';
import { getDefinition } from '../components/catalog/index.js';
import { validateProject } from '../circuits/project.js';
import { createRuntime, simulate } from '../simulation/index.js';
import { SEQUENCE_LIMITS } from './limits.js';
import { hasTimedReplay } from './replay-work-policy.js';
import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { nextSimulationInterval } from '../simulation/timing.js';
export { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
export { nextSimulationInterval, simulationResolution } from '../simulation/timing.js';

export { SEQUENCE_LIMITS } from './limits.js';
const EPSILON = Number.EPSILON * 4;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const fail = (message) => {
  throw new Error(message);
};
const text = (value, label, max = 200) => {
  if (typeof value !== 'string' || value.length > max) fail(`${label} is invalid.`);
  return value;
};
export function boundedJson(source, label = 'File') {
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > SEQUENCE_LIMITS.bytes)
    fail(`${label} exceeds 10 MB.`);
  return JSON.parse(source, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key))
      fail(`${label} contains an unsafe key.`);
    return value;
  });
}
export function boundedSerialize(value, label = 'File') {
  const source = JSON.stringify(value, null, 2);
  if (new TextEncoder().encode(source).length > SEQUENCE_LIMITS.bytes)
    fail(`${label} exceeds 10 MB.`);
  return source;
}
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object.`);
  return value;
}
function time(value, label) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > SEQUENCE_LIMITS.duration
  )
    fail(`${label} must be between 0 and ${SEQUENCE_LIMITS.duration} seconds.`);
  return value;
}
export function defaultProbes(project) {
  return availableProbes(project).slice(0, SEQUENCE_LIMITS.probes);
}
export function validateProbes(probes, project) {
  if (!Array.isArray(probes) || !probes.length || probes.length > SEQUENCE_LIMITS.probes)
    fail('Choose between 1 and 32 observed signals.');
  const seen = new Set();
  return probes.map((probe) => {
    object(probe, 'Observed signal');
    const node = project.nodes.find((node) => node.id === probe.node);
    const side = probe.side || 'outputs';
    if (
      !node ||
      !['inputs', 'outputs'].includes(side) ||
      !getDefinition(node.type).signals[side].some((port) => port.id === probe.port)
    )
      fail('An observed signal references a missing component or port.');
    const result = { node: node.id, port: probe.port, side };
    const key = JSON.stringify(result);
    if (seen.has(key)) fail('Observed signals contain a duplicate.');
    seen.add(key);
    return result;
  });
}
export function validateAction(action, project) {
  object(action, 'Action');
  const at = time(action.at, 'Action time');
  if (action.op === 'reset') return { at, op: 'reset' };
  if (action.op && action.op !== 'set') fail('Unknown action operation.');
  const node = project.nodes.find((node) => node.id === action.node);
  const parameters = node && SOURCE_PARAMETERS[node.type];
  const rule = parameters && own(parameters, action.key) && parameters[action.key];
  if (!rule) fail('Actions may only change a supported input source.');
  const value = action.value;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < rule[0] ||
    value > rule[1] ||
    (rule[2] && !Number.isInteger(value))
  )
    fail('The input action value is outside its supported range.');
  return { at, node: node.id, key: action.key, value };
}
export function validateSequence(value) {
  object(value, 'Action sequence');
  if (value.kind !== 'logic-lab-sequence' || value.version !== 1)
    fail('Unsupported action sequence format.');
  const initialProject = validateProject(value.initialProject);
  if (initialProject.nodes.length > SEQUENCE_LIMITS.nodes)
    fail('Action recordings support at most 200 components.');
  for (const node of initialProject.nodes) {
    for (const [key, rule] of Object.entries(SOURCE_PARAMETERS[node.type] || {})) {
      const value = node.params[key] ?? getDefinition(node.type).defaults[key];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < rule[0] ||
        value > rule[1] ||
        (rule[2] && !Number.isInteger(value))
      )
        fail(`Initial input ${node.id}.${key} is outside its supported recording range.`);
    }
  }
  const probes = validateProbes(value.probes, initialProject);
  if (!Array.isArray(value.actions) || value.actions.length > SEQUENCE_LIMITS.actions)
    fail('Action sequence exceeds 2000 actions.');
  const actions = value.actions.map((action) => validateAction(action, initialProject));
  for (let index = 1; index < actions.length; index++)
    if (actions[index].at < actions[index - 1].at) fail('Action times must be ordered.');
  const duration = time(value.duration, 'Recording duration');
  if (actions.length && duration < actions.at(-1).at)
    fail('Recording ends before its final action.');
  return {
    kind: 'logic-lab-sequence',
    version: 1,
    id: text(value.id, 'Recording ID', 100),
    initialProject,
    probes,
    actions,
    duration,
  };
}
export function createSequence(
  project,
  { id = crypto.randomUUID(), probes = defaultProbes(project) } = {},
) {
  return validateSequence({
    kind: 'logic-lab-sequence',
    version: 1,
    id,
    initialProject: project,
    probes,
    actions: [],
    duration: 0,
  });
}
export function appendAction(sequence, action) {
  if (sequence.actions.length >= SEQUENCE_LIMITS.actions)
    fail('Action sequence reached its 2000 action limit.');
  const next = validateAction(action, sequence.initialProject);
  if (next.at < (sequence.actions.at(-1)?.at || 0)) fail('Action times must be ordered.');
  sequence.actions.push(next);
  sequence.duration = Math.max(sequence.duration, next.at);
  return next;
}
export function finishSequence(sequence, duration) {
  const result = validateSequence({ ...sequence, duration });
  Object.assign(sequence, result);
  return sequence;
}
export const parseSequence = (source) => validateSequence(boundedJson(source, 'Action sequence'));
export const serializeSequence = (sequence) =>
  boundedSerialize(validateSequence(sequence), 'Action sequence');
export function captureObservation(sequence, runtime, after = sequence.actions.length - 1) {
  return {
    at: runtime.time,
    after,
    values: sequence.probes.map(
      (probe) => runtime.signals[probe.side]?.[probe.node]?.[probe.port] ?? 'Z',
    ),
  };
}
export function applySequenceAction(project, runtime, action) {
  if (action.op === 'reset') {
    const next = createRuntime();
    next.time = runtime.time;
    next.sampleInterval = runtime.sampleInterval;
    simulate(project, next, 0);
    return next;
  }
  const checked = validateAction(action, project);
  project.nodes.find((node) => node.id === checked.node).params[checked.key] = checked.value;
  simulate(project, runtime, 0);
  return runtime;
}
export function createPlayback(source, { project: candidate } = {}) {
  const sequence = validateSequence(source);
  const project = candidate ? validateProject(candidate) : structuredClone(sequence.initialProject);
  if (project.nodes.length > SEQUENCE_LIMITS.nodes)
    fail('Action replay supports at most 200 components.');
  // Replaying a submission starts its sources from the recorded baseline, never their final values.
  for (const sourceNode of sequence.initialProject.nodes) {
    if (!SOURCE_PARAMETERS[sourceNode.type]) continue;
    const target = project.nodes.find((node) => node.id === sourceNode.id);
    if (!target || target.type !== sourceNode.type)
      fail(`Missing input interface: ${sourceNode.id}.`);
    for (const key of Object.keys(SOURCE_PARAMETERS[sourceNode.type])) {
      target.params[key] = sourceNode.params[key] ?? getDefinition(sourceNode.type).defaults[key];
    }
    target.enabled = sourceNode.enabled;
  }
  validateProbes(sequence.probes, project);
  const runtime = createRuntime();
  runtime.sampleInterval = 1 / 255;
  simulate(project, runtime, 0);
  const timed = hasTimedReplay(project);
  const playback = { sequence, project, runtime, cursor: 0, done: false, observations: [], timed };
  playback.observations.push(captureObservation(sequence, runtime, -1));
  return playback;
}
function runPlayback(playback, targetTime, maxSteps, oneAction) {
  const target = Math.min(playback.sequence.duration, time(targetTime, 'Playback target'));
  if (target + EPSILON < playback.runtime.time) fail('Playback cannot move backwards.');
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 250_000)
    fail('Playback work budget is invalid.');
  let steps = 0;
  while (steps < maxSteps) {
    const action = playback.sequence.actions[playback.cursor];
    if (action && action.at <= target + EPSILON && action.at <= playback.runtime.time + EPSILON) {
      playback.runtime.time = action.at;
      playback.runtime = applySequenceAction(playback.project, playback.runtime, action);
      playback.observations.push(
        captureObservation(playback.sequence, playback.runtime, playback.cursor),
      );
      playback.cursor++;
      steps++;
      if (oneAction) break;
      continue;
    }
    if (playback.runtime.time >= target) break;
    const boundary = Math.min(target, action?.at ?? target);
    const next = playback.timed
      ? playback.runtime.time +
        nextSimulationInterval(playback.project, playback.runtime, boundary - playback.runtime.time)
      : boundary;
    simulate(playback.project, playback.runtime, Math.max(0, next - playback.runtime.time));
    playback.runtime.time = next;
    steps++;
  }
  const atTarget =
    playback.runtime.time >= target &&
    !(playback.sequence.actions[playback.cursor]?.at <= target + EPSILON);
  playback.done =
    playback.cursor === playback.sequence.actions.length &&
    playback.runtime.time >= playback.sequence.duration;
  if (playback.done && playback.observations.at(-1)?.at !== playback.sequence.duration)
    playback.observations.push(
      captureObservation(playback.sequence, playback.runtime, playback.cursor),
    );
  return { atTarget, doneAtTarget: atTarget, done: playback.done, steps };
}
export function advancePlayback(playback, targetTime, { maxSteps = 1000 } = {}) {
  return runPlayback(playback, targetTime, maxSteps, false);
}
export function stepPlayback(playback, { maxSteps = 1000 } = {}) {
  const next = playback.sequence.actions[playback.cursor];
  const before = playback.cursor;
  const result = runPlayback(playback, next?.at ?? playback.sequence.duration, maxSteps, true);
  return { ...result, actionApplied: playback.cursor !== before };
}
export function replaySequence(sequence, options) {
  const playback = createPlayback(sequence, options);
  while (!playback.done)
    advancePlayback(playback, playback.sequence.duration, { maxSteps: 250_000 });
  return playback;
}
