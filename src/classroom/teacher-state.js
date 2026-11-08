import { stable } from '../assessment/canonical.js';
import { sameCircuitStructure } from '../assessment/topology.js';

export const probeKey = (probe) => `${probe.node}:${probe.side}:${probe.port}`;
export const sequenceSignature = (sequence) =>
  sequence ? stable({ ...sequence, probes: [] }) : null;
export const keySignature = (key) => (key ? stable(key) : null);

export function teacherStatus(state, project) {
  const key = state.teacherKey;
  if (!key)
    return {
      hasKey: false,
      dirty: false,
      metadataChanged: false,
      structuralChanged: false,
      referenceChanged: false,
      keyNeedsDownload: false,
    };
  const form = state.teacherForm;
  const metadataChanged = form.title !== key.title || form.instructions !== key.instructions;
  const selected = form.probes ?? (key.probes || []).map(probeKey);
  const structuralChanged =
    form.starterMode !== key.starterMode ||
    stable([...selected].sort()) !== stable((key.probes || []).map(probeKey).sort());
  let referenceChanged =
    state.teacherSequenceBaseline !== undefined &&
    sequenceSignature(state.sequence) !== state.teacherSequenceBaseline;
  if (project && state.teacherEditorBaseline)
    referenceChanged ||= sameCircuitStructure(project, state.teacherEditorBaseline) !== true;
  const choice = state.teacherUseSavedReference;
  const usingSavedReference =
    referenceChanged &&
    !!choice &&
    sequenceSignature(state.sequence) === choice.sequence &&
    (!project || !choice.project || sameCircuitStructure(project, choice.project) === true);
  return {
    hasKey: true,
    dirty: metadataChanged || structuralChanged || (referenceChanged && !usingSavedReference),
    metadataChanged,
    structuralChanged,
    referenceChanged,
    usingSavedReference,
    keyNeedsDownload: keySignature(key) !== state.teacherSavedKeySignature,
  };
}
