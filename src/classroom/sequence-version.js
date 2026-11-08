import { sameCircuitStructure } from '../assessment/topology.js';

export function describeSequenceVersion(sequence, project) {
  if (!sequence) return null;
  return {
    previous: sameCircuitStructure(project, sequence.initialProject) !== true,
    recordedNodes: sequence.initialProject.nodes.length,
    currentNodes: project.nodes.length,
    recordedWires: sequence.initialProject.wires.length,
    currentWires: project.wires.length,
  };
}

/** Circuit semantics are checked on edits or sequence changes, never on every animation frame. */
export function createSequenceVersion(session) {
  let sequence,
    project,
    description = null;
  return {
    refresh(force = false) {
      const nextSequence = session.sequenceToSave(),
        nextProject = session.projectToSave();
      if (force || sequence !== nextSequence || project !== nextProject) {
        sequence = nextSequence;
        project = nextProject;
        description = describeSequenceVersion(sequence, project);
      }
      return description;
    },
  };
}
export function previousVersionMessage(version, language) {
  if (!version?.previous) return '';
  return language === 'ua'
    ? `Запис попередньої версії. Схема запису: ${version.recordedNodes} компонентів; поточна: ${version.currentNodes}. Результати стосуються схеми запису. Зупиніть перегляд, щоб повернутися до поточної схеми.`
    : `Previous-version recording. Recorded circuit: ${version.recordedNodes} components; current: ${version.currentNodes}. Results belong to the recorded circuit. Stop viewing to return to the current circuit.`;
}
