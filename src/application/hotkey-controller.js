import {
  matchesHotkeyBinding,
  parseHotkeyBinding,
  hotkeyBindingError,
} from '../components/catalog/hotkey-bindings.js';

const textTarget = (target) =>
  !!target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]');
const nativeActivation = (event) =>
  (['Space', 'Enter', 'NumpadEnter'].includes(event.code) &&
    !!event.target?.closest?.('button,a,summary,[role="button"]')) ||
  (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code) &&
    !!event.target?.closest?.('[role="tab"]')) ||
  (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.code) &&
    !!event.target?.closest?.('[data-keypad-key]'));
const consume = (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

/** One keyboard owner arbitrates source input, assignment capture and editor shortcuts. */
export function createHotkeyController({
  getProject,
  canWrite,
  canActivate,
  canCapture,
  writeValue,
  onClaim = () => {},
  beforeCapture = () => {},
  focusWorkspace = () => {},
}) {
  let project = null,
    capture = null;
  const configs = new Map(),
    down = new Set(),
    held = new Map(),
    captured = new Set(),
    releases = new Map();
  function releaseNode(id, owner = getProject()) {
    if (owner !== getProject()) return;
    if (canWrite()) {
      releases.delete(id);
      writeValue(id, 0);
    } else releases.set(id, owner);
  }
  function cancelCapture() {
    const previous = capture;
    capture = null;
    previous?.onCancel();
  }
  function releaseHolds() {
    for (const [id, entry] of held) {
      releaseNode(id, entry.project);
    }
    held.clear();
    down.clear();
  }
  function suspend() {
    cancelCapture();
    releaseHolds();
    captured.clear();
  }
  function reconcile() {
    const next = getProject();
    if (next !== project) {
      suspend();
      configs.clear();
      releases.clear();
      project = next;
    }
    if (capture && !canCapture(capture.nodeId)) cancelCapture();
    const ids = new Set();
    for (const node of project.nodes) {
      if (node.type !== 'hotkey') continue;
      ids.add(node.id);
      const config = `${node.params.binding || ''}:${node.params.mode || 'hold'}`;
      const previous = configs.get(node.id);
      configs.set(node.id, config);
      if (previous !== config) {
        const pressed = held.get(node.id);
        held.delete(node.id);
        if (canWrite() && (previous !== undefined || node.params.mode !== 'toggle'))
          writeValue(node.id, 0);
        else if (pressed) releaseNode(node.id, pressed.project);
      }
      if (node.enabled === false && held.has(node.id)) {
        held.delete(node.id);
        releaseNode(node.id);
      }
    }
    for (const id of configs.keys())
      if (!ids.has(id)) {
        configs.delete(id);
        held.delete(id);
      }
    if (canWrite())
      for (const [id, owner] of releases) {
        releases.delete(id);
        if (owner === project && ids.has(id)) writeValue(id, 0);
      }
    if (!canActivate()) releaseHolds();
  }
  function beginCapture({ nodeId, onKey, onCancel }) {
    cancelCapture();
    releaseHolds();
    beforeCapture();
    if (!canCapture(nodeId)) {
      onCancel();
      return () => {};
    }
    const entry = { nodeId, onKey, onCancel };
    capture = entry;
    return () => {
      if (capture === entry) cancelCapture();
    };
  }
  function releaseModifiers(event) {
    for (const [id, entry] of held) {
      const parsed = parseHotkeyBinding(entry.binding);
      if (
        !parsed ||
        ['ctrlKey', 'altKey', 'shiftKey', 'metaKey'].some((flag) => !!event[flag] !== parsed[flag])
      ) {
        held.delete(id);
        releaseNode(id, entry.project);
      }
    }
  }
  function keyDown(event) {
    reconcile();
    if (capture) {
      consume(event);
      if (event.code) captured.add(event.code);
      if (event.repeat || event.isComposing) return true;
      if (event.code === 'Escape') {
        cancelCapture();
        return true;
      }
      const entry = capture;
      const result = entry.onKey(event);
      if (result === 'accepted') {
        if (capture === entry) capture = null;
        focusWorkspace();
      } else if (result === 'cancel') cancelCapture();
      return true;
    }
    if (captured.has(event.code)) {
      consume(event);
      return true;
    }
    releaseModifiers(event);
    if (
      event.isComposing ||
      event.defaultPrevented ||
      !canActivate() ||
      textTarget(event.target) ||
      nativeActivation(event)
    )
      return false;
    const matches = project.nodes.filter(
      (node) =>
        node.type === 'hotkey' &&
        node.enabled !== false &&
        matchesHotkeyBinding(node.params.binding, event),
    );
    if (!matches.length) return false;
    consume(event);
    onClaim();
    const repeated = event.repeat || down.has(event.code);
    down.add(event.code);
    // Invalid duplicate configurations cannot drive several sources from one key.
    if (repeated || matches.length !== 1) return true;
    const node = matches[0];
    const mode = node.params.mode || 'hold';
    if (!['hold', 'inverted', 'toggle'].includes(mode) || hotkeyBindingError(node.params.binding))
      return true;
    if (mode === 'toggle') writeValue(node.id, node.params.value ? 0 : 1);
    else {
      held.set(node.id, { project, code: event.code, binding: node.params.binding });
      writeValue(node.id, 1);
    }
    return true;
  }
  function keyUp(event) {
    reconcile();
    let claimed = down.delete(event.code) || captured.delete(event.code);
    if (capture) claimed = true;
    for (const [id, entry] of held) {
      if (entry.code !== event.code) continue;
      held.delete(id);
      releaseNode(id, entry.project);
      claimed = true;
    }
    releaseModifiers(event);
    if (claimed) consume(event);
    return claimed;
  }
  function focusChanged(target) {
    if (textTarget(target)) {
      cancelCapture();
      releaseHolds();
    }
  }
  return {
    keyDown,
    keyUp,
    beginCapture,
    reconcile,
    suspend,
    focusChanged,
    isCapturing: () => !!capture,
  };
}
