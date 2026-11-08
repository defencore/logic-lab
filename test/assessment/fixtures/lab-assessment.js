import { getDefinition } from '../../../src/components/catalog/index.js';
import { createSequence, appendAction, finishSequence } from '../../../src/experiments/actions.js';
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
} from '../../../src/assessment/index.js';

export const student = { name: 'Learner One', id: 's01', group: 'A' };

export const node = (id, type, params = {}) => ({
  id,
  type,
  x: 0,
  y: 0,
  label: id,
  enabled: true,
  params: { ...getDefinition(type).defaults, ...params },
});

export const wire = (id, a, ap, b, bp) => ({
  id,
  from: { node: a, port: ap },
  to: { node: b, port: bp },
  width: 1,
});

export function fixture() {
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

export async function submissionFixture() {
  const fixtureValue = fixture();
  const attempt = createAttempt(fixtureValue.assignment, student);
  recordEdit(attempt, fixtureValue.project, { at: 1, event: 'connect' });
  const submission = await createSubmission({ ...fixtureValue, student, attempt });
  return { ...fixtureValue, submission, attempt };
}

export const stable = (v) =>
  Array.isArray(v)
    ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
          .join(',')}}`
      : JSON.stringify(v);

export async function resign(value) {
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

export function renamed(project) {
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
