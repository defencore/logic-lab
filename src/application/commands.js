import { getDefinition } from '../components/catalog/index.js';
import { simulate } from '../simulation/index.js';
import { serializeProject } from '../circuits/project.js';
import { icon } from '../shared/icons.js';
import { $ } from '../shared/ui.js';
import { snap } from '../circuits/geometry/index.js';
import { findNodePlacement, revealNodePlacement } from '../circuits/placement.js';
import { boundCoordinate, uid } from './model.js';
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
  function duplicateSelection() {
    if (services.classroom && !services.classroom.allowEdit()) return;
    if (!state.selected.size) return;
    const internal = state.project.wires.filter(
      (w) => state.selected.has(w.from.node) && state.selected.has(w.to.node),
    ).length;
    if (
      state.project.nodes.length + state.selected.size > 1000 ||
      state.project.wires.length + internal > 5000
    ) {
      actions.notify(t('limitReached'));
      return;
    }
    actions.checkpoint();
    const map = new Map();
    const nodes = state.project.nodes
      .filter((n) => state.selected.has(n.id))
      .map((n) => {
        const copy = structuredClone(n);
        copy.id = uid('n');
        if (copy.type === 'hotkey') {
          copy.params.binding = '';
          copy.params.value = 0;
        }
        copy.x = boundCoordinate(copy.x + 40);
        copy.y = boundCoordinate(copy.y + 40);
        map.set(n.id, copy.id);
        return copy;
      });
    const wires = state.project.wires
      .filter((w) => map.has(w.from.node) && map.has(w.to.node))
      .map((w) => ({
        ...structuredClone(w),
        id: uid('w'),
        from: { ...w.from, node: map.get(w.from.node) },
        to: { ...w.to, node: map.get(w.to.node) },
        points: (w.points || []).map((p) => ({
          x: boundCoordinate(p.x + 40),
          y: boundCoordinate(p.y + 40),
        })),
      }));
    state.project.nodes.push(...nodes);
    state.project.wires.push(...wires);
    state.selected = new Set(nodes.map((n) => n.id));
    actions.changed();
  }
  function enableSelected(value) {
    if (services.classroom && !services.classroom.allowEdit()) return;
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
    actions.setWorkspaceView('canvas');
    actions.cancelInteraction();
    actions.checkpoint();
    state.project = next;
    actions.cancelWire();
    state.runtime = actions.newRuntime();
    state.selected.clear();
    state.selectedWire = null;
    state.pending = null;
    state.lessonStep = 0;
    state.lessonOpen = true;
    state.highlighted.clear();
    actions.setRunning(true);
    $('#project-name').value = state.project.name;
    actions.changed();
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
    state.runtime = actions.newRuntime();
    simulate(state.project, state.runtime, 0);
    actions.updateSignals();
  }
  function toggleSource(id) {
    if (services.classroom && !services.classroom.allowInput()) return;
    const node = state.project.nodes.find((item) => item.id === id && item.type === 'switch');
    if (!node) return;
    actions.checkpoint();
    node.params.value = node.params.value ? 0 : 1;
    actions.changed();
    services.classroom?.inputChanged(node.id, 'value', node.params.value);
  }
  return {
    newProject,
    addNode,
    deleteSelection,
    duplicateSelection,
    enableSelected,
    renameNode,
    exportProject,
    replaceProject,
    confirmReplace,
    resetSimulation,
    toggleSource,
  };
}
