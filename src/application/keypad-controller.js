import { KEYPAD_KEYS, keypadParameterError } from '../components/keypad.js';

/** Physical holds belong to their original matrix; latched keys survive an ordinary release. */
export function createKeypadController({ getProject, canPress, canWrite, writeKeys }) {
  const held = new Map(),
    modes = new WeakMap();
  function release(id, index, all = false) {
    const key = `${id}:${index}`,
      entry = held.get(key);
    if (!entry) return false;
    if (!all && --entry.count > 0) return true;
    held.delete(key);
    const keys = entry.node.params.keys & ~KEYPAD_KEYS[index].mask;
    if (entry.project === getProject() && entry.project.nodes.includes(entry.node))
      writeKeys(entry.node, keys);
    else entry.node.params.keys = keys;
    return true;
  }
  function suspend() {
    for (const entry of [...held.values()]) release(entry.node.id, entry.index, true);
  }
  function reconcile() {
    const project = getProject();
    for (const entry of [...held.values()])
      if (
        entry.project !== project ||
        !project.nodes.includes(entry.node) ||
        entry.node.enabled === false ||
        (entry.node.params.mode || 'hold') !== 'hold' ||
        !canWrite()
      )
        release(entry.node.id, entry.index, true);
    if (!canWrite()) return;
    for (const node of project.nodes) {
      if (node.type !== 'keypad' || keypadParameterError({ mode: 'hold', keys: 0, ...node.params }))
        continue;
      const mode = node.params.mode || 'hold',
        previous = modes.get(node);
      modes.set(node, mode);
      let keys = node.params.keys || 0;
      if (previous !== undefined && previous !== mode) keys = 0;
      if (mode === 'hold')
        keys &= [...held.values()]
          .filter((entry) => entry.node === node)
          .reduce((mask, entry) => mask | KEYPAD_KEYS[entry.index].mask, 0);
      if (keys !== (node.params.keys || 0)) writeKeys(node, keys);
    }
  }
  function press(id, index) {
    reconcile();
    if (!canPress() || !Number.isInteger(index) || !KEYPAD_KEYS[index]) return false;
    const project = getProject(),
      node = project.nodes.find((node) => node.id === id && node.type === 'keypad');
    if (
      !node ||
      node.enabled === false ||
      keypadParameterError({ mode: 'hold', keys: 0, ...node.params })
    )
      return false;
    const key = `${id}:${index}`,
      mask = KEYPAD_KEYS[index].mask;
    if (node.params.mode === 'toggle') writeKeys(node, (node.params.keys || 0) ^ mask);
    else if (held.has(key)) held.get(key).count++;
    else {
      held.set(key, { project, node, index, count: 1 });
      writeKeys(node, (node.params.keys || 0) | mask);
    }
    return true;
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
