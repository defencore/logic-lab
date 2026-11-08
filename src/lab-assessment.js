import { getDefinition } from './catalog.js';
import { validateProject } from './project.js';
import {
  SOURCE_PARAMETERS,
  boundedJson,
  boundedSerialize,
  defaultProbes,
  validateProbes,
  validateSequence,
  createPlayback,
  advancePlayback,
} from './action-sequence.js';

const MAX_FILES = 40;
const MAX_ISSUED = 200;
const MAX_JOURNAL = 2000;
const LIMITATION =
  'Browser files and hashes can be edited. Similarity is a review signal, not proof of copying or identity. Verify understanding with an individual task or discussion.';
const fail = (message) => {
  throw new Error(message);
};
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clone = (value) => structuredClone(value);
const text = (value, label, max = 200) => {
  if (typeof value !== 'string' || value.length > max) fail(`${label} is invalid.`);
  return value;
};
const object = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object.`);
  return value;
};
const id = (value) => {
  const result = text(value, 'Identifier', 100);
  if (!/^[A-Za-z0-9_-]+$/.test(result)) fail('Identifier contains unsupported characters.');
  return result;
};
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
// A compact, deterministic graph refinement label. It is deliberately not used for file integrity.
function labelHash(value) {
  let a = 2166136261,
    b = 5381;
  for (let index = 0; index < value.length; index++) {
    a = Math.imul(a ^ value.charCodeAt(index), 16777619);
    b = Math.imul(b, 33) ^ value.charCodeAt(index);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
function semanticNodes(project, { ignoreSourceValues = false } = {}) {
  return project.nodes
    .filter((node) => !['note', 'group'].includes(node.type))
    .map((node) => {
      const params = { ...getDefinition(node.type).defaults, ...node.params };
      if (ignoreSourceValues)
        for (const key of Object.keys(SOURCE_PARAMETERS[node.type] || {})) delete params[key];
      return { id: node.id, type: node.type, enabled: node.enabled !== false, params };
    });
}
function graphLabels(project, options) {
  const nodes = semanticNodes(project, options);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = project.wires.filter(
    (wire) => nodeMap.has(wire.from.node) && nodeMap.has(wire.to.node),
  );
  const adjacent = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    adjacent.get(edge.from.node).push(['out', edge.from.port, edge.to.port, edge.to.node]);
    adjacent.get(edge.to.node).push(['in', edge.to.port, edge.from.port, edge.from.node]);
  }
  let labels = new Map(
    nodes.map((node) => [
      node.id,
      labelHash(stable({ type: node.type, enabled: node.enabled, params: node.params })),
    ]),
  );
  // Fixed rounds and sorted multisets make labels invariant to ordering and cosmetic edits.
  for (let round = 0; round < Math.min(12, nodes.length); round++) {
    const next = new Map();
    for (const node of nodes) {
      const neighbours = adjacent
        .get(node.id)
        .map(([direction, from, to, neighbour]) => [direction, from, to, labels.get(neighbour)]);
      next.set(node.id, labelHash(stable([labels.get(node.id), neighbours.map(stable).sort()])));
    }
    labels = next;
  }
  return { nodes, edges, labels };
}
export function graphFingerprint(source, options = {}) {
  const project = validateProject(source);
  const { nodes, edges, labels } = graphLabels(project, options);
  return labelHash(
    stable({
      nodes: nodes.map((node) => labels.get(node.id)).sort(),
      edges: edges
        .map((edge) => [
          labels.get(edge.from.node),
          edge.from.port,
          labels.get(edge.to.node),
          edge.to.port,
        ])
        .map(stable)
        .sort(),
    }),
  );
}
function studentData(value = {}) {
  object(value, 'Student');
  return {
    name: text(value.name || '', 'Student name', 200),
    id: text(value.id || '', 'Student ID', 100),
    group: text(value.group || '', 'Student group', 100),
  };
}
function observedByProject(probes, project) {
  return validateProbes(probes, project);
}
function issuedEntry(value, reference) {
  object(value, 'Issued variant');
  if (!Array.isArray(value.sourceValues) || value.sourceValues.length > 200)
    fail('Invalid variant sources.');
  const sourceValues = value.sourceValues.map((source) => {
    const node = reference.nodes.find((node) => node.id === source.node);
    if (
      !node ||
      !own(SOURCE_PARAMETERS[node.type] || {}, source.key) ||
      typeof source.value !== 'number' ||
      !Number.isFinite(source.value)
    )
      fail('Invalid variant source.');
    const [minimum, maximum, integer] = SOURCE_PARAMETERS[node.type][source.key];
    if (
      source.value < minimum ||
      source.value > maximum ||
      (integer && !Number.isInteger(source.value))
    )
      fail('Invalid variant source value.');
    return { node: node.id, key: source.key, value: source.value };
  });
  if (
    new Set(sourceValues.map((source) => `${source.node}:${source.key}`)).size !==
    sourceValues.length
  )
    fail('Duplicate variant input.');
  return {
    id: id(value.id),
    studentId: text(value.studentId || '', 'Assigned student', 100),
    seed: id(value.seed),
    sourceValues,
  };
}
export function validateAssignmentKey(value) {
  object(value, 'Teacher assignment');
  if (value.kind !== 'logic-lab-assignment-key' || value.version !== 1)
    fail('Unsupported teacher assignment format.');
  const referenceProject = validateProject(value.referenceProject);
  const sequence = validateSequence(value.sequence);
  const probes = observedByProject(value.probes, referenceProject);
  if (!Array.isArray(value.issued) || value.issued.length > MAX_ISSUED)
    fail('Too many issued variants.');
  const issued = value.issued.map((entry) => issuedEntry(entry, referenceProject));
  if (new Set(issued.map((entry) => entry.id)).size !== issued.length)
    fail('Duplicate issued variants.');
  const starterMode = value.starterMode || 'interfaces';
  if (!['interfaces', 'components'].includes(starterMode)) fail('Unknown starter mode.');
  return {
    kind: 'logic-lab-assignment-key',
    version: 1,
    id: id(value.id),
    title: text(value.title, 'Assignment title', 200),
    instructions: text(value.instructions, 'Instructions', 20_000),
    referenceProject,
    sequence: { ...sequence, probes },
    probes,
    starterMode,
    issued,
  };
}
export function createAssignment({
  title,
  instructions = '',
  referenceProject,
  sequence,
  probes,
  starterMode = 'interfaces',
}) {
  const baseline = createPlayback(sequence, { project: referenceProject }).project;
  return validateAssignmentKey({
    kind: 'logic-lab-assignment-key',
    version: 1,
    id: crypto.randomUUID(),
    title,
    instructions,
    referenceProject: baseline,
    sequence,
    probes: probes || sequence.probes || defaultProbes(baseline),
    starterMode,
    issued: [],
  });
}
function rng(seed) {
  let state = parseInt(labelHash(seed).slice(0, 8), 16) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function variantSources(project, seed) {
  return project.nodes
    .filter((node) => node.type === 'bus_input' || isDataSwitch(project, node))
    .map((node) => ({
      node: node.id,
      key: 'value',
      value: transformInput(
        node,
        node.params.value ?? getDefinition(node.type).defaults.value,
        seed,
      ),
    }));
}
function transformInput(node, value, seed) {
  // A per-source bijection preserves repeated addresses and distinct low-bit addresses.
  const mask = Math.floor(rng(`${seed}:${node.id}`)() * (node.type === 'switch' ? 2 : 256));
  return value ^ mask;
}
function isDataSwitch(project, node) {
  if (node.type !== 'switch') return false;
  const protectedPorts = new Set(['clk', 'reset', 'trigger', 'step', 'run']);
  const byId = new Map(project.nodes.map((node) => [node.id, node]));
  const visited = new Set(),
    pending = [node.id];
  let reachesData = false;
  while (pending.length) {
    const current = pending.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of project.wires.filter((wire) => wire.from.node === current)) {
      if (protectedPorts.has(edge.to.port)) return false;
      const target = byId.get(edge.to.node);
      const def = getDefinition(target.type);
      if (
        def.category === 'sequential' ||
        ['led', 'scope', 'matrix', 'sevenseg'].includes(target.type)
      )
        reachesData = true;
      else if (def.signals.outputs.length) pending.push(target.id);
    }
  }
  return reachesData;
}
function withSources(project, sourceValues) {
  const result = clone(project);
  for (const source of sourceValues)
    result.nodes.find((node) => node.id === source.node).params[source.key] = source.value;
  return result;
}
export function issueAssignment(key, { studentId = '', seed = crypto.randomUUID() } = {}) {
  const checked = validateAssignmentKey(key);
  if (checked.issued.length >= MAX_ISSUED)
    fail('An assignment supports at most 200 issued variants.');
  const variant = issuedEntry(
    {
      id: crypto.randomUUID(),
      studentId,
      seed,
      sourceValues: variantSources(checked.referenceProject, seed),
    },
    checked.referenceProject,
  );
  const starterProject = starterFor(checked, variant);
  key.issued.push(variant);
  return validateAssignment({
    kind: 'logic-lab-assignment',
    version: 1,
    id: variant.id,
    taskId: checked.id,
    title: checked.title,
    instructions: checked.instructions,
    starterProject,
    probes: checked.probes,
    variant,
  });
}
function starterFor(checked, variant) {
  const starterProject = withSources(checked.referenceProject, variant.sourceValues);
  starterProject.wires = [];
  delete starterProject.exampleId;
  if (checked.starterMode === 'interfaces') {
    const protectedNodes = new Set([
      ...checked.probes.map((probe) => probe.node),
      ...checked.sequence.actions.filter((action) => action.node).map((action) => action.node),
    ]);
    starterProject.nodes = starterProject.nodes.filter(
      (node) =>
        protectedNodes.has(node.id) ||
        SOURCE_PARAMETERS[node.type] ||
        ['led', 'scope', 'sevenseg', 'matrix', 'note', 'gnd', 'vcc', 'pullup', 'pulldown'].includes(
          node.type,
        ),
    );
  }
  return starterProject;
}
export function validateAssignment(value) {
  object(value, 'Student assignment');
  if (value.kind !== 'logic-lab-assignment' || value.version !== 1)
    fail('Unsupported student assignment format.');
  const starterProject = validateProject(value.starterProject);
  const variant = issuedEntry(value.variant, starterProject);
  if (id(value.id) !== variant.id) fail('Assignment variant ID does not match.');
  const probes = validateProbes(value.probes, starterProject);
  return {
    kind: 'logic-lab-assignment',
    version: 1,
    id: variant.id,
    taskId: id(value.taskId),
    title: text(value.title, 'Assignment title', 200),
    instructions: text(value.instructions, 'Instructions', 20_000),
    starterProject,
    probes,
    variant,
  };
}
export const parseAssignmentKey = (source) =>
  validateAssignmentKey(boundedJson(source, 'Teacher assignment'));
export const serializeAssignmentKey = (key) =>
  boundedSerialize(validateAssignmentKey(key), 'Teacher assignment');
export const parseAssignment = (source) =>
  validateAssignment(boundedJson(source, 'Student assignment'));
export const serializeAssignment = (assignment) =>
  boundedSerialize(validateAssignment(assignment), 'Student assignment');
export function createAttempt(assignment, student) {
  const checked = validateAssignment(assignment);
  return {
    id: crypto.randomUUID(),
    assignment: checked,
    student: studentData(student),
    startedAt: new Date().toISOString(),
    journal: [],
    lastFingerprint: graphFingerprint(checked.starterProject, { ignoreSourceValues: true }),
  };
}
export function recordEdit(attempt, project, { at = 0, event = 'edit' } = {}) {
  const fingerprint = graphFingerprint(project, { ignoreSourceValues: true });
  if (fingerprint === attempt.lastFingerprint) return false;
  if (attempt.journal.length >= MAX_JOURNAL)
    fail('The construction journal reached its 2000 change limit.');
  if (!Number.isFinite(at) || at < 0) fail('Construction journal time is invalid.');
  const previous = attempt.journal.at(-1)?.at || 0;
  const item = {
    at: Math.max(previous, at),
    event: text(event, 'Edit label', 100),
    fingerprint,
    nodes: project.nodes.filter((node) => !['note', 'group'].includes(node.type)).length,
    wires: project.wires.length,
  };
  attempt.journal.push(item);
  attempt.lastFingerprint = fingerprint;
  return true;
}
async function digest(value) {
  const bytes = new TextEncoder().encode(stable(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
const payload = (submission) => {
  const result = { ...submission };
  delete result.integrity;
  return result;
};
async function run(sequence, project) {
  const playback = createPlayback(sequence, { project });
  const complexity = Math.max(1, project.nodes.length + project.wires.length);
  const workBudget = Math.min(250_000, Math.floor(20_000_000 / complexity));
  const chunk = Math.max(1, Math.min(250, Math.floor(20_000 / complexity)));
  let operations = 0;
  while (!playback.done) {
    operations += advancePlayback(playback, sequence.duration, { maxSteps: chunk }).steps;
    if (operations > workBudget)
      fail('Replay exceeds the supported work budget. Shorten the sequence.');
    if (!playback.done) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return playback;
}
function journalData(value) {
  if (!Array.isArray(value) || value.length > MAX_JOURNAL) fail('Invalid construction journal.');
  let previous = 0;
  return value.map((entry) => {
    object(entry, 'Journal entry');
    if (
      !Number.isFinite(entry.at) ||
      entry.at < previous ||
      entry.at > 1e9 ||
      !Number.isInteger(entry.nodes) ||
      entry.nodes < 0 ||
      entry.nodes > 1000 ||
      !Number.isInteger(entry.wires) ||
      entry.wires < 0 ||
      entry.wires > 5000 ||
      !/^[0-9a-f]{16}$/.test(entry.fingerprint)
    )
      fail('Invalid construction journal entry.');
    previous = entry.at;
    return {
      at: entry.at,
      event: text(entry.event, 'Edit label', 100),
      fingerprint: entry.fingerprint,
      nodes: entry.nodes,
      wires: entry.wires,
    };
  });
}
export function validateAttempt(value, assignment) {
  object(value, 'Student attempt');
  const checked = validateAssignment(value.assignment);
  if (assignment && checked.id !== validateAssignment(assignment).id)
    fail('The saved attempt belongs to a different assignment.');
  const journal = journalData(value.journal);
  const expected =
    journal.at(-1)?.fingerprint ||
    graphFingerprint(checked.starterProject, { ignoreSourceValues: true });
  if (value.lastFingerprint !== expected) fail('Saved attempt journal fingerprint does not match.');
  const startedAt = text(value.startedAt, 'Attempt start', 100);
  if (!Number.isFinite(Date.parse(startedAt))) fail('Saved attempt start date is invalid.');
  return {
    id: id(value.id),
    assignment: checked,
    student: studentData(value.student),
    startedAt,
    journal,
    lastFingerprint: expected,
  };
}
function observationsData(observations, sequence) {
  if (!Array.isArray(observations) || observations.length > sequence.actions.length + 2)
    fail('Invalid submitted observations.');
  return observations.map((entry) => {
    object(entry, 'Observation');
    if (
      !Number.isFinite(entry.at) ||
      entry.at < 0 ||
      entry.at > sequence.duration + 1e-8 ||
      !Number.isInteger(entry.after) ||
      entry.after < -1 ||
      entry.after > sequence.actions.length ||
      !Array.isArray(entry.values) ||
      entry.values.length !== sequence.probes.length
    )
      fail('Invalid submitted observation.');
    const values = entry.values.map((value) => {
      if (value === 'X' || value === 'Z' || (typeof value === 'number' && Number.isFinite(value)))
        return value;
      fail('Invalid observed value.');
    });
    return { at: entry.at, after: entry.after, values };
  });
}
export function validateSubmission(value) {
  object(value, 'Submission');
  if (value.kind !== 'logic-lab-submission' || value.version !== 1)
    fail('Unsupported submission format.');
  const assignment = validateAssignment(value.assignment);
  const project = validateProject(value.project);
  const sequence = validateSequence(value.sequence);
  const attempt = object(value.attempt, 'Attempt');
  const integrity = object(value.integrity, 'File integrity');
  if (
    integrity.algorithm !== 'SHA-256' ||
    typeof integrity.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(integrity.digest)
  )
    fail('Invalid file integrity digest.');
  return {
    kind: 'logic-lab-submission',
    version: 1,
    id: id(value.id),
    assignment,
    student: studentData(value.student),
    attempt: {
      id: id(attempt.id),
      startedAt: text(attempt.startedAt, 'Attempt start', 100),
      journal: journalData(attempt.journal),
    },
    project,
    sequence,
    observations: observationsData(value.observations, sequence),
    notes: text(value.notes || '', 'Student notes', 20_000),
    integrity: { algorithm: 'SHA-256', digest: integrity.digest },
  };
}
export async function createSubmission({
  assignment,
  student,
  attempt,
  project,
  sequence,
  notes = '',
}) {
  const checkedAssignment = validateAssignment(assignment);
  const checkedProject = validateProject(project);
  const checkedSequence = validateSequence(sequence);
  if (!attempt || attempt.assignment?.id !== checkedAssignment.id)
    fail('Start an attempt for this assignment before submitting.');
  if (
    graphFingerprint(checkedProject, { ignoreSourceValues: true }) !==
    graphFingerprint(checkedSequence.initialProject, { ignoreSourceValues: true })
  )
    fail('The circuit changed after the action recording. Record the final circuit again.');
  const checkedStudent = studentData(student || attempt.student);
  if (!checkedStudent.name.trim() || !checkedStudent.id.trim())
    fail('Enter a student name and ID.');
  const playback = await run(checkedSequence, checkedProject);
  const result = {
    kind: 'logic-lab-submission',
    version: 1,
    id: crypto.randomUUID(),
    assignment: checkedAssignment,
    student: checkedStudent,
    attempt: { id: attempt.id, startedAt: attempt.startedAt, journal: clone(attempt.journal) },
    project: checkedProject,
    sequence: checkedSequence,
    observations: playback.observations,
    notes: text(notes, 'Student notes', 20_000),
  };
  result.integrity = { algorithm: 'SHA-256', digest: await digest(result) };
  return validateSubmission(result);
}
export const parseSubmission = (source) => validateSubmission(boundedJson(source, 'Submission'));
export const serializeSubmission = (submission) =>
  boundedSerialize(validateSubmission(submission), 'Submission');
function valuesEqual(a, b) {
  return typeof a === 'number' && typeof b === 'number'
    ? Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b))
    : a === b;
}
function observationsEqual(a, b) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        Math.abs(entry.at - b[index].at) < 1e-8 &&
        entry.after === b[index].after &&
        entry.values.length === b[index].values.length &&
        entry.values.every((value, bit) => valuesEqual(value, b[index].values[bit])),
    )
  );
}
function variantSequence(key, variant, project = key.referenceProject) {
  const sequence = clone(key.sequence);
  sequence.initialProject = withSources(project, variant.sourceValues);
  sequence.probes = key.probes;
  const eligible = new Set(
    key.referenceProject.nodes
      .filter((node) => node.type === 'bus_input' || isDataSwitch(key.referenceProject, node))
      .map((node) => node.id),
  );
  sequence.actions = sequence.actions.map((action) => {
    const source = key.referenceProject.nodes.find((node) => node.id === action.node);
    return eligible.has(action.node) && action.key === 'value'
      ? { ...action, value: transformInput(source, action.value, variant.seed) }
      : action;
  });
  return validateSequence(sequence);
}
export async function gradeSubmission(source, teacherKey) {
  const submission = validateSubmission(source),
    key = validateAssignmentKey(teacherKey);
  if (submission.assignment.taskId !== key.id)
    fail('The submission belongs to a different assignment.');
  const variant = key.issued.find((entry) => entry.id === submission.assignment.id);
  if (!variant || stable(variant) !== stable(submission.assignment.variant))
    fail('The submitted variant was not issued by this teacher key.');
  if (variant.studentId && variant.studentId !== submission.student.id)
    fail('This variant was issued to a different student.');
  const integrity = (await digest(payload(submission))) === submission.integrity.digest;
  const structureMatches =
    graphFingerprint(submission.project, { ignoreSourceValues: true }) ===
    graphFingerprint(submission.sequence.initialProject, { ignoreSourceValues: true });
  const submittedReplay = await run(submission.sequence, submission.project);
  const observationsMatch = observationsEqual(
    submittedReplay.observations,
    submission.observations,
  );
  const hidden = variantSequence(key, variant);
  const expected = await run(hidden, key.referenceProject);
  const actual = await run(hidden, submission.project);
  const mismatches = [];
  let checks = 0;
  expected.observations.forEach((observation, index) =>
    observation.values.forEach((value, probeIndex) => {
      checks++;
      const received = actual.observations[index]?.values[probeIndex];
      // Unknown and floating reference values are not meaningful grading criteria.
      if (value === 'X' || value === 'Z') {
        mismatches.push({
          at: observation.at,
          after: observation.after,
          probe: key.probes[probeIndex],
          expected: value,
          actual: received,
          reason: 'Reference output is unknown or floating.',
        });
      } else if (!valuesEqual(value, received))
        mismatches.push({
          at: observation.at,
          after: observation.after,
          probe: key.probes[probeIndex],
          expected: value,
          actual: received,
          reason: 'Output differs from the reference replay.',
        });
    }),
  );
  const starterFingerprint = graphFingerprint(starterFor(key, variant), {
    ignoreSourceValues: true,
  });
  const nonTemplateChanges = submission.attempt.journal.filter(
    (entry) => entry.fingerprint !== starterFingerprint,
  ).length;
  const evidence = {
    constructionChanges: nonTemplateChanges,
    actions: submission.sequence.actions.length,
    attemptId: submission.attempt.id,
    variantId: variant.id,
    studentBound: !!variant.studentId,
    selfReported: true,
    limitation: LIMITATION,
  };
  const passed =
    integrity &&
    structureMatches &&
    observationsMatch &&
    mismatches.length === 0 &&
    checks > 0 &&
    submission.sequence.actions.length > 0;
  return {
    passed,
    functionalPassed: passed,
    reviewRequired: nonTemplateChanges === 0 || !variant.studentId,
    workEvidenceMissing: nonTemplateChanges === 0,
    integrity,
    structureMatches,
    observationsMatch,
    checks,
    totalChecks: checks,
    matched: checks - mismatches.length,
    mismatches,
    evidence,
    observations: actual.observations,
  };
}
function multisetDice(a, b) {
  if (!a.length && !b.length) return 0;
  const counts = new Map();
  for (const value of a) counts.set(value, (counts.get(value) || 0) + 1);
  let common = 0;
  for (const value of b)
    if ((counts.get(value) || 0) > 0) {
      common++;
      counts.set(value, counts.get(value) - 1);
    }
  return (2 * common) / (a.length + b.length);
}
function graphFeatures(project, starter) {
  const protectedIds = new Set(starter?.nodes.map((node) => node.id) || []);
  const nodes = semanticNodes(project, { ignoreSourceValues: true });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const result = [];
  for (const node of nodes)
    if (!protectedIds.has(node.id))
      result.push(
        `node:${stable({ type: node.type, params: node.params, enabled: node.enabled })}`,
      );
  for (const wire of project.wires) {
    const a = byId.get(wire.from.node),
      b = byId.get(wire.to.node);
    if (a && b) result.push(`edge:${a.type}:${wire.from.port}>${b.type}:${wire.to.port}`);
  }
  return result;
}
function actionFingerprint(sequence) {
  const nodes = new Map(sequence.initialProject.nodes.map((node) => [node.id, node.type]));
  return labelHash(
    stable(
      sequence.actions.map((action) =>
        action.op === 'reset'
          ? ['reset', action.at]
          : [nodes.get(action.node), action.key, action.value, action.at],
      ),
    ),
  );
}
function exactTopology(left, right) {
  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length)
    return false;
  const candidates = new Map(
    left.nodes.map((node) => [
      node.id,
      right.nodes
        .filter((other) => left.labels.get(node.id) === right.labels.get(other.id))
        .map((other) => other.id),
    ]),
  );
  if ([...candidates.values()].some((list) => !list.length)) return false;
  const pairs = (graph) => {
    const values = new Map();
    for (const edge of graph.edges) {
      const key = stable([edge.from.node, edge.to.node]);
      if (!values.has(key)) values.set(key, []);
      values.get(key).push(stable([edge.from.port, edge.to.port]));
    }
    return new Map([...values].map(([key, ports]) => [key, stable(ports.sort())]));
  };
  const leftPairs = pairs(left),
    rightPairs = pairs(right),
    mapped = new Map(),
    used = new Set();
  const ordered = [...left.nodes].sort(
    (a, b) => candidates.get(a.id).length - candidates.get(b.id).length,
  );
  const connection = (table, a, b) => table.get(stable([a, b])) || '[]';
  let work = 0;
  const visit = (index) => {
    if (index === ordered.length) return true;
    if (++work > 20_000) return null;
    const a = ordered[index].id;
    for (const b of candidates.get(a)) {
      if (used.has(b) || connection(leftPairs, a, a) !== connection(rightPairs, b, b)) continue;
      let compatible = true;
      for (const [previous, other] of mapped) {
        if (
          connection(leftPairs, a, previous) !== connection(rightPairs, b, other) ||
          connection(leftPairs, previous, a) !== connection(rightPairs, other, b)
        ) {
          compatible = false;
          break;
        }
      }
      if (!compatible) continue;
      mapped.set(a, b);
      used.add(b);
      const result = visit(index + 1);
      if (result !== false) return result;
      mapped.delete(a);
      used.delete(b);
    }
    return false;
  };
  return visit(0);
}
export function compareSubmissions(sources, { assignmentKey } = {}) {
  if (!Array.isArray(sources) || sources.length > MAX_FILES)
    fail('Compare at most 40 submissions at once.');
  const submissions = sources.map(validateSubmission),
    pairs = [];
  const key = assignmentKey ? validateAssignmentKey(assignmentKey) : null;
  const information = submissions.map((submission) => {
    const variant =
      key?.id === submission.assignment.taskId &&
      key.issued.find((entry) => entry.id === submission.assignment.id);
    const starter = variant ? starterFor(key, variant) : submission.assignment.starterProject;
    return {
      features: graphFeatures(submission.project, starter),
      fingerprint: graphFingerprint(submission.project, { ignoreSourceValues: true }),
      graph: graphLabels(submission.project, { ignoreSourceValues: true }),
      actions: actionFingerprint(submission.sequence),
    };
  });
  for (let a = 0; a < submissions.length; a++)
    for (let b = a + 1; b < submissions.length; b++) {
      const left = submissions[a],
        right = submissions[b];
      if (left.assignment.taskId !== right.assignment.taskId) continue;
      const leftFeatures = information[a].features,
        rightFeatures = information[b].features;
      const hasWork = left.project.wires.length > 0 && right.project.wires.length > 0;
      const signatureMatches = hasWork && information[a].fingerprint === information[b].fingerprint;
      const equivalent = signatureMatches
        ? exactTopology(information[a].graph, information[b].graph)
        : false;
      const topologyExact = equivalent === true;
      const topologySimilarity = multisetDice(leftFeatures, rightFeatures);
      const actionsExact =
        left.sequence.actions.length > 0 &&
        right.sequence.actions.length > 0 &&
        information[a].actions === information[b].actions;
      const resultsExact =
        left.observations.length > 1 &&
        right.observations.length > 1 &&
        observationsEqual(left.observations, right.observations);
      const sharedAttempt = left.attempt.id === right.attempt.id;
      const sharedVariant = left.assignment.id === right.assignment.id;
      const deltas = left.sequence.actions
        .slice(1)
        .map((action, index) => action.at - left.sequence.actions[index].at)
        .filter((value) => value > 1e-6);
      const distinctiveTiming =
        deltas.length >= 3 && Math.max(...deltas) - Math.min(...deltas) > 1e-4;
      const canonicalSolution =
        !!key &&
        left.assignment.taskId === key.id &&
        topologyExact &&
        information[a].fingerprint ===
          graphFingerprint(key.referenceProject, { ignoreSourceValues: true });
      const reasons = [];
      if (sharedAttempt) reasons.push('Same attempt identifier.');
      if (sharedVariant) reasons.push('Same issued variant.');
      if (topologyExact)
        reasons.push(
          'Same refined circuit topology and component parameters despite cosmetic changes.',
        );
      else if (topologySimilarity >= 0.9 && leftFeatures.length >= 3 && rightFeatures.length >= 3)
        reasons.push('Very similar added components and port connections.');
      if (actionsExact) reasons.push('Identical ordered input values and timing.');
      if (resultsExact) reasons.push('Identical recorded values and timing.');
      if (canonicalSolution)
        reasons.push(
          'This task can have the same canonical solution; shared structure alone does not establish copying.',
        );
      const suspected =
        sharedAttempt ||
        sharedVariant ||
        (topologyExact && actionsExact && distinctiveTiming) ||
        (topologySimilarity >= 0.9 &&
          actionsExact &&
          distinctiveTiming &&
          leftFeatures.length >= 3);
      pairs.push({
        a,
        b,
        leftId: left.id,
        rightId: right.id,
        topologyExact,
        topologyUndetermined: equivalent === null,
        topologySimilarity,
        actionsExact,
        resultsExact,
        sharedAttempt,
        sharedVariant,
        distinctiveTiming,
        canonicalSolution,
        suspected,
        reasons,
        limitation: LIMITATION,
      });
    }
  return pairs;
}
