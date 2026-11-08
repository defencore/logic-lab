import { validateAssignmentKey, assignmentForVariant, starterFor } from './assignments.js';

/** Metadata changes keep the grading reference and issued identity registry intact. */
export function reviseAssignmentMetadata(source, { title, instructions }) {
  const key = validateAssignmentKey({ ...structuredClone(source), title, instructions });
  return { key, assignments: key.issued.map((variant) => assignmentForVariant(key, variant.id)) };
}

/** This projection deliberately contains no solution, hidden actions or expected observations. */
export function publicStarterPreview(source, variantId) {
  const key = validateAssignmentKey(source);
  if (variantId) return assignmentForVariant(key, variantId);
  return {
    title: key.title,
    instructions: key.instructions,
    starterProject: starterFor(key, { sourceValues: [] }),
    probes: structuredClone(key.probes),
    personalized: false,
  };
}
