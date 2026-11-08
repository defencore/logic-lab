/** Held inputs belong to the original node/project, never a later replay with the same IDs. */
export function createMomentaryController({ getProject, canPress, canWrite, writeValue }) {
  const held = new Map();
  function press(id) {
    reconcile();
    if (!canPress()) return false;
    const project = getProject(),
      node = project.nodes.find((node) => node.id === id && node.type === 'button');
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
        entry.node.type !== 'button' ||
        entry.node.enabled === false ||
        !canWrite()
      )
        release(id, true);
    if (canWrite())
      for (const node of project.nodes)
        if (node.type === 'button' && node.params.value === 1 && !held.has(node.id))
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
