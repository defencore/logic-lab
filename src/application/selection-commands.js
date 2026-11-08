import {
  createFragment,
  serializeFragment,
  parseFragment,
  instantiateFragment,
} from '../circuits/fragments.js';
import { dimensions, snap } from '../circuits/geometry/index.js';
import { screenToWorld } from '../circuits/viewport.js';
import { uid } from './model.js';

function nodeBounds(nodes) {
  if (!nodes.length) return null;
  const left = Math.min(...nodes.map((node) => node.x));
  const top = Math.min(...nodes.map((node) => node.y));
  return {
    left,
    top,
    width: Math.max(...nodes.map((node) => node.x + dimensions(node).w)) - left,
    height: Math.max(...nodes.map((node) => node.y + dimensions(node).h)) - top,
  };
}

const viewportElement = () =>
  typeof document === 'undefined' ? null : document.querySelector('#viewport');

function placement(fragment, state, nearSelection) {
  const bounds = nodeBounds(fragment.nodes);
  const viewport = viewportElement()?.getBoundingClientRect?.();
  const selected = state.project.nodes.filter((node) => state.selected.has(node.id));
  const anchor = nearSelection ? nodeBounds(selected) : null;
  const offset = anchor
    ? { dx: anchor.left + 40 - bounds.left, dy: anchor.top + 40 - bounds.top }
    : { dx: 40, dy: 40 };
  if (!viewport?.width || !viewport.height) return offset;
  const topLeft = screenToWorld(state.view, { x: 0, y: 0 });
  const bottomRight = screenToWorld(state.view, { x: viewport.width, y: viewport.height });
  const margin = 16 / state.view.zoom;
  const visible =
    anchor &&
    bounds.left + offset.dx >= topLeft.x + margin &&
    bounds.top + offset.dy >= topLeft.y + margin &&
    bounds.left + offset.dx + bounds.width <= bottomRight.x - margin &&
    bounds.top + offset.dy + bounds.height <= bottomRight.y - margin;
  if (visible) return offset;
  return {
    dx: snap((topLeft.x + bottomRight.x - bounds.width) / 2 - bounds.left),
    dy: snap((topLeft.y + bottomRight.y - bounds.height) / 2 - bounds.top),
  };
}

/** Copy structure only; insertion validates everything before one history checkpoint. */
export function createSelectionCommands(context) {
  const { state, services, actions, t } = context;
  let copied = null;
  let pasted = null;
  const keyOf = (fragment) => JSON.stringify(fragment);
  const canEdit = () => !services.classroom || services.classroom.allowEdit();
  function copySelection() {
    try {
      const fragment = createFragment(state.project, state.selected);
      if (!fragment) return null;
      const text = serializeFragment(fragment);
      copied = { project: state.project, key: keyOf(fragment) };
      return text;
    } catch {
      return null;
    }
  }
  function insert(fragment, { duplicate = false } = {}) {
    if (
      state.project.nodes.length + fragment.nodes.length > 1000 ||
      state.project.wires.length + fragment.wires.length > 5000
    ) {
      actions.notify(t('limitReached'));
      return false;
    }
    const key = keyOf(fragment);
    const repeated =
      pasted?.project === state.project &&
      pasted.key === key &&
      pasted.ids.size === state.selected.size &&
      [...pasted.ids].every((id) => state.selected.has(id));
    const nearSelection =
      duplicate || repeated || (copied?.project === state.project && copied.key === key);
    // Compact inspector/waveform views hide the canvas; measure after revealing it.
    actions.setWorkspaceView('canvas');
    const offset = placement(fragment, state, nearSelection);
    const result = instantiateFragment(fragment, state.project, { uid, ...offset });
    // Validation and allocation above cannot leave a partial circuit or an empty undo entry.
    actions.cancelInteraction();
    actions.checkpoint();
    state.project.nodes.push(...result.nodes);
    state.project.wires.push(...result.wires);
    state.selected = new Set(result.nodes.map((node) => node.id));
    state.selectedWire = null;
    state.pending = null;
    pasted = { project: state.project, key, ids: new Set(state.selected) };
    actions.changed();
    viewportElement()?.focus?.({ preventScroll: true });
    const message = t('selectionPasted').replace('{count}', result.nodes.length);
    actions.notify(
      result.clearedHotkeys
        ? `${message} ${t('pastedHotkeysCleared').replace('{count}', result.clearedHotkeys)}`
        : message,
    );
    return true;
  }
  function pasteSelection(text) {
    if (!canEdit()) return false;
    try {
      return insert(parseFragment(text));
    } catch {
      actions.notify(t('invalidFragment'));
      return false;
    }
  }
  function duplicateSelection() {
    if (!canEdit()) return false;
    try {
      const fragment = createFragment(state.project, state.selected);
      return fragment ? insert(fragment, { duplicate: true }) : false;
    } catch {
      actions.notify(t('invalidFragment'));
      return false;
    }
  }
  return { copySelection, pasteSelection, duplicateSelection };
}
