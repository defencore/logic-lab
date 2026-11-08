import { validateProject } from '../circuits/project.js';
import { boundedJson, boundedSerialize, validateSequence } from '../experiments/actions.js';
import {
  parseSubmission,
  validateAssignment,
  validateAttempt,
  graphFingerprint,
} from '../assessment/index.js';
import { digest, payload, stable } from '../assessment/canonical.js';
import { studentData, text, id } from '../assessment/schema.js';

function origin(value) {
  if (!value) return null;
  if (!/^[0-9a-f]{64}$/.test(value.digest)) throw new Error('Invalid original work checksum.');
  return { id: id(value.id), digest: value.digest };
}
function content(value) {
  const assignment = value.assignment ? validateAssignment(value.assignment) : null;
  const student = studentData(value.student);
  const attempt = value.attempt ? validateAttempt(value.attempt, assignment) : null;
  if (
    attempt &&
    (!assignment ||
      stable(attempt.assignment) !== stable(assignment) ||
      attempt.student.id !== student.id)
  )
    throw new Error('The saved attempt, assignment and student do not match.');
  if (assignment?.variant.studentId && assignment.variant.studentId !== student.id && attempt)
    throw new Error('This work belongs to another student ID.');
  return {
    kind: 'logic-lab-student-work',
    version: 1,
    assignment,
    student,
    attempt,
    project: validateProject(value.project),
    sequence: value.sequence ? validateSequence(value.sequence) : null,
    notes: text(value.notes || '', 'Student notes', 20_000),
    origin: origin(value.origin),
  };
}
async function verify(value) {
  if (
    value.integrity?.algorithm !== 'SHA-256' ||
    (await digest(payload(value))) !== value.integrity.digest
  )
    throw new Error(
      'The work file checksum does not match. The original file has been changed or damaged.',
    );
}
export async function createStudentWork(value) {
  const result = content(value);
  result.integrity = { algorithm: 'SHA-256', digest: await digest(result) };
  return result;
}
export function serializeStudentWork(value) {
  const checked = content(value);
  if (value.integrity?.algorithm !== 'SHA-256' || !/^[0-9a-f]{64}$/.test(value.integrity?.digest))
    throw new Error('Invalid work checksum.');
  return boundedSerialize({ ...checked, integrity: value.integrity }, 'Student work');
}
export async function parseStudentWork(source) {
  const value = boundedJson(source, 'Student work');
  if (value.kind === 'logic-lab-submission') {
    const submission = parseSubmission(source);
    await verify(submission);
    const assignment = submission.assignment;
    const attempt = validateAttempt(
      {
        ...submission.attempt,
        assignment,
        student: submission.student,
        lastFingerprint:
          submission.attempt.journal.at(-1)?.fingerprint ||
          graphFingerprint(assignment.starterProject, { ignoreSourceValues: true }),
      },
      assignment,
    );
    if (assignment.variant.studentId && assignment.variant.studentId !== submission.student.id)
      throw new Error('This work belongs to another student ID.');
    return {
      ...submission,
      attempt,
      origin: { id: submission.id, digest: submission.integrity.digest },
      saveKind: 'submission',
    };
  }
  if (value.kind !== 'logic-lab-student-work' || value.version !== 1)
    throw new Error('Open a saved student work or submission file.');
  await verify(value);
  return { ...content(value), integrity: value.integrity, saveKind: 'draft' };
}
