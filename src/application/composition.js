import { simulate } from '../simulation/index.js';
import { EXAMPLES } from '../../examples/index.js';
import { $ } from '../shared/ui.js';
import { dimensions } from '../circuits/geometry/index.js';
import { createSignalMonitor } from '../workbench/signal-monitor.js';
import { createWiringEditor } from '../workbench/wiring/index.js';
import { createBoardController } from '../workbench/board-controller.js';
import { createClassroom } from '../classroom/index.js';
import { createSimulationRunner } from '../workbench/simulation-runner.js';
import { createSceneController } from '../workbench/scene-controller.js';
import { createInspectorController } from '../workbench/inspector-controller.js';
import { createLearningController } from '../workbench/learning-controller.js';
import { createDialogs } from '../workbench/dialogs.js';
import { createHotkeyController } from './hotkey-controller.js';
import { createAudioController } from './audio-controller.js';
import { createClipboardController } from './clipboard-controller.js';
import { createMomentaryController } from './momentary-controller.js';
import { createKeypadController } from './keypad-controller.js';
export function composeWorkbench(context) {
  const { state, services, actions, t, title } = context;
  services.dialogs = createDialogs({
    t,
    beforeOpen: () => {
      services.hotkeys?.suspend();
      services.buttons?.suspend();
      services.keypads?.suspend();
      state.spaceHeld = false;
      state.shiftHeld = false;
      actions.cancelInteraction();
      actions.updateTool();
      actions.setLibraryOpen(false);
      actions.setToolsOpen(false);
      $('.project-files').open = false;
    },
  });
  services.board = createBoardController(state, {
    t,
    title,
    applyView: actions.applyView,
    nodePointerDown: actions.nodePointerDown,
    pinPointerDown: actions.pinPointerDown,
    toggleSource: actions.toggleSource,
    setMomentarySource: actions.setMomentarySource,
    setKeypadKey: actions.setKeypadKey,
    setPotentiometer: actions.setPotentiometer,
    getKeypadStatus: (id) => services.keypads?.status(id),
    canRenameNode: () => !services.classroom || services.classroom.allowEdit(),
    renameNode: actions.renameNode,
    cancelInteraction: actions.cancelInteraction,
    openScene: (id) => services.scenes.open(id),
    primarySignal: (node) => services.monitor.primarySignal(node),
    selectNode: (id, { inspect = false } = {}) => {
      if (!state.project.nodes.some((node) => node.id === id)) return;
      state.selected = new Set([id]);
      state.selectedWire = null;
      state.inspectorTab = 'properties';
      actions.selectionChanged();
      if (inspect) {
        actions.setWorkspaceView('inspector');
        requestAnimationFrame(() => {
          const label = $('#node-label');
          const target =
            document.querySelector(
              '#inspector-content [data-keypad-key], #inspector-content .state-inspection > summary',
            ) ||
            (label && !label.disabled
              ? label
              : document.querySelector('[data-inspector-tab="properties"]'));
          target?.focus();
        });
      }
    },
  });
  services.learning = createLearningController(state, {
    t,
    title,
    showModal: services.dialogs.open,
    closeModal: services.dialogs.close,
    confirmReplace: actions.confirmReplace,
    addNode: actions.addNode,
    selectionChanged: actions.selectionChanged,
    setWorkspaceView: actions.setWorkspaceView,
    primarySignal: (node) => services.monitor.primarySignal(node),
    addObservation: (text) => services.classroom.addObservation(text),
    playExample: (example) => services.classroom.playExample(example),
  });
  services.monitor = createSignalMonitor(state, {
    t,
    title,
    notify: actions.notify,
    setWorkspaceView: actions.setWorkspaceView,
    open: services.dialogs.open,
    close: services.dialogs.close,
  });
  services.simulationRunner = createSimulationRunner({
    getProject: () => state.project,
    getRuntime: () => state.runtime,
    onStep: () => services.monitor.capture(),
  });
  services.inspector = createInspectorController(state, {
    t,
    title,
    checkpoint: actions.checkpoint,
    notify: actions.notify,
    changed: actions.changed,
    renderBoard: services.board.render,
    updateSignals: actions.updateSignals,
    persist: actions.persist,
    bindLiveText: actions.bindLiveText,
    bindLearningActions: services.learning.bindActions,
    updateGuideSignals: services.learning.updateGuideSignals,
    deleteSelection: actions.deleteSelection,
    duplicateSelection: actions.duplicateSelection,
    enableSelected: actions.enableSelected,
    beginHotkeyCapture: (request) => services.hotkeys.beginCapture(request),
    reconcileKeypads: () => services.keypads?.reconcile(),
    reconcileButtons: () => services.buttons?.reconcile(),
    setKeypadKey: actions.setKeypadKey,
    getKeypadStatus: (id) => services.keypads?.status(id),
  });
  services.scenes = createSceneController(state, {
    t,
    title,
    setWorkspaceView: actions.setWorkspaceView,
    selectionChanged: actions.selectionChanged,
    applyView: actions.applyView,
    cancelInteraction: actions.cancelInteraction,
    setRunning: actions.setRunning,
    resetSimulation: actions.resetSimulation,
    toggleSource: actions.toggleSource,
    setMomentarySource: actions.setMomentarySource,
    setKeypadKey: actions.setKeypadKey,
    getKeypadStatus: (id) => services.keypads?.status(id),
    bindLiveText: actions.bindLiveText,
    renderBoard: services.board.render,
    updateSignals: actions.updateSignals,
    persist: actions.persist,
  });
  services.wiring = createWiringEditor({
    getProject: () => state.project,
    getView: () => state.view,
    getTool: () => state.tool,
    getLanguage: () => state.lang,
    getSelectedWire: () => state.selectedWire,
    t,
    canEdit: () => !services.classroom || services.classroom.allowEdit(),
    worldPoint: actions.worldPoint,
    snapshot: actions.snapshot,
    notify: actions.notify,
    cancelConnection: actions.cancelWire,
    refreshInspector: services.inspector.render,
    showInspector: () => actions.setWorkspaceView('inspector'),
    showCanvas: () => actions.setWorkspaceView('canvas'),
    activateSelect: () => {
      state.tool = 'select';
      actions.updateTool();
    },
    selectWire: (id) => {
      state.selected.clear();
      state.selectedWire = id;
      services.board.render();
      services.inspector.render();
      actions.updateSignals();
    },
    commit: (before) => {
      state.undoStack.push(before);
      if (state.undoStack.length > 80) state.undoStack.shift();
      state.redoStack = [];
      actions.changed();
    },
    revealNode: (id) => {
      const node = state.project.nodes.find((item) => item.id === id);
      if (!node) return;
      actions.setWorkspaceView('canvas');
      state.selected = new Set([id]);
      state.selectedWire = null;
      services.board.render();
      services.inspector.render();
      actions.updateSignals();
      const size = dimensions(node),
        viewport = $('#viewport');
      state.view.zoom = Math.max(0.75, state.view.zoom);
      state.view.x = viewport.clientWidth / 2 - (node.x + size.w / 2) * state.view.zoom;
      state.view.y = viewport.clientHeight / 2 - (node.y + size.h / 2) * state.view.zoom;
      actions.applyView();
      actions.persist();
    },
  });
  services.classroom = createClassroom({
    getProject: () => state.project,
    getRuntime: () => state.runtime,
    getViewport: () => ({ ...state.view }),
    getLessonStep: () => state.lessonStep,
    restoreLessonStep: (step) => {
      state.lessonStep = step;
    },
    restoreViewport: (view) => {
      state.view = { ...view };
      actions.applyView();
    },
    fitProject: () => actions.fit(),
    showDemoCanvas: (focusNode) => {
      actions.setWorkspaceView('canvas');
      actions.fit({ focusNode: state.compactLayout.matches ? focusNode : undefined });
      $('#viewport').focus({ preventScroll: true });
    },
    getLanguage: () => state.lang,
    isRunning: () => state.running,
    getExample: () => EXAMPLES.find((example) => example.id === state.project.exampleId),
    showModal: services.dialogs.open,
    closeModal: services.dialogs.close,
    notify: actions.notify,
    setRunning: (next) => {
      if (!next) services.simulationRunner.discard();
      actions.setRunning(next);
    },
    resetForSequence: () => {
      services.buttons?.suspend();
      services.keypads?.suspend();
      actions.cancelInteraction();
      state.runtime = actions.newRuntime();
      simulate(state.project, state.runtime, 0);
      actions.updateSignals();
    },
    observePlayback: ({ project, runtime }) => services.monitor.capture(project, runtime),
    adoptPlayback: (nextProject, nextRuntime) => {
      services.monitor.stopCapture();
      services.monitor.inheritTrace(nextProject);
      services.buttons?.suspend();
      services.keypads?.suspend();
      actions.cancelInteraction();
      state.project = nextProject;
      state.runtime = nextRuntime;
      state.selected.clear();
      state.selectedWire = null;
      $('#project-name').value = state.project.name;
      services.board.render();
      services.inspector.render();
      services.learning.renderLesson();
      services.board.updateCounts();
      actions.updateSignals();
    },
    refreshPlayback: (nextProject, nextRuntime, redraw = true) => {
      if (nextProject && nextProject !== state.project) {
        services.buttons?.suspend();
        services.keypads?.suspend();
      }
      if (nextProject) state.project = nextProject;
      if (nextRuntime) state.runtime = nextRuntime;
      if (redraw) services.board.render();
      actions.updateSignals();
      actions.persist();
    },
    loadProject: actions.replaceProject,
  });
  const canWriteHotkey = () => !services.classroom.isLocked() || services.classroom.isRecording();
  services.buttons = createMomentaryController({
    getProject: () => state.project,
    canPress: () => !services.dialogs.isOpen() && services.classroom.allowInput(),
    canWrite: canWriteHotkey,
    writeValue: (node, value) => {
      if ((node.params.value ?? 0) === value) return;
      node.params.value = value;
      simulate(state.project, state.runtime, 0);
      actions.updateSignals();
      if (canWriteHotkey()) services.classroom.inputChanged(node.id, 'value', value);
      if (node.type === 'contact_switch') services.wiring?.refresh();
      actions.persist();
    },
  });
  services.keypads = createKeypadController({
    getProject: () => state.project,
    getTime: () => state.runtime.time,
    canPress: () => !services.dialogs.isOpen() && services.classroom.allowInput(),
    canWrite: canWriteHotkey,
    writeKeys: (node, keys) => {
      if ((node.params.keys ?? 0) === keys) return;
      node.params.keys = keys;
      simulate(state.project, state.runtime, 0);
      actions.updateSignals();
      if (canWriteHotkey()) services.classroom.inputChanged(node.id, 'keys', keys);
      actions.persist();
    },
  });
  services.hotkeys = createHotkeyController({
    getProject: () => state.project,
    canWrite: canWriteHotkey,
    canActivate: () =>
      canWriteHotkey() &&
      !services.dialogs.isOpen() &&
      !state.gesture &&
      !$('.project-files')?.open &&
      !$('.canvas-tools')?.classList.contains('more-tools-open') &&
      !$('#component-library')?.classList.contains('mobile-open'),
    canCapture: (id) =>
      !services.classroom.isLocked() &&
      !services.dialogs.isOpen() &&
      state.selected.size === 1 &&
      state.selected.has(id) &&
      state.project.nodes.some((node) => node.id === id && node.type === 'hotkey'),
    writeValue: (id, value) => {
      const node = state.project.nodes.find((node) => node.id === id && node.type === 'hotkey');
      if (!node || (node.params.value ?? 0) === value) return;
      node.params.value = value;
      simulate(state.project, state.runtime, 0);
      actions.updateSignals();
      services.classroom.inputChanged(id, 'value', value);
      actions.persist();
    },
    onClaim: () => {
      state.spaceHeld = false;
      state.shiftHeld = false;
      actions.updateTool();
    },
    beforeCapture: () => {
      state.spaceHeld = false;
      state.shiftHeld = false;
      actions.cancelInteraction({ refreshInspector: false });
      actions.updateTool();
    },
    focusWorkspace: () => {
      actions.setWorkspaceView('canvas');
      $('#viewport').focus({ preventScroll: true });
    },
  });
  services.audio = createAudioController(context);
  services.clipboard = createClipboardController(context);
}
