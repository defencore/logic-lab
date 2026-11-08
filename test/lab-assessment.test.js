import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../src/catalog.js';
import { createSequence, appendAction, finishSequence } from '../src/action-sequence.js';
import {
  createAssignment,
  issueAssignment,
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
  graphFingerprint,
  parseSubmission,
  serializeSubmission,
} from '../src/lab-assessment.js';

const student = { name: 'Learner One', id: 's01', group: 'A' };
const node = (id, type, params = {}) => ({
  id,
  type,
  x: 0,
  y: 0,
  label: id,
  enabled: true,
  params: { ...getDefinition(type).defaults, ...params },
});
const wire = (id, a, ap, b, bp) => ({
  id,
  from: { node: a, port: ap },
  to: { node: b, port: bp },
  width: 1,
});
function fixture() {
  const project = {
    version: 1,
    name: 'Remember a bit',
    nodes: [
      node('data', 'switch'),
      node('clk', 'switch'),
      node('rst', 'switch'),
      node('ff', 'd_ff'),
      node('lamp', 'led'),
    ],
    wires: [
      wire('d', 'data', 'out', 'ff', 'd'),
      wire('c', 'clk', 'out', 'ff', 'clk'),
      wire('r', 'rst', 'out', 'ff', 'reset'),
      wire('q', 'ff', 'q', 'lamp', 'in'),
    ],
  };
  const sequence = createSequence(project, {
    probes: [{ node: 'lamp', port: 'in', side: 'inputs' }],
  });
  for (const [at, n, value] of [
    [0, 'data', 1],
    [0.011, 'clk', 1],
    [0.025, 'clk', 0],
    [0.033, 'data', 0],
    [0.051, 'clk', 1],
    [0.057, 'clk', 0],
    [0.069, 'rst', 1],
    [0.087, 'rst', 0],
  ])
    appendAction(sequence, { at, node: n, key: 'value', value });
  finishSequence(sequence, 0.1);
  const key = createAssignment({
    title: 'Clocked memory',
    instructions: 'Build D memory with reset and an output indicator.',
    referenceProject: project,
    sequence,
    starterMode: 'interfaces',
  });
  const assignment = issueAssignment(key, { studentId: student.id, seed: 'variant01' });
  return { project, sequence, key, assignment };
}
async function submissionFixture() {
  const fixtureValue = fixture();
  const attempt = createAttempt(fixtureValue.assignment, student);
  recordEdit(attempt, fixtureValue.project, { at: 1, event: 'connect' });
  const submission = await createSubmission({ ...fixtureValue, student, attempt });
  return { ...fixtureValue, submission, attempt };
}
const stable = (v) =>
  Array.isArray(v)
    ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
async function resign(value) {
  const payload = { ...value };
  delete payload.integrity;
  value.integrity.digest = [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable(payload))),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}

test('public task keeps only input/output interfaces and no solution, secret actions or expected results', () => {
  const { key, assignment } = fixture();
  assert.equal(
    assignment.starterProject.nodes.some((n) => n.id === 'ff'),
    false,
  );
  assert.equal(assignment.starterProject.wires.length, 0);
  for (const field of ['referenceProject', 'sequence', 'actions', 'expected', 'issued'])
    assert.equal(Object.hasOwn(assignment, field), false);
  assert.equal(assignment.variant.studentId, 's01');
  assert.equal(key.issued.length, 1);
  assert.deepEqual(parseAssignment(serializeAssignment(assignment)), assignment);
  assert.deepEqual(parseAssignmentKey(serializeAssignmentKey(key)), key);
});
test('student variants change byte input values reproducibly while keeping teacher test data private', () => {
  const { project, sequence } = fixture();
  project.nodes.push(node('address', 'bus_input', { value: 3 }));
  sequence.initialProject = structuredClone(project);
  const key = createAssignment({ title: 'Address task', referenceProject: project, sequence });
  const a = issueAssignment(key, { seed: 'first' }),
    b = issueAssignment(key, { seed: 'second' });
  assert.notEqual(a.id, b.id);
  assert.notDeepEqual(a.variant.sourceValues, b.variant.sourceValues);
  assert.equal(
    a.starterProject.nodes.find((n) => n.id === 'address').params.value,
    a.variant.sourceValues.find((source) => source.node === 'address').value,
  );
  assert.equal(a.referenceProject, undefined);
});
test('construction journal ignores layout, naming, annotation and live source changes but records circuit changes', () => {
  const { assignment, project } = fixture();
  const attempt = createAttempt(assignment, student),
    copy = structuredClone(assignment.starterProject);
  copy.nodes.reverse();
  for (const n of copy.nodes) {
    n.x += 500;
    n.y -= 400;
    n.label = 'Changed';
    if (n.type === 'switch') n.params.value = 1;
  }
  assert.equal(recordEdit(attempt, copy, { at: 1 }), false);
  assert.equal(recordEdit(attempt, project, { at: 2, event: 'build' }), true);
  assert.equal(recordEdit(attempt, project, { at: 3 }), false);
  assert.equal(attempt.journal.length, 1);
});
test('teacher recomputes every action result, validates issued identity and passes the solved memory circuit', async () => {
  const { submission, key } = await submissionFixture();
  const result = await gradeSubmission(parseSubmission(serializeSubmission(submission)), key);
  assert.equal(result.passed, true);
  assert.equal(result.integrity, true);
  assert.equal(result.observationsMatch, true);
  assert.equal(result.mismatches.length, 0);
  assert.equal(result.checks, 10);
  assert.equal(result.evidence.constructionChanges, 1);
  assert.equal(result.evidence.selfReported, true);
  assert.match(result.evidence.limitation, /not proof/);
  const another = fixture().key;
  await assert.rejects(() => gradeSubmission(submission, another), /different assignment/);
  const swapped = structuredClone(submission);
  swapped.student.id = 's02';
  await assert.rejects(() => gradeSubmission(swapped, key), /different student/);
});
test('tampering results still fails even when a student recalculates the unkeyed SHA256 digest', async () => {
  const { submission, key } = await submissionFixture();
  const altered = structuredClone(submission);
  altered.observations[2].values[0] = 0;
  await resign(altered);
  const result = await gradeSubmission(altered, key);
  assert.equal(result.integrity, true, 'digest is not an authenticity signature');
  assert.equal(result.observationsMatch, false);
  assert.equal(result.passed, false);
});
test('hidden teacher replay catches a wrong intermediate state although final output and honest recorded result match', async () => {
  const { project, sequence, key, assignment } = fixture();
  // Bypass the memory: final input/output is 0, but DATA must not drive the lamp between clocks.
  const bypass = structuredClone(project);
  bypass.wires.find((w) => w.id === 'q').from = { node: 'data', port: 'out' };
  const ownSequence = structuredClone(sequence);
  ownSequence.initialProject = bypass;
  const attempt = createAttempt(assignment, student);
  recordEdit(attempt, bypass, { at: 1 });
  const submission = await createSubmission({
    assignment,
    student,
    attempt,
    project: bypass,
    sequence: ownSequence,
  });
  const result = await gradeSubmission(submission, key);
  assert.equal(result.integrity, true);
  assert.equal(result.observationsMatch, true);
  assert.equal(result.passed, false);
  assert.ok(result.mismatches.some((m) => m.at < 0.07));
  assert.equal(result.observations.at(-1).values[0], 0);
});
test('grading rejects unissued or modified variants and submissions must be recorded against the submitted circuit', async () => {
  const { submission, key, assignment, project, sequence } = await submissionFixture();
  const altered = structuredClone(submission);
  altered.assignment.variant.seed = 'tampered';
  await assert.rejects(() => gradeSubmission(altered, key), /not issued/);
  const bad = structuredClone(project);
  bad.wires.pop();
  await assert.rejects(
    () =>
      createSubmission({
        assignment,
        student,
        attempt: createAttempt(assignment, student),
        project: bad,
        sequence,
      }),
    /changed/,
  );
  assert.throws(() => parseSubmission('{"__proto__":{}}'), /unsafe/);
  assert.throws(
    () =>
      validateAssignment({
        ...assignment,
        probes: [{ node: 'lamp', port: 'bad', side: 'inputs' }],
      }),
    /missing/,
  );
  assert.throws(
    () => validateAssignmentKey({ ...key, issued: [...key.issued, ...key.issued] }),
    /Duplicate/,
  );
});
function renamed(project) {
  const result = structuredClone(project),
    ids = new Map(result.nodes.map((n, i) => [n.id, `new${i}`]));
  result.name = 'Another title';
  result.nodes.reverse();
  for (const n of result.nodes) {
    n.id = ids.get(n.id);
    n.x += 500;
    n.y += 300;
    n.label = 'Cosmetic';
  }
  for (const [i, w] of result.wires.entries()) {
    w.id = `edge${i}`;
    w.from.node = ids.get(w.from.node);
    w.to.node = ids.get(w.to.node);
    w.points = [{ x: 2, y: 3 }];
  }
  result.wires.reverse();
  return { project: result, ids };
}
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

test('attempt drafts resume only with matching task and a well-formed construction journal', () => {
  const { assignment, project, key } = fixture();
  const attempt = createAttempt(assignment, student);
  assert.deepEqual(validateAttempt(structuredClone(attempt), assignment), attempt);
  recordEdit(attempt, project, { at: 2, event: 'connect' });
  assert.deepEqual(validateAttempt(attempt), attempt);
  assert.throws(
    () => validateAttempt({ ...attempt, lastFingerprint: 'not-a-fingerprint' }),
    /fingerprint/,
  );
  assert.throws(() => validateAttempt({ ...attempt, startedAt: 'never' }), /date/);
  const other = issueAssignment(key, { seed: 'other' });
  assert.throws(() => validateAttempt(attempt, other), /different assignment/);
});

test('switch-only variants alter serial data while preserving reset and clock source baselines and edges', async () => {
  const { key } = fixture();
  let pair;
  for (let a = 0; a < 8 && !pair; a++)
    for (let b = a + 1; b < 8 && !pair; b++) {
      const first = issueAssignment(key, { seed: `serial${a}` }),
        second = issueAssignment(key, { seed: `serial${b}` });
      if (first.variant.sourceValues[0]?.value !== second.variant.sourceValues[0]?.value)
        pair = [first, second];
    }
  assert.ok(pair, 'different binary data variants exist');
  for (const assignment of pair) {
    assert.deepEqual(
      assignment.variant.sourceValues.map((source) => source.node),
      ['data'],
    );
    assert.equal(assignment.starterProject.nodes.find((n) => n.id === 'clk').params.value, 0);
    assert.equal(assignment.starterProject.nodes.find((n) => n.id === 'rst').params.value, 0);
  }
  const reports = [];
  for (const assignment of pair) {
    const nextStudent = { name: 'Learner', id: 'any' };
    const attempt = createAttempt(assignment, nextStudent);
    const sequence = structuredClone(key.sequence);
    const submission = await createSubmission({
      assignment,
      student: nextStudent,
      attempt,
      project: key.referenceProject,
      sequence,
    });
    reports.push(await gradeSubmission(submission, key));
  }
  assert.notDeepEqual(
    reports[0].observations.map((o) => o.values),
    reports[1].observations.map((o) => o.values),
  );
  assert.equal(
    reports.every((r) => r.functionalPassed),
    true,
  );
  assert.equal(
    reports.every((r) => r.reviewRequired && r.workEvidenceMissing),
    true,
  );
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
