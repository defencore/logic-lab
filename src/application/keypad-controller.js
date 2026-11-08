import { KEYPAD_KEYS, KEYPAD_DEFAULTS, keypadParameterError } from '../components/keypad.js';

export const KEYPAD_QUEUE_LIMIT = 128;
export const KEYPAD_RELEASE_GAP = 0.01;
const parameters = (node) => ({ ...KEYPAD_DEFAULTS, ...node.params });
const EPSILON = 1e-10;

/** Physical holds, latched contacts and explicit timed pulse queues share one recorded mask. */
export function createKeypadController({
  getProject,
  getTime = () => 0,
  canPress,
  canWrite,
  writeKeys,
}) {
  const held = new Map(),
    pulses = new Map(),
    modes = new WeakMap();
  const current = (entry) =>
    entry.project === getProject() && entry.project.nodes.includes(entry.node);
  function write(entry, keys) {
    if (current(entry)) writeKeys(entry.node, keys);
    else entry.node.params.keys = keys;
  }
  function release(id, index, all = false) {
    const key = `${id}:${index}`,
      entry = held.get(key);
    if (!entry) return false;
    if (!all && --entry.count > 0) return true;
    held.delete(key);
    write(entry, entry.node.params.keys & ~KEYPAD_KEYS[index].mask);
    return true;
  }
  function clearPulse(id) {
    const entry = pulses.get(id);
    if (!entry) return;
    pulses.delete(id);
    if (entry.active) write(entry, entry.node.params.keys & ~KEYPAD_KEYS[entry.active.index].mask);
  }
  function pump(entry, now) {
    entry.lastTime = now;
    if (entry.active && now + EPSILON >= entry.active.until) {
      entry.active = null;
      entry.readyAt = now + KEYPAD_RELEASE_GAP;
      write(entry, 0);
    } else if (!entry.active && now + EPSILON >= entry.readyAt) {
      if (!entry.requests.length) {
        pulses.delete(entry.node.id);
        return;
      }
      const request = entry.requests.shift();
      entry.active = { index: request.index, until: now + request.duration };
      write(entry, KEYPAD_KEYS[request.index].mask);
    }
  }
  function suspend() {
    for (const entry of [...held.values()]) release(entry.node.id, entry.index, true);
    for (const id of [...pulses.keys()]) clearPulse(id);
  }
  function reconcile() {
    const project = getProject(),
      now = getTime();
    for (const entry of [...held.values()])
      if (
        !current(entry) ||
        entry.node.type !== 'keypad' ||
        entry.node.enabled === false ||
        parameters(entry.node).mode !== 'hold' ||
        !canWrite()
      )
        release(entry.node.id, entry.index, true);
    for (const [id, entry] of pulses) {
      const p = parameters(entry.node);
      if (
        !current(entry) ||
        entry.node.type !== 'keypad' ||
        entry.node.enabled === false ||
        p.mode !== 'pulse' ||
        keypadParameterError(p) ||
        !canWrite() ||
        !Number.isFinite(now) ||
        now + EPSILON < entry.lastTime
      )
        clearPulse(id);
    }
    if (!canWrite()) return;
    for (const node of project.nodes) {
      if (node.type !== 'keypad' || keypadParameterError(parameters(node))) continue;
      const mode = parameters(node).mode,
        previous = modes.get(node);
      modes.set(node, mode);
      let keys = node.params.keys || 0;
      if (previous !== undefined && previous !== mode) keys = 0;
      if (mode === 'hold')
        keys &= [...held.values()]
          .filter((entry) => entry.node === node)
          .reduce((mask, entry) => mask | KEYPAD_KEYS[entry.index].mask, 0);
      else if (mode === 'pulse') {
        const active = pulses.get(node.id)?.active;
        keys &= active ? KEYPAD_KEYS[active.index].mask : 0;
      }
      if (keys !== (node.params.keys || 0)) writeKeys(node, keys);
    }
    for (const entry of pulses.values()) pump(entry, now);
  }
  function press(id, index) {
    reconcile();
    if (!canPress() || !Number.isInteger(index) || !KEYPAD_KEYS[index]) return false;
    const project = getProject(),
      node = project.nodes.find((node) => node.id === id && node.type === 'keypad');
    if (!node || node.enabled === false || keypadParameterError(parameters(node))) return false;
    const p = parameters(node),
      key = `${id}:${index}`,
      mask = KEYPAD_KEYS[index].mask;
    if (p.mode === 'pulse') {
      const now = getTime();
      if (!Number.isFinite(now) || now < 0) return false;
      let entry = pulses.get(id);
      if (entry && entry.requests.length + Number(!!entry.active) >= KEYPAD_QUEUE_LIMIT)
        return false;
      if (!entry) {
        entry = { project, node, requests: [], active: null, readyAt: now, lastTime: now };
        pulses.set(id, entry);
      }
      entry.requests.push({ index, duration: p.pulseDuration ?? KEYPAD_DEFAULTS.pulseDuration });
      pump(entry, now);
    } else if (p.mode === 'toggle') writeKeys(node, (node.params.keys || 0) ^ mask);
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
    status(id) {
      const entry = pulses.get(id);
      return entry && current(entry)
        ? { pending: entry.requests.length, active: !!entry.active }
        : { pending: 0, active: false };
    },
    dispose() {
      suspend();
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', hidden);
    },
  };
}
