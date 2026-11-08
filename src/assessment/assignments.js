import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { getDefinition } from '../components/catalog/index.js';
import { validateProject } from '../circuits/project.js';
import {
  boundedJson,
  boundedSerialize,
  validateProbes,
  validateSequence,
  createPlayback,
} from '../experiments/actions.js';
import {
  MAX_ISSUED,
  MAX_JOURNAL,
  fail,
  own,
  clone,
  text,
  object,
  id,
  studentData,
  journalData,
} from './schema.js';
import { labelHash } from './canonical.js';
import { graphFingerprint } from './topology.js';

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
    probes: probes === undefined ? sequence.probes : probes,
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
  const protectedPorts = new Set([
    'clk',
    'reset',
    'trigger',
    'step',
    'run',
    'enable',
    'we',
    'cs',
    'oe',
    'sel',
  ]);
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
      if (target.type === 'sr_latch' && ['s', 'r'].includes(edge.to.port)) return false;
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
  key.issued.push(variant);
  return publicAssignment(checked, variant);
}

export function assignmentForVariant(key, variantId) {
  const checked = validateAssignmentKey(key);
  const variant = checked.issued.find((entry) => entry.id === variantId);
  if (!variant) fail('This variant was not issued by the teacher key.');
  return publicAssignment(checked, variant);
}

function publicAssignment(checked, variant) {
  return validateAssignment({
    kind: 'logic-lab-assignment',
    version: 1,
    id: variant.id,
    taskId: checked.id,
    title: checked.title,
    instructions: checked.instructions,
    starterProject: starterFor(checked, variant),
    probes: checked.probes,
    variant,
  });
}
export function starterFor(checked, variant) {
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
export function variantSequence(key, variant, project = key.referenceProject) {
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
