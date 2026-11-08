import { getSceneEntries, getSceneSnapshot } from '../scenes/data/scenarios.js';
import { $, $$ } from '../shared/ui.js';
import { createSceneLinks, scenePickedContact } from './scene-links.js';
import {
  scenePanelMarkup,
  scenePickerMarkup,
  sceneInspectionMarkup,
  mountScenePanel,
  removeScenePanel,
} from './scene-panel.js';
import { bindSceneControls, updateSceneControls } from './scene-controls.js';
import { updateSceneReadouts } from './scene-readouts.js';
import { updateSceneMetadata } from './scene-metadata.js';

/** The dock shares the workbench runtime and remains usable while wiring the circuit. */
export function createSceneController(state, actions) {
  let view = null,
    entry = null,
    token = 0,
    topology = '',
    roots = null,
    disposeControls = () => {};
  const links = createSceneLinks(
    state,
    actions,
    () => entry,
    () => view,
  );
  function dispose() {
    token++;
    const previousView = view;
    view = null;
    entry = null;
    disposeControls();
    disposeControls = () => {};
    previousView?.dispose();
    roots = null;
    topology = '';
    links.clear();
    removeScenePanel();
  }
  function circuitKey() {
    return JSON.stringify([
      state.project.nodes.map((node) => [node.id, node.type, node.enabled]),
      state.project.wires.map((wire) => [wire.id, wire.from, wire.to]),
    ]);
  }
  async function open(requestedId = null, { keepWorkspace = false } = {}) {
    const entries = getSceneEntries(state.project);
    if (!entries.length) return;
    const preferred = requestedId || [...state.selected][0];
    const chosen =
      entries.find((item) => item.id === preferred || item.nodeIds.includes(preferred)) ||
      entries[0];
    dispose();
    actions.cancelInteraction();
    if (!keepWorkspace) actions.setWorkspaceView('canvas');
    entry = chosen;
    topology = circuitKey();
    const panel = mountScenePanel(
      scenePanelMarkup(state, entries, entry, actions.t, actions.title),
    );
    panel.dataset.sceneType = entry.type;
    roots = [$('#nodes')?.firstElementChild, $('#wires')?.firstElementChild, state.project];
    $('#scene-close').onclick = () => {
      dispose();
      $('#motion')?.focus({ preventScroll: true });
    };
    $('#scene-clear-link').onclick = links.clear;
    disposeControls = bindSceneControls(state, actions, links, open);
    $('#motion-camera-reset').onclick = () => view?.resetCamera();
    $$('[data-camera-view]').forEach(
      (button) =>
        (button.onclick = () => {
          view?.setView(button.dataset.cameraView);
          $$('[data-camera-view]').forEach((item) =>
            item.classList.toggle('active', item === button),
          );
        }),
    );
    const attempt = token;
    const onStatus = (message) => {
      if (attempt !== token) return;
      const status = $('#motion-status');
      if (status) {
        status.textContent = message;
        status.hidden = !message;
      }
    };
    update();
    try {
      const renderer =
        chosen.type === 'mechanics'
          ? await import('../scenes/views/mechanics/index.js')
          : await import('../scenes/views/scenarios/index.js');
      if (attempt !== token || !panel.isConnected) return;
      const options = {
        type: chosen.type,
        nodeId: chosen.nodeId,
        language: state.lang,
        onStatus,
        onPick: (contact) => links.inspect(scenePickedContact(contact), { reveal: true }),
      };
      view =
        chosen.type === 'mechanics'
          ? renderer.createMotionView($('#motion-stage'), options)
          : renderer.createScenarioView($('#motion-stage'), options);
      view.resize();
      onStatus('');
      update();
    } catch (error) {
      console.error('The 3D scene could not initialize.', error);
      onStatus(actions.t('motionUnavailable'));
    }
  }
  function update() {
    if (!entry || !$('#scene-panel')) return;
    const entries = getSceneEntries(state.project);
    const current = entries.find((item) => item.id === entry.id);
    if (!current) return dispose();
    if (current.type !== entry.type) return void open(current.id, { keepWorkspace: true });
    entry = current;
    const nextRoots = [
      $('#nodes')?.firstElementChild,
      $('#wires')?.firstElementChild,
      state.project,
    ];
    if (!roots || nextRoots.some((value, index) => value !== roots[index])) {
      roots = nextRoots;
      const next = circuitKey();
      if (next !== topology) {
        topology = next;
        const active = $('[data-scene-tab][aria-selected="true"]')?.dataset.sceneTab;
        disposeControls();
        $('.scene-panel-inspection').innerHTML = sceneInspectionMarkup(
          state,
          entry,
          actions.t,
          actions.title,
        );
        $('#scene-picker-slot').innerHTML = scenePickerMarkup(
          state,
          entries,
          entry,
          actions.t,
          actions.title,
        );
        disposeControls = bindSceneControls(state, actions, links, open);
        if (active) $(`[data-scene-tab="${active}"]`)?.click();
      }
    }
    const snapshot = getSceneSnapshot(state.project, state.runtime, entry);
    if (!snapshot) return dispose();
    view?.update(snapshot);
    updateSceneMetadata(state, entry, actions.t, actions.title);
    updateSceneControls(state);
    updateSceneReadouts(state, entry, snapshot, actions.t, links);
    links.decorate();
  }
  return {
    open,
    update,
    dispose,
    inspectContact: links.inspect,
    selectionChanged: links.selectionChanged,
  };
}
