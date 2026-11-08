import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { studentProgress } from '../../src/classroom/student-progress.js';
import { sequenceWork } from '../../src/experiments/replay-work-policy.js';

function fixture(project, sequence = null) {
  const f = { project, runtime: createRuntime(), running: false };
  simulate(project, f.runtime, 0);
  f.session = createActionSession(
    {
      getProject: () => f.project,
      getRuntime: () => f.runtime,
      resetForSequence() {
        f.runtime = createRuntime();
        simulate(f.project, f.runtime, 0);
      },
      setRunning: (value) => (f.running = value),
      refreshPlayback() {},
    },
    { sequence },
  );
  return f;
}
const node = (id, type, params) => ({ id, type, x: 0, y: 0, params });
function dynamicSequence(duration = 0.02, carrier = 100) {
  const project = {
    version: 1,
    name: 'Dynamic PWM',
    nodes: [
      node('a', 'am', { frequency: 0, carrier, amplitude: 1, depth: 0 }),
      node('p', 'pwm', { frequency: 1000, duty: 0.5 }),
    ],
    wires: [
      { id: 'control', from: { node: 'a', port: 'out' }, to: { node: 'p', port: 'control' } },
    ],
  };
  const sequence = createSequence(project);
  appendAction(sequence, { at: 0, node: 'a', key: 'amplitude', value: 1 });
  finishSequence(sequence, duration);
  return { project: structuredClone(sequence.initialProject), sequence };
}
function studentState(sequence) {
  return {
    sequence,
    student: { name: 'Student', id: 's', group: 'A' },
    assignment: { id: 'task', variant: { studentId: 's' } },
    attempt: { assignment: { id: 'task' }, journal: [] },
    notes: 'I explain the observed result.',
  };
}

test('a real code-lock recording declares and enforces its circuit limit before it reaches an uncheckable45seconds', () => {
  const f = fixture(createExample('keypad-code-lock'));
  f.session.startRecording();
  const limit = f.session.recordingLimit();
  assert.ok(limit.maxDuration > 30 && limit.maxDuration < 35);
  f.runtime.time = limit.maxDuration - 0.01;
  assert.ok(Math.abs(f.session.recordingDelta(1) - 0.01) < 1e-8);
  f.runtime.time = limit.maxDuration;
  assert.equal(f.session.tick(0).limitReached, true);
  assert.equal(f.session.state.recording, false);
  assert.equal(f.running, false);
  assert.equal(f.session.state.sequence.duration, limit.maxDuration);
  assert.equal(sequenceWork(f.session.state.sequence).supported, true);
});

test('changing live frequency and duty updates the remaining recording bound from the actual source program', () => {
  const project = {
    version: 1,
    name: 'Changing clock',
    nodes: [node('clock', 'clock', { frequency: 1, duty: 0.5 })],
    wires: [],
  };
  const f = fixture(project);
  f.session.startRecording();
  assert.equal(f.session.recordingLimit().maxDuration, 120);
  simulate(project, f.runtime, 0.1);
  for (const [key, value] of [
    ['frequency', 1000],
    ['duty', 1e-9],
  ]) {
    project.nodes[0].params[key] = value;
    simulate(project, f.runtime, 0);
    f.session.inputChanged('clock', key, value);
  }
  const limit = f.session.recordingLimit().maxDuration;
  assert.ok(limit > 0.1 && limit < 15);
  assert.ok(Math.abs(f.session.recordingDelta(120) - (limit - 0.1)) < 1e-8);
  assert.deepEqual(
    f.session.state.sequence.actions.map(({ key }) => key),
    ['frequency', 'duty'],
  );
});

test('dynamic recording exposes a precise remaining-step allowance and stops at its actual work budget', () => {
  const { project } = dynamicSequence(),
    f = fixture(project);
  f.session.startRecording();
  const limit = f.session.recordingLimit();
  assert.equal(limit.requiresVerification, true);
  f.runtime.time = 0.05;
  f.runtime.steps = limit.stepBudget - 3;
  assert.equal(f.session.recordingStepAllowance(250), 3);
  assert.equal(f.session.recordingStepAllowance(2), 2);
  f.runtime.steps += 3;
  assert.equal(f.session.recordingStepAllowance(250), 0);
  assert.equal(f.session.recordingDelta(1), 0);
  assert.equal(f.session.tick(0).limitReached, true);
  assert.equal(f.session.state.sequence.duration, 0.05);
  assert.equal(f.session.state.recording, false);
});

test('resetting the runtime cannot replenish a dynamic recording’s consumed work', () => {
  const { project } = dynamicSequence(),
    f = fixture(project);
  f.session.startRecording();
  const budget = f.session.recordingLimit().stepBudget;
  f.runtime.steps = budget - 10;
  assert.equal(f.session.recordingStepAllowance(), 10);
  const previousTime = f.runtime.time;
  f.runtime = createRuntime();
  f.runtime.time = previousTime;
  simulate(project, f.runtime, 0);
  assert.equal(f.session.recordingStepAllowance(), 9);
  assert.equal(
    f.session.recordingStepAllowance(),
    9,
    'reading the allowance cannot charge work twice',
  );
  f.runtime.steps += 9;
  assert.equal(f.session.recordingStepAllowance(), 0);
  assert.equal(f.session.tick(0).limitReached, true);
});

test('unverified dynamic work is not a completed recording stage; full verification enables submission without replacing the editor', async () => {
  const { project, sequence } = dynamicSequence(),
    f = fixture(project, sequence);
  const state = studentState(sequence),
    projectIdentity = f.project,
    runtimeIdentity = f.runtime;
  let progress = studentProgress(state, project);
  assert.equal(progress.code, 'verify');
  assert.equal(progress.ready, false);
  assert.equal(progress.recorded, true);
  assert.equal(progress.steps[2], false);
  const report = await f.session.verifyRecording();
  assert.equal(report.verified, true);
  assert.equal(report.supported, true);
  assert.equal(f.project, projectIdentity);
  assert.equal(f.runtime, runtimeIdentity);
  project.nodes[0].params.amplitude = 0.2;
  progress = studentProgress(state, project);
  assert.equal(
    progress.ready,
    true,
    'the saved source baseline owns replay, not a later manual source value',
  );
  assert.equal(progress.steps[2], true);
  sequence.actions[0].value = 0.9;
  assert.equal(
    studentProgress(state, project).code,
    'verify',
    'a changed source program cannot reuse old certification',
  );
});

test('canceling dynamic verification leaves its sequence, observations and readiness unverified', async () => {
  const { project, sequence } = dynamicSequence(0.5, 197),
    f = fixture(project, sequence);
  const observations = f.session.state.observations,
    signal = new AbortController();
  setTimeout(() => signal.abort(), 0);
  await assert.rejects(f.session.verifyRecording({ signal: signal.signal }), {
    name: 'AbortError',
  });
  assert.equal(f.session.state.sequence, sequence);
  assert.equal(f.session.state.observations, observations);
  assert.equal(sequenceWork(sequence, project).verified, false);
});

test('a source program edited during verification cannot receive the old program’s successful certificate', async () => {
  const { project, sequence } = dynamicSequence(0.3, 237),
    f = fixture(project, sequence);
  setTimeout(() => {
    sequence.actions[0].value = 0.8;
  }, 0);
  await assert.rejects(f.session.verifyRecording(), /змінився/);
  assert.equal(sequence.actions[0].value, 0.8);
  assert.equal(sequenceWork(sequence, project).verified, false);
});
