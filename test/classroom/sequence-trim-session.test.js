import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../examples/index.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import {
  createSequence,
  appendAction,
  finishSequence,
  validateSequence,
} from '../../src/experiments/actions.js';
import { trimSequence } from '../../src/experiments/sequence-trim.js';
import { sequenceWork } from '../../src/experiments/replay-work-policy.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import {
  sequenceIsStale,
  studentProgress,
  progressMessage,
} from '../../src/classroom/student-progress.js';
import {
  createAssignment,
  issueAssignment,
  createAttempt,
  recordEdit,
  createSubmission,
  serializeSubmission,
  parseSubmission,
} from '../../src/assessment/index.js';

function fixture(project = createExample('shift-register-sequence'), sequence = null) {
  const f = { project, runtime: createRuntime(), saves: 0, running: false };
  simulate(project, f.runtime, 0);
  f.adapter = {
    getProject: () => f.project,
    getRuntime: () => f.runtime,
    resetForSequence() {
      f.runtime = createRuntime();
      simulate(f.project, f.runtime, 0);
    },
    setRunning: (running) => (f.running = running),
    adoptPlayback(project, runtime) {
      f.project = project;
      f.runtime = runtime;
    },
    refreshPlayback() {},
  };
  f.session = createActionSession(f.adapter, { sequence, onSave: () => f.saves++ });
  return f;
}
function manualSequence(project) {
  const sequence = createSequence(project, {
    id: 'original-recording',
    probes: [{ node: 'shift', port: 'out', side: 'outputs' }],
  });
  for (const [at, node, value] of [
    [0, 'ser', 1],
    [0.1, 'clock', 1],
    [0.1, 'clock', 0],
    [0.1, 'ser', 0],
    [0.2, 'clock', 1],
  ])
    appendAction(sequence, { at, node, key: 'value', value });
  return finishSequence(sequence, 0.3);
}
function longLock() {
  const example = EXAMPLES.find(({ id }) => id === 'keypad-code-lock'),
    project = example.create();
  const sequence = createSequence(project, { probes: example.actionProbes });
  for (const action of example.actionPreset) appendAction(sequence, action);
  return { project, sequence: finishSequence(sequence, 45) };
}

test('trimming keeps every action exactly at the cutoff, its order, probes and recording identity', () => {
  const source = manualSequence(createExample('shift-register-sequence')),
    before = structuredClone(source);
  const next = trimSequence(source, 0.1);
  assert.equal(next.duration, 0.1);
  assert.equal(next.actions.length, 4);
  assert.deepEqual(next.actions, source.actions.slice(0, 4));
  assert.deepEqual(next.probes, source.probes);
  assert.deepEqual(next.initialProject, source.initialProject);
  assert.equal(next.id, source.id);
  assert.equal(trimSequence(source, 0).actions.length, 1);
  assert.deepEqual(source, before);
  for (const cutoff of [-1, 0.31, Infinity, NaN, '0.1'])
    assert.throws(() => trimSequence(source, cutoff), /скорочення/);
});

test('session trim recomputes the final observation in isolation and keeps the current circuit, runtime and evidence intact', async () => {
  const f = fixture(),
    source = manualSequence(f.project);
  f.session.setSequence(source);
  const original = f.session.state.sequence,
    baseline = structuredClone(original.initialProject);
  f.project.wires.pop();
  f.runtime.time = 7;
  const project = f.project,
    runtime = f.runtime;
  const evidence = {
    id: 'same-attempt',
    journal: [{ event: 'wire', fingerprint: '1234567890abcdef' }],
  };
  Object.assign(f.session.state, {
    attempt: evidence,
    notes: 'Keep my reasoning',
    observations: [{ at: 0.3, after: 5, values: [999] }],
  });
  const saves = f.saves;
  const result = await f.session.trimRecording(0.1);
  assert.deepEqual(result, { removedActions: 1, previousDuration: 0.3, duration: 0.1 });
  assert.equal(f.project, project);
  assert.equal(f.runtime, runtime);
  assert.equal(f.runtime.time, 7);
  assert.equal(f.session.state.attempt, evidence);
  assert.equal(f.session.state.notes, 'Keep my reasoning');
  assert.deepEqual(f.session.state.sequence.initialProject, baseline);
  assert.equal(f.session.state.sequence.id, original.id);
  assert.equal(
    sequenceIsStale(f.session.state.sequence, project),
    true,
    'trimming cannot claim an older circuit is current',
  );
  assert.deepEqual(f.session.state.observations.at(-1), { at: 0.1, after: 3, values: [1] });
  assert.equal(f.saves, saves + 1);
  assert.equal(original.actions.length, 5);
});

test('aborted or failed trim never installs a partial sequence or changes saved observations', async () => {
  const project = {
    version: 1,
    name: 'Clock trim',
    nodes: [{ id: 'clock', type: 'clock', x: 0, y: 0, params: { frequency: 200, duty: 0.5 } }],
    wires: [],
  };
  const sequence = finishSequence(createSequence(project), 1),
    f = fixture(project, sequence);
  f.session.state.observations = [{ at: 0, after: -1, values: [0] }];
  const original = f.session.state.sequence,
    observations = f.session.state.observations;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 0);
  await assert.rejects(f.session.trimRecording(0.9, { signal: controller.signal }), {
    name: 'AbortError',
  });
  assert.equal(f.session.state.sequence, original);
  assert.equal(f.session.state.observations, observations);
  assert.equal(f.saves, 0);
  await assert.rejects(f.session.trimRecording(-1), /скорочення/);
  assert.equal(f.session.state.sequence, original);
});

test('a concurrent imported sequence remains current when an older detached trim finishes', async () => {
  const project = {
    version: 1,
    name: 'Clock',
    nodes: [{ id: 'clock', type: 'clock', x: 0, y: 0, params: { frequency: 200, duty: 0.5 } }],
    wires: [],
  };
  const original = finishSequence(createSequence(project), 1),
    f = fixture(project, original);
  const replacement = finishSequence(createSequence(project, { id: 'new-import' }), 0.1);
  setTimeout(() => f.session.setSequence(replacement), 0);
  await assert.rejects(f.session.trimRecording(0.9), /змінився/);
  assert.equal(f.session.state.sequence.id, 'new-import');
});

test(
  'the 45-second lock can be repaired without repeating it and its trimmed submission preserves construction evidence',
  { timeout: 60000 },
  async () => {
    const { project, sequence } = longLock(),
      short = trimSequence(sequence, 1.4);
    const key = createAssignment({
      title: 'Code lock',
      referenceProject: project,
      sequence: short,
      starterMode: 'components',
    });
    const student = { name: 'Student', id: 'student01', group: 'A' },
      assignment = issueAssignment(key, { studentId: student.id, seed: 'lock' });
    const attempt = createAttempt(assignment, student);
    recordEdit(attempt, project, { at: 1, event: 'wire controller' });
    const state = {
      assignment,
      student,
      attempt,
      sequence,
      notes: 'I verified2580 and its ROM addresses.',
    };
    const progress = studentProgress(state, project);
    assert.equal(progress.ready, false);
    assert.equal(progress.code, 'workLimit');
    assert.equal(progress.steps[2], false);
    assert.match(progressMessage(progress, 'ua'), /Скоротіть/);
    await assert.rejects(createSubmission({ ...state, project }), { code: 'replay_work_limit' });
    const f = fixture(project, sequence),
      projectIdentity = f.project,
      runtimeIdentity = f.runtime;
    Object.assign(f.session.state, { attempt, notes: state.notes });
    const journal = structuredClone(attempt.journal),
      attemptId = attempt.id;
    await f.session.trimRecording(1.4);
    assert.equal(f.project, projectIdentity);
    assert.equal(f.runtime, runtimeIdentity);
    assert.equal(f.session.state.sequence.actions.length, 10);
    assert.equal(sequenceWork(f.session.state.sequence, project).supported, true);
    const submission = await createSubmission({
      ...state,
      project,
      sequence: f.session.state.sequence,
    });
    const restored = parseSubmission(serializeSubmission(submission));
    assert.equal(restored.sequence.duration, 1.4);
    assert.equal(restored.sequence.id, sequence.id);
    assert.equal(restored.attempt.id, attemptId);
    assert.deepEqual(restored.attempt.journal, journal);
    assert.equal(restored.notes, state.notes);
    assert.equal(restored.observations.at(-1).at, 1.4);
    assert.ok(restored.observations.every(({ at }) => at <= 1.4));
    assert.equal(studentProgress({ ...state, sequence: restored.sequence }, project).ready, true);
    assert.deepEqual(validateSequence(sequence).duration, 45);
  },
);
