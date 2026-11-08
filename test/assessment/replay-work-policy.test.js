import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample, EXAMPLES } from '../../examples/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  createPlayback,
  advancePlayback,
  validateSequence,
} from '../../src/experiments/actions.js';
import { SEQUENCE_LIMITS, REPLAY_LIMITS } from '../../src/experiments/limits.js';
import {
  sequenceWork,
  recordingWorkLimit,
  assertReplayWork,
  ReplayWorkLimitError,
} from '../../src/experiments/replay-work-policy.js';
import { run } from '../../src/assessment/replay.js';
import { node, wire } from './fixtures/lab-assessment.js';

function dynamicPwm(prefix, duration) {
  const project = {
    version: 1,
    name: 'Circuit-controlled PWM',
    nodes: [
      node(`${prefix}-am`, 'am', { frequency: 0, carrier: 100, amplitude: 1, depth: 0 }),
      node(`${prefix}-pwm`, 'pwm', { frequency: 1000, duty: 0.5 }),
    ],
    wires: [wire(`${prefix}-control`, `${prefix}-am`, 'out', `${prefix}-pwm`, 'control')],
  };
  return { project, sequence: finishSequence(createSequence(project), duration) };
}

function actualSteps(sequence, project) {
  const playback = createPlayback(sequence, { project });
  let steps = 1;
  while (!playback.done)
    steps += advancePlayback(playback, sequence.duration, { maxSteps: REPLAY_LIMITS.steps }).steps;
  return { playback, steps };
}

test('a structurally valid 45-second code-lock recording fails the shared work preflight, before replaying the world', async () => {
  const project = createExample('keypad-code-lock');
  const example = EXAMPLES.find((item) => item.id === 'keypad-code-lock');
  const sequence = createSequence(project, { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  finishSequence(sequence, 45);
  assert.equal(validateSequence(sequence).duration, 45);
  assert.ok(
    sequence.duration < SEQUENCE_LIMITS.duration,
    'duration alone is not the computation limit',
  );
  const before = structuredClone({ project, sequence });
  const initialLimit = recordingWorkLimit(project);
  const work = sequenceWork(sequence, project);
  assert.equal(work.supported, false);
  assert.equal(work.requiresVerification, false);
  assert.equal(work.stepBudget, initialLimit.stepBudget);
  assert.equal(
    work.stepBudget,
    Math.min(
      REPLAY_LIMITS.steps,
      Math.floor(REPLAY_LIMITS.work / (project.nodes.length + project.wires.length)),
    ),
  );
  assert.ok(initialLimit.maxDuration > 0 && initialLimit.maxDuration < 45);
  assert.ok(work.maxDuration > 0 && work.maxDuration < 45);
  await assert.rejects(
    run(sequence, project),
    (error) =>
      error instanceof ReplayWorkLimitError &&
      error.code === 'replay_work_limit' &&
      error.work.maxDuration < 45,
  );
  assert.deepEqual({ project, sequence }, before);
});

test('source chronology, duty/frequency transitions and resets match actual replay from the recorded baseline', () => {
  for (const type of ['clock', 'pwm', 'am', 'fm']) {
    const periodic = type === 'clock' || type === 'pwm';
    const project = {
      version: 1,
      name: type,
      nodes: [node('source', type, { frequency: 117, duty: 0.43, carrier: 32, depth: 0.63 })],
      wires: [],
    };
    const sequence = createSequence(project);
    appendAction(sequence, { at: 0.023, node: 'source', key: 'frequency', value: 313 });
    appendAction(sequence, {
      at: 0.043,
      node: 'source',
      key: periodic ? 'duty' : 'carrier',
      value: periodic ? 0.123 : 217,
    });
    if (!periodic) appendAction(sequence, { at: 0.043, node: 'source', key: 'depth', value: 0.2 });
    appendAction(sequence, { at: 0.066, op: 'reset' });
    appendAction(sequence, { at: 0.09, node: 'source', key: 'frequency', value: 0 });
    finishSequence(sequence, 0.12);
    const candidate = structuredClone(project);
    candidate.nodes[0].params.frequency = 1000;
    candidate.nodes[0].params.duty = 0.0001;
    candidate.nodes[0].enabled = false;
    const before = structuredClone({ sequence, candidate });
    const work = sequenceWork(sequence, candidate);
    const { playback, steps } = actualSteps(sequence, candidate);
    assert.equal(work.supported, true, type);
    assert.equal(work.estimatedSteps, steps, type);
    assert.equal(
      playback.project.nodes[0].enabled,
      true,
      'recorded enabled state overrides the candidate',
    );
    assert.equal(playback.project.nodes[0].params.frequency, 0, 'the last action follows reset');
    assert.equal(
      playback.observations.find((entry) => entry.after === (periodic ? 2 : 3)).at,
      0.066,
    );
    assert.deepEqual(
      { sequence, candidate },
      before,
      `${type} preflight/replay must remain detached`,
    );
  }
});

test('the recording cache includes elapsed time even when no new action changed the sequence', () => {
  const project = {
    version: 1,
    name: 'Narrow clock',
    nodes: [node('clock', 'clock', { frequency: 1000, duty: 0.001 })],
    wires: [],
  };
  const sequence = createSequence(project);
  const initial = recordingWorkLimit(project, sequence, 0);
  const later = recordingWorkLimit(project, sequence, 20);
  assert.equal(initial.duration, 0);
  assert.equal(initial.supported, true);
  assert.equal(later.duration, 20);
  assert.equal(later.supported, false);
  assert.notEqual(initial, later);
  assert.equal(sequence.duration, 0);
});

test('dynamic AM-to-PWM timing requires real verification instead of claiming the old static estimate is safe', () => {
  const { project, sequence } = dynamicPwm('unknown', 10);
  const work = sequenceWork(sequence, project);
  assert.equal(work.supported, false);
  assert.equal(work.requiresVerification, true);
  assert.equal(work.verified, false);
  assert.equal(work.estimatedSteps, null);
  assert.equal(
    assertReplayWork(sequence, project),
    work,
    'unknown work may enter bounded actual verification',
  );
  assert.equal(recordingWorkLimit(project).requiresVerification, true);
});

test('a bounded dynamic failure is cached and its advertised shortened duration really fits', async () => {
  const { project, sequence } = dynamicPwm('budget', 10);
  const before = structuredClone({ project, sequence });
  await assert.rejects(
    run(sequence, project),
    (error) =>
      error instanceof ReplayWorkLimitError &&
      error.work.maxDuration > 0 &&
      error.work.maxDuration < 10,
  );
  const work = sequenceWork(sequence, project);
  assert.equal(work.supported, false);
  assert.equal(work.requiresVerification, true);
  assert.equal(work.verified, true);
  assert.ok(work.maxDuration > 0 && work.maxDuration < 10);
  assert.throws(() => assertReplayWork(sequence, project), { code: 'replay_work_limit' });
  const shortened = finishSequence(structuredClone(sequence), work.maxDuration);
  const replay = await run(shortened, project);
  assert.equal(replay.done, true, 'the suggested cutoff must not repeat the same budget failure');
  assert.equal(replay.runtime.time, shortened.duration);
  assert.equal(sequenceWork(shortened, project).supported, true);
  assert.deepEqual({ project, sequence }, before);
});

test('a full small dynamic replay verifies the original source baseline despite final source actions', async () => {
  const { project, sequence } = dynamicPwm('complete', 0.013);
  appendAction(sequence, { at: 0.003, node: 'complete-pwm', key: 'frequency', value: 711 });
  finishSequence(sequence, 0.013);
  const before = structuredClone({ project, sequence });
  assert.equal(sequenceWork(sequence, project).verified, false);
  const replay = await run(sequence, project);
  assert.equal(replay.done, true);
  assert.equal(replay.project.nodes[1].params.frequency, 711);
  const work = sequenceWork(sequence, project);
  assert.equal(work.supported, true);
  assert.equal(work.verified, true);
  assert.equal(work.maxDuration, sequence.duration);
  assert.ok(work.estimatedSteps <= work.stepBudget);
  assert.deepEqual({ project, sequence }, before);
});

test('a partial same-time checkpoint does not certify either the full recording or an unfinished prefix', async () => {
  const { project, sequence } = dynamicPwm('partial', 0.04);
  appendAction(sequence, { at: 0.005, node: 'partial-am', key: 'amplitude', value: 0.8 });
  appendAction(sequence, { at: 0.005, node: 'partial-am', key: 'amplitude', value: 0.7 });
  finishSequence(sequence, 0.04);
  const replay = await run(sequence, project, { checkpoint: { after: 0, at: 0.005 } });
  assert.equal(replay.cursor, 1);
  assert.equal(replay.project.nodes[0].params.amplitude, 0.8);
  assert.equal(replay.done, false);
  assert.equal(sequenceWork(sequence, project).verified, false);
  const prefix = { ...sequence, duration: 0.005, actions: sequence.actions.slice(0, 1) };
  assert.equal(sequenceWork(prefix, project).verified, false);
});

test('canceling real dynamic verification never caches success or mutates the submitted circuit', async () => {
  const { project, sequence } = dynamicPwm('canceled', 0.2);
  const before = structuredClone({ project, sequence });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 0);
  try {
    await assert.rejects(run(sequence, project, { signal: controller.signal }), {
      name: 'AbortError',
    });
  } finally {
    clearTimeout(timer);
  }
  const work = sequenceWork(sequence, project);
  assert.equal(work.verified, false);
  assert.equal(work.supported, false);
  assert.equal(work.requiresVerification, true);
  assert.deepEqual({ project, sequence }, before);
});
