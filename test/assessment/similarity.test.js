import {
  student,
  node,
  wire,
  fixture,
  submissionFixture,
  renamed,
} from './fixtures/lab-assessment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import {
  createAssignment,
  issueAssignment,
  assignmentForVariant,
  validateAssignmentKey,
  validateAssignment,
  parseAssignmentKey,
  serializeAssignmentKey,
  parseAssignment,
  serializeAssignment,
  createAttempt,
  validateAttempt,
  recordEdit,
  createSubmission,
  gradeSubmission,
  compareSubmissions,
  compareSubmissionsAsync,
  graphFingerprint,
  parseSubmission,
  serializeSubmission,
} from '../../src/assessment/index.js';

test('copy comparison ignores positions, node IDs, labels, order and wire bends while identifying duplicate action traces', async () => {
  const { submission, key, project, sequence } = await submissionFixture();
  const nextStudent = { name: 'Learner Two', id: 's02', group: 'A' };
  const assignment = issueAssignment(key, { studentId: 's02', seed: 'variant02' });
  const change = renamed(project),
    nextSequence = structuredClone(sequence);
  nextSequence.initialProject = change.project;
  nextSequence.probes = nextSequence.probes.map((p) => ({ ...p, node: change.ids.get(p.node) }));
  nextSequence.actions = nextSequence.actions.map((a) => ({ ...a, node: change.ids.get(a.node) }));
  const attempt = createAttempt(assignment, nextStudent);
  recordEdit(attempt, change.project, { at: 2 });
  const second = await createSubmission({
    assignment,
    student: nextStudent,
    attempt,
    project: change.project,
    sequence: nextSequence,
  });
  assert.equal(graphFingerprint(project), graphFingerprint(change.project));
  const [pair] = compareSubmissions([submission, second]);
  assert.equal(pair.topologyExact, true);
  assert.equal(pair.actionsExact, true);
  assert.equal(pair.sharedAttempt, false);
  assert.equal(pair.sharedVariant, false);
  assert.equal(pair.suspected, true);
  assert.match(pair.limitation, /not proof/);
  // A true connection change is significant even with the same parts.
  const changed = structuredClone(change.project);
  changed.wires[0].to = { node: change.ids.get('ff'), port: 'reset' };
  assert.notEqual(graphFingerprint(project), graphFingerprint(changed));
});

test('shared empty starters alone are not evidence of copying', async () => {
  const { key, assignment } = fixture();
  const other = issueAssignment(key, { studentId: 's02', seed: 'variant02' });
  const build = async (task, who) => {
    const sequence = finishSequence(
      createSequence(task.starterProject, { probes: task.probes }),
      0,
    );
    return createSubmission({
      assignment: task,
      student: who,
      attempt: createAttempt(task, who),
      project: task.starterProject,
      sequence,
    });
  };
  const a = await build(assignment, student),
    b = await build(other, { name: 'Learner Two', id: 's02' });
  const [pair] = compareSubmissions([a, b]);
  assert.equal(pair.suspected, false);
  assert.equal(pair.topologyExact, false);
  assert.equal(pair.topologySimilarity, 0);
  assert.throws(() => compareSubmissions(Array(41).fill(a)), /40/);
});

test('asynchronous comparison matches the synchronous report, yields to the UI and supports cancellation', async () => {
  const { submission, key } = await submissionFixture();
  const files = [submission, structuredClone(submission)];
  let yielded = false;
  setTimeout(() => {
    yielded = true;
  }, 0);
  const report = await compareSubmissionsAsync(files, { assignmentKey: key });
  assert.equal(yielded, true);
  assert.deepEqual(report, compareSubmissions(files, { assignmentKey: key }));
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 0);
  await assert.rejects(
    () => compareSubmissionsAsync(files, { assignmentKey: key, signal: controller.signal }),
    { name: 'AbortError' },
  );
});

test('action comparison distinguishes serial data from a clock even when both sources are switches', async () => {
  const { submission, project, key, sequence } = await submissionFixture();
  const who = { name: 'Learner Two', id: 's02' };
  const assignment = issueAssignment(key, { studentId: who.id, seed: 'second' });
  const swapped = structuredClone(sequence);
  swapped.actions = swapped.actions.map((action) => ({
    ...action,
    node: action.node === 'data' ? 'clk' : action.node === 'clk' ? 'data' : action.node,
  }));
  const second = await createSubmission({
    assignment,
    student: who,
    attempt: createAttempt(assignment, who),
    project,
    sequence: swapped,
  });
  assert.equal(compareSubmissions([submission, second])[0].actionsExact, false);
});

test('near-match scores exclude the same starter components even after all component IDs are renamed', async () => {
  const { submission, project, key, sequence } = await submissionFixture();
  const bypass = structuredClone(project);
  bypass.wires.find((wire) => wire.id === 'q').from = { node: 'data', port: 'out' };
  const make = async (circuit, seq, index) => {
    const who = { name: 'Learner ' + index, id: 's' + index };
    const assignment = issueAssignment(key, { studentId: who.id, seed: 'score' + index });
    return createSubmission({
      assignment,
      student: who,
      attempt: createAttempt(assignment, who),
      project: circuit,
      sequence: seq,
    });
  };
  const ownSequence = { ...sequence, initialProject: bypass };
  const second = await make(bypass, ownSequence, 2);
  const changed = renamed(bypass);
  const third = await make(
    changed.project,
    {
      ...sequence,
      initialProject: changed.project,
      probes: sequence.probes.map((probe) => ({ ...probe, node: changed.ids.get(probe.node) })),
      actions: sequence.actions.map((action) => ({
        ...action,
        node: changed.ids.get(action.node),
      })),
    },
    3,
  );
  const a = compareSubmissions([submission, second])[0];
  const b = compareSubmissions([submission, third])[0];
  assert.equal(a.topologyExact, false);
  assert.equal(a.topologySimilarity, b.topologySimilarity);
});

test('canonical tiny solutions with coincident outputs alone request review without a copying allegation', async () => {
  const { key, submission } = await submissionFixture();
  const second = structuredClone(submission);
  second.id = crypto.randomUUID();
  second.attempt.id = crypto.randomUUID();
  const assignment = issueAssignment(key, { studentId: 's02', seed: 'second' });
  second.assignment = assignment;
  second.student = { name: 'Other', id: 's02', group: 'A' };
  second.sequence.actions = second.sequence.actions.map((action, index) => ({
    ...action,
    at: index * 0.01,
  }));
  const [pair] = compareSubmissions([submission, second], { assignmentKey: key });
  assert.equal(pair.topologyExact, true);
  assert.equal(pair.canonicalSolution, true);
  assert.equal(pair.actionsExact, false);
  assert.equal(pair.suspected, false);
});

test('refined graph hashes are only a filter; exact port graph matching distinguishes symmetric cycles', async () => {
  const project = {
    version: 1,
    name: 'Two topologies',
    nodes: [node('input', 'switch'), ...Array.from({ length: 6 }, (_, i) => node(`n${i}`, 'not'))],
    wires: Array.from({ length: 6 }, (_, i) =>
      wire(`w${i}`, `n${i}`, 'out', `n${(i + 1) % 6}`, 'a'),
    ),
  };
  const sequence = createSequence(project, { probes: [{ node: 'input', port: 'out' }] });
  appendAction(sequence, { at: 0, node: 'input', key: 'value', value: 1 });
  const key = createAssignment({
    title: 'Topology',
    referenceProject: project,
    sequence,
    starterMode: 'components',
  });
  const second = structuredClone(project);
  second.wires[2].to.node = 'n0';
  second.wires[5].to.node = 'n3';
  assert.equal(
    graphFingerprint(project),
    graphFingerprint(second),
    'regular graphs can share refinement colors',
  );
  const changedAssignment = issueAssignment(key, { studentId: student.id, seed: 'changed-graph' });
  await assert.rejects(
    () =>
      createSubmission({
        assignment: changedAssignment,
        student,
        attempt: createAttempt(changedAssignment, student),
        project: second,
        sequence,
      }),
    /changed/,
  );
  const make = async (p, i) => {
    const who = { name: `Person ${i}`, id: `s${i}` },
      assignment = issueAssignment(key, { studentId: who.id, seed: `seed${i}` });
    const seq = structuredClone(sequence);
    seq.initialProject = p;
    return createSubmission({
      assignment,
      student: who,
      attempt: createAttempt(assignment, who),
      project: p,
      sequence: seq,
    });
  };
  const [a, b] = await Promise.all([make(project, 1), make(second, 2)]);
  const [pair] = compareSubmissions([a, b], { assignmentKey: key });
  assert.equal(pair.topologyExact, false);
  assert.equal(pair.topologyUndetermined, false);
  assert.equal(pair.suspected, false);
});
