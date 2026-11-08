import { validateProject } from '../project.js';
import { boundedJson, boundedSerialize, validateSequence } from '../action-sequence.js';
import {
  fail,
  text,
  object,
  id,
  studentData,
  journalData,
  observationsData,
  clone,
} from './schema.js';
import { digest } from './canonical.js';
import { sameCircuitStructure } from './topology.js';
import { validateAssignment } from './assignments.js';
import { run } from './replay.js';

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
  if (sameCircuitStructure(checkedProject, checkedSequence.initialProject) !== true)
    fail('The circuit changed after the action recording. Record the final circuit again.');
  const checkedStudent = studentData(student || attempt.student);
  if (!checkedStudent.name.trim() || !checkedStudent.id.trim())
    fail('Enter a student name and ID.');
  if (
    checkedAssignment.variant.studentId &&
    checkedAssignment.variant.studentId !== checkedStudent.id
  )
    fail('This variant was issued to a different student.');
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
