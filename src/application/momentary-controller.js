import { isMomentaryInput } from '../components/peripheral-inputs.js';

/** A live circuit starts released without modifying a saved or recorded baseline. */
export function normalizeMomentaryInputs(project) {
  const isHeld = (node) => isMomentaryInput(node) && node.params?.value === 1;
  if (!project.nodes.some(isHeld)) return project;
  return {
    ...project,
    nodes: project.nodes.map((node) =>
      isHeld(node) ? { ...node, params: { ...node.params, value: 0 } } : node,
    ),
  };
}

/** Held inputs belong to the original node/project, never a later replay with the same IDs. */
export function createMomentaryController({ getProject, canPress, canWrite, writeValue }) {
  const held = new Map();
  function press(id) {
    reconcile();
    if (!canPress()) return false;
    const project = getProject(),
      node = project.nodes.find((node) => node.id === id && isMomentaryInput(node));
    if (!node || node.enabled === false) return false;
    if (held.has(id)) {
      held.get(id).count++;
      return true;
    }
    held.set(id, { project, node, count: 1 });
    writeValue(node, 1);
    return true;
  }
  function release(id, all = false) {
    const entry = held.get(id);
    if (!entry) return false;
    if (!all && --entry.count > 0) return true;
    held.delete(id);
    if (entry.project === getProject() && entry.project.nodes.includes(entry.node))
      writeValue(entry.node, 0);
    else entry.node.params.value = 0;
    return true;
  }
  function suspend() {
    for (const id of [...held.keys()]) release(id, true);
  }
  function reconcile() {
    const project = getProject();
    for (const [id, entry] of held)
      if (
        entry.project !== project ||
        !project.nodes.includes(entry.node) ||
        !isMomentaryInput(entry.node) ||
        entry.node.enabled === false ||
        !canWrite()
      )
        release(id, true);
    if (canWrite())
      for (const node of project.nodes)
        if (isMomentaryInput(node) && node.params.value === 1 && !held.has(node.id))
          writeValue(node, 0);
  }
  const hidden = () => {
    if (document.hidden) suspend();
  };
  window.addEventListener('blur', suspend);
  document.addEventListener('visibilitychange', hidden);
  return {
    press,
    release,
    suspend,
    reconcile,
    dispose() {
      suspend();
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', hidden);
    },
  };
}
