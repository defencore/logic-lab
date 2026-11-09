import { getDefinition } from '../components/catalog/index.js';
import { simulate } from '../simulation/index.js';
import { serializeProject } from '../circuits/project.js';
import { icon } from '../shared/icons.js';
import { $ } from '../shared/ui.js';
import { snap } from '../circuits/geometry/index.js';
import { findNodePlacement, revealNodePlacement } from '../circuits/placement.js';
import { boundCoordinate, uid } from './model.js';
import { createSelectionCommands } from './selection-commands.js';
import { normalizeMomentaryInputs } from './momentary-controller.js';
import {
  isLatchingInput,
  POTENTIOMETER_DEFAULTS,
  potentiometerValue,
} from '../components/peripheral-inputs.js';
export function createCommands(context) {
  const { state, services, actions, t } = context;
  function newProject() {
    if (services.classroom && !services.classroom.allowEdit()) return;
    actions.confirmReplace(() => ({
      version: 1,
      name: t('newName'),
      nodes: [],
      wires: [],
      wireStyle: state.project.wireStyle || 'orthogonal',
    }));
  }
  function addNode(type, point) {
    if (services.classroom && !services.classroom.allowEdit()) return;
    actions.setWorkspaceView('canvas');
    if (state.project.nodes.length >= 1000) {
      actions.notify(t('limitReached'));
      return;
    }
    const d = getDefinition(type);
    if (!d) return;
    const r = $('#viewport').getBoundingClientRect();
    const node = {
      id: uid('n'),
      type,
      label: '',
      enabled: true,
      params: structuredClone(d.defaults),
    };
    const position = point
      ? { x: boundCoordinate(snap(point.x)), y: boundCoordinate(snap(point.y)) }
      : findNodePlacement(node, state.project.nodes, { view: state.view, viewport: r });
    if (!position) return actions.notify(t('limitReached'));
    Object.assign(node, position);
    actions.checkpoint();
    state.project.nodes.push(node);
    if (!point) {
      state.view = revealNodePlacement(state.view, r, node);
    }
    state.selected = new Set([node.id]);
    state.selectedWire = null;
    actions.changed();
  }
  function deleteSelection() {
    if (services.classroom && !services.classroom.allowEdit()) return;
    services.buttons?.suspend();
    services.keypads?.suspend();
    actions.cancelInteraction();
    if (!state.selected.size && !state.selectedWire) return;
    actions.checkpoint();
    state.project.nodes = state.project.nodes.filter((n) => !state.selected.has(n.id));
    state.project.wires = state.project.wires.filter(
      (w) =>
        w.id !== state.selectedWire &&
        !state.selected.has(w.from.node) &&
        !state.selected.has(w.to.node),
    );
    state.selected.clear();
    state.selectedWire = null;
    state.pending = null;
    actions.changed();
    services.learning.renderLesson();
    actions.notify(t('removed'));
  }
  function enableSelected(value) {
    if (services.classroom && !services.classroom.allowEdit()) return;
    if (!value) {
      services.buttons?.suspend();
      services.keypads?.suspend();
    }
    actions.checkpoint();
    state.project.nodes.filter((n) => state.selected.has(n.id)).forEach((n) => (n.enabled = value));
    actions.changed();
  }
  function renameNode(id, value) {
    if (services.classroom && !services.classroom.allowEdit()) return false;
    const node = state.project.nodes.find((item) => item.id === id);
    if (!node || typeof value !== 'string' || value.length > 100) return false;
    if ((node.label || '') === value) return true;
    actions.checkpoint();
    node.label = value;
    actions.changed();
    return true;
  }
  function exportProject() {
    services.buttons?.suspend();
    services.keypads?.suspend();
    try {
      const blob = new Blob([serializeProject(state.project)], { type: 'application/json' }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `${state.project.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'circuit'}.logic.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      actions.notify(t('exported'));
    } catch (error) {
      actions.notify(error.message);
    }
  }
  function replaceProject(next) {
    if (services.classroom && !services.classroom.allowEdit()) return;
    services.buttons?.suspend();
    services.keypads?.suspend();
    actions.setWorkspaceView('canvas');
    actions.cancelInteraction();
    actions.checkpoint();
    state.project = normalizeMomentaryInputs(next);
    actions.cancelWire();
    state.runtime = actions.newRuntime();
    state.selected.clear();
    state.selectedWire = null;
    state.pending = null;
    state.lessonStep = 0;
    state.lessonOpen = true;
    state.highlighted.clear();
    $('#project-name').value = state.project.name;
    actions.changed();
    actions.setRunning(true);
    services.learning.renderLesson();
    actions.fit({ readable: !state.project.viewport });
    services.dialogs.close();
  }
  function confirmReplace(next) {
    services.dialogs.open(
      `<div class="modal-icon">${icon('folder', 28)}</div><h2>${t('replaceTitle')}</h2><p>${t('replaceText')}</p><div class="modal-actions"><button class="soft-btn" id="cancel-replace">${t('cancel')}</button><button class="primary-btn" id="confirm-replace">${t('replace')}</button></div>`,
    );
    $('#cancel-replace').onclick = services.dialogs.close;
    $('#confirm-replace').onclick = () =>
      actions.replaceProject(typeof next === 'function' ? next() : next);
  }
  function resetSimulation() {
    if (services.classroom && !services.classroom.allowEdit()) return;
    services.buttons?.suspend();
    services.keypads?.suspend();
    state.runtime = actions.newRuntime();
    simulate(state.project, state.runtime, 0);
    actions.updateSignals();
  }
  function toggleSource(id) {
    if (services.classroom && !services.classroom.allowInput()) return;
    const node = state.project.nodes.find((item) => item.id === id && isLatchingInput(item));
    if (!node || node.enabled === false) return;
    const value = node.params.value ? 0 : 1;
    if (node.type === 'contact_switch') {
      applyLiveSourceValue(node, value, true);
      services.wiring?.refresh();
      return true;
    }
    actions.checkpoint();
    node.params.value = value;
    actions.changed();
    services.classroom?.inputChanged(node.id, 'value', node.params.value);
  }
  function applyLiveSourceValue(node, value, checkpoint) {
    if (checkpoint) actions.checkpoint();
    node.params.value = value;
    simulate(state.project, state.runtime, 0);
    actions.updateSignals();
    services.classroom?.inputChanged(node.id, 'value', value);
    services.classroom?.observeEdit?.();
    actions.persist();
  }
  function setPotentiometer(id, value, { checkpoint = true } = {}) {
    const node = state.project.nodes.find(
      (item) => item.id === id && item.type === 'potentiometer',
    );
    if (
      !node ||
      node.enabled === false ||
      potentiometerValue(value) === 'X' ||
      (node.params.value ?? POTENTIOMETER_DEFAULTS.value) === value ||
      (services.classroom && !services.classroom.allowInput())
    )
      return false;
    applyLiveSourceValue(node, value, checkpoint);
    return true;
  }
  return {
    newProject,
    addNode,
    deleteSelection,
    ...createSelectionCommands(context),
    enableSelected,
    renameNode,
    exportProject,
    replaceProject,
    confirmReplace,
    resetSimulation,
    toggleSource,
    setPotentiometer,
    setMomentarySource: (id, value) =>
      value === 1 ? !!services.buttons?.press(id) : value === 0 && !!services.buttons?.release(id),
    setKeypadKey: (id, index, value) => {
      const accepted =
        value === 1
          ? !!services.keypads?.press(id, index)
          : value === 0 && !!services.keypads?.release(id, index);
      if (accepted) actions.updateSignals?.();
      return accepted;
    },
  };
}
