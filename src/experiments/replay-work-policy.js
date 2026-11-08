import { getDefinition } from '../components/catalog/index.js';
import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { nextSimulationInterval } from '../simulation/timing.js';
import { SCENARIO_TYPES } from '../scenes/models/scenarios/index.js';
import { SEQUENCE_LIMITS, REPLAY_LIMITS } from './limits.js';

const TIMED = new Set([
  'clock',
  'pwm',
  'am',
  'fm',
  'monostable',
  'servo',
  'stepper',
  ...SCENARIO_TYPES,
]);
const TIMING_KEYS = new Set(['frequency', 'duty', 'carrier', 'depth']);
const sequenceCache = new WeakMap(),
  recordingCache = new WeakMap();
const verifiedWork = new Map();
const EPSILON = Number.EPSILON * 4;
export const hasTimedReplay = (project) => project.nodes.some((node) => TIMED.has(node.type));
export const changesReplayTiming = (action) => TIMING_KEYS.has(action.key);

export function replayStepBudget(project) {
  const complexity = Math.max(1, project.nodes.length + project.wires.length);
  return {
    complexity,
    stepBudget: Math.min(REPLAY_LIMITS.steps, Math.floor(REPLAY_LIMITS.work / complexity)),
    chunk: Math.max(1, Math.min(250, Math.floor(REPLAY_LIMITS.chunkWork / complexity))),
  };
}
function signature(sequence, project) {
  const sources = new Map(
    (sequence?.initialProject.nodes || [])
      .filter((node) => SOURCE_PARAMETERS[node.type])
      .map((node) => [node.id, node]),
  );
  return JSON.stringify([
    sequence?.duration,
    sequence?.actions,
    sequence?.initialProject.nodes.map((node) => [node.id, node.type, node.enabled, node.params]),
    project.nodes.map((node) => {
      const source = sources.get(node.id),
        params = { ...node.params };
      if (source?.type === node.type)
        for (const key of Object.keys(SOURCE_PARAMETERS[node.type])) delete params[key];
      return [
        node.id,
        node.type,
        source?.type === node.type ? source.enabled : node.enabled,
        params,
      ];
    }),
    project.wires.map((wire) => [wire.from, wire.to, wire.enabled]),
  ]);
}
function hasDynamicPwm(sequence, original) {
  const { project } = timingProject(sequence, original);
  return project.nodes.some(
    (node) =>
      node.type === 'pwm' &&
      node.enabled !== false &&
      project.wires.some((wire) => wire.to.node === node.id && wire.to.port === 'control'),
  );
}
function timingProject(sequence, project) {
  const nodes = project.nodes.map((node) => ({
    ...node,
    params: { ...getDefinition(node.type)?.defaults, ...node.params },
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const source of sequence?.initialProject.nodes || []) {
    const node = byId.get(source.id);
    if (!node || node.type !== source.type || !SOURCE_PARAMETERS[source.type]) continue;
    for (const key of Object.keys(SOURCE_PARAMETERS[source.type]))
      node.params[key] = source.params[key] ?? getDefinition(source.type).defaults[key];
    node.enabled = source.enabled;
  }
  return { project: { ...project, nodes }, byId };
}

/** Count the same time checkpoints as replay without evaluating gates or advancing any world. */
function countTiming(sequence, original, budget, duration) {
  const { project, byId } = timingProject(sequence, original),
    actions = sequence?.actions || [],
    timed = hasTimedReplay(project),
    runtime = { time: 0, signals: { inputs: Object.create(null) } };
  let steps = 1,
    cursor = 0,
    required = null;
  while (true) {
    const action = actions[cursor];
    if (action && action.at <= runtime.time + EPSILON) {
      if (++steps > budget) break;
      runtime.time = action.at;
      if (action.op !== 'reset') {
        const node = byId.get(action.node);
        if (node) node.params[action.key] = action.value;
      }
      cursor++;
      continue;
    }
    if (required === null && runtime.time >= duration) required = steps;
    if (runtime.time >= SEQUENCE_LIMITS.duration)
      return { required, maxDuration: SEQUENCE_LIMITS.duration, steps };
    if (steps >= budget) break;
    const target = Math.min(
      SEQUENCE_LIMITS.duration,
      action?.at ?? Infinity,
      required === null ? duration : Infinity,
    );
    const interval = timed
      ? nextSimulationInterval(project, runtime, target - runtime.time)
      : target - runtime.time;
    if (!(interval > 0) || runtime.time + interval === runtime.time) break;
    runtime.time += interval;
    steps++;
  }
  // A cutoff keeps the complete same-time action group, so never recommend a
  // boundary whose last actions have not all fitted inside the budget.
  return {
    required,
    steps,
    maxDuration: Math.max(0, Math.floor((runtime.time - 1e-8) * 1000) / 1000),
  };
}
function report(sequence, project, reserve) {
  const base = replayStepBudget(project),
    duration = sequence?.duration || 0;
  if (hasDynamicPwm(sequence, project))
    return {
      ...base,
      duration,
      maxDuration: SEQUENCE_LIMITS.duration,
      estimatedSteps: null,
      supported: false,
      requiresVerification: true,
      verified: false,
      reservedSteps: reserve,
    };
  const available = Math.max(1, base.stepBudget - reserve),
    count = countTiming(sequence, project, available, duration);
  return {
    ...base,
    duration,
    maxDuration: Math.max(count.required === null ? 0 : duration, count.maxDuration),
    estimatedSteps: count.required ?? base.stepBudget + 1,
    supported: count.required !== null && count.required <= available,
    reservedSteps: reserve,
    requiresVerification: false,
    verified: true,
  };
}
export function sequenceWork(sequence, project = sequence.initialProject) {
  const key = signature(sequence, project),
    cached = sequenceCache.get(sequence);
  if (verifiedWork.has(key)) return verifiedWork.get(key);
  if (cached?.key === key) return cached.report;
  const result = report(sequence, project, 0);
  sequenceCache.set(sequence, { key, report: result });
  return result;
}
export function rememberReplayWork(sequence, project, { steps, supported, maxDuration }) {
  const key = signature(sequence, project),
    base = replayStepBudget(project);
  const result = {
    ...base,
    duration: sequence.duration,
    maxDuration: supported ? sequence.duration : maxDuration,
    estimatedSteps: steps,
    supported,
    requiresVerification: true,
    verified: true,
    reservedSteps: 0,
  };
  verifiedWork.delete(key);
  verifiedWork.set(key, result);
  while (verifiedWork.size > 8) verifiedWork.delete(verifiedWork.keys().next().value);
  return result;
}
export function recordingWorkLimit(project, sequence = null, at = 0) {
  const key = `${signature(sequence, project)}:${at}`,
    cached = recordingCache.get(project);
  if (cached?.key === key) return cached.report;
  const remaining = Math.max(0, SEQUENCE_LIMITS.actions - (sequence?.actions.length || 0));
  // Each future action and its interval split need at most two extra operations.
  const result = report(
    sequence && { ...sequence, duration: Math.max(sequence.duration, at) },
    project,
    remaining * 2,
  );
  recordingCache.set(project, { key, report: result });
  return result;
}
export function workLimitMessage(info, language = 'ua') {
  const ua = language === 'ua' || language === 'uk',
    seconds = info.maxDuration.toFixed(3);
  if (info.requiresVerification && !info.verified)
    return ua
      ? 'ШІМ керується схемою, тому потрібна перевірка обчислень після запису. До 120 с модельного часу; запис може завершитися раніше за обсягом обчислень. Натисніть «Перевірити запис» перед здачею.'
      : 'Circuit-controlled PWM needs a computation check after recording. Up to 120 simulated seconds; recording may finish earlier at its computation budget. Choose Verify recording before submitting.';
  if (info.requiresVerification && info.verified && info.supported)
    return ua
      ? 'Обчислення запису перевірено. Можна готувати файл роботи для викладача.'
      : 'Recording computations are verified. You can prepare the instructor work file.';
  return info.supported
    ? ua
      ? `Для цієї схеми запис — до ${seconds} с модельного часу. Частота та тривалість імпульсів можуть змінити межу. Максимум — 2000 дій.`
      : `This circuit supports up to ${seconds} simulated seconds. Frequency and pulse timing can change the limit. Maximum: 2000 actions.`
    : ua
      ? `Сценарій перевищує обсяг перевірки цієї схеми. Скоротіть його до ${seconds} с або менше; повторювати лабораторну не потрібно.`
      : `The sequence exceeds this circuit’s checking budget. Shorten it to ${seconds} seconds or less; you do not need to repeat the laboratory.`;
}
export class ReplayWorkLimitError extends Error {
  constructor(info) {
    super(workLimitMessage(info, 'ua'));
    this.name = 'ReplayWorkLimitError';
    this.code = 'replay_work_limit';
    this.work = info;
  }
}
export function assertReplayWork(sequence, project) {
  const result = sequenceWork(sequence, project);
  if (!result.supported && !(result.requiresVerification && !result.verified))
    throw new ReplayWorkLimitError(result);
  return result;
}
