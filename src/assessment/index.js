import { MAX_FILES, LIMITATION, fail, abortIfNeeded } from './schema.js';
import { stable, digest, payload, valuesEqual, observationsEqual } from './canonical.js';
import {
  graphLabels,
  graphFingerprint,
  multisetDice,
  graphFeatures,
  actionFingerprint,
  exactTopology,
  sameCircuitStructure,
} from './topology.js';
import { validateAssignmentKey, starterFor, variantSequence } from './assignments.js';
import { validateSubmission } from './submissions.js';
import { run } from './replay.js';
import { yieldToMain } from './scheduling.js';

export { graphFingerprint } from './topology.js';
export {
  validateAssignmentKey,
  createAssignment,
  issueAssignment,
  assignmentForVariant,
  validateAssignment,
  parseAssignmentKey,
  serializeAssignmentKey,
  parseAssignment,
  serializeAssignment,
  createAttempt,
  recordEdit,
  validateAttempt,
} from './assignments.js';
export {
  validateSubmission,
  createSubmission,
  parseSubmission,
  serializeSubmission,
} from './submissions.js';

export async function gradeSubmission(source, teacherKey, { signal } = {}) {
  abortIfNeeded(signal);
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
  abortIfNeeded(signal);
  const structureMatches =
    sameCircuitStructure(submission.project, submission.sequence.initialProject) === true;
  const submittedReplay = await run(submission.sequence, submission.project, { signal });
  const observationsMatch = observationsEqual(
    submittedReplay.observations,
    submission.observations,
  );
  const hidden = variantSequence(key, variant);
  const expected = await run(hidden, key.referenceProject, { signal });
  const actual = await run(hidden, submission.project, { signal });
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
  const functionalPassed = mismatches.length === 0 && checks > 0;
  const passed =
    integrity &&
    structureMatches &&
    observationsMatch &&
    functionalPassed &&
    submission.sequence.actions.length > 0;
  return {
    passed,
    functionalPassed,
    reviewRequired: !passed || nonTemplateChanges === 0 || !variant.studentId,
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
    studentObservations: submittedReplay.observations,
  };
}
function* comparisonPairs(sources, { assignmentKey, signal } = {}) {
  abortIfNeeded(signal);
  if (!Array.isArray(sources) || sources.length > MAX_FILES)
    fail('Compare at most 40 submissions at once.');
  const submissions = sources.map(validateSubmission);
  const key = assignmentKey ? validateAssignmentKey(assignmentKey) : null;
  const reference = key ? graphLabels(key.referenceProject, { ignoreSourceValues: true }) : null;
  const referenceFingerprint = key
    ? graphFingerprint(key.referenceProject, { ignoreSourceValues: true })
    : null;
  const information = submissions.map((submission) => {
    const variant =
      key?.id === submission.assignment.taskId &&
      key.issued.find((entry) => entry.id === submission.assignment.id);
    const starter = variant ? starterFor(key, variant) : submission.assignment.starterProject;
    const fingerprint = graphFingerprint(submission.project, { ignoreSourceValues: true });
    const graph = graphLabels(submission.project, { ignoreSourceValues: true });
    return {
      features: graphFeatures(submission.project, starter),
      fingerprint,
      graph,
      canonical:
        !!reference &&
        fingerprint === referenceFingerprint &&
        exactTopology(graph, reference) === true,
      actions: actionFingerprint(submission.sequence),
    };
  });
  for (let a = 0; a < submissions.length; a++)
    for (let b = a + 1; b < submissions.length; b++) {
      abortIfNeeded(signal);
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
        !!key && left.assignment.taskId === key.id && topologyExact && information[a].canonical;
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
      yield {
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
      };
    }
}

export function compareSubmissions(sources, options = {}) {
  return [...comparisonPairs(sources, options)];
}

export async function compareSubmissionsAsync(sources, options = {}) {
  const pairs = [];
  for (const pair of comparisonPairs(sources, options)) {
    pairs.push(pair);
    await yieldToMain(options.signal);
  }
  abortIfNeeded(options.signal);
  return pairs;
}
