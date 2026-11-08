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
export function composeWorkbench(context) {
  const { state, services, actions, t, title } = context;
  services.dialogs = createDialogs({
    t,
    beforeOpen: () => {
      state.spaceHeld = false;
      state.shiftHeld = false;
      actions.cancelInteraction();
      actions.updateTool();
      actions.setLibraryOpen(false);
      actions.setToolsOpen(false);
      $('.project-files').open = false;
    },
    disposeContent: () => services.scenes?.dispose(),
  });
  services.board = createBoardController(state, {
    t,
    title,
    applyView: actions.applyView,
    nodePointerDown: actions.nodePointerDown,
    pinPointerDown: actions.pinPointerDown,
    toggleSource: actions.toggleSource,
    openScene: (id) => services.scenes.open(id),
    primarySignal: (node) => services.monitor.primarySignal(node),
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
  });
  services.monitor = createSignalMonitor(state, {
    t,
    title,
    notify: actions.notify,
    setWorkspaceView: actions.setWorkspaceView,
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
  });
  services.scenes = createSceneController(state, {
    t,
    title,
    showModal: services.dialogs.open,
    closeModal: services.dialogs.close,
    setRunning: actions.setRunning,
    resetSimulation: actions.resetSimulation,
    toggleSource: actions.toggleSource,
    confirmReplace: actions.confirmReplace,
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
      actions.cancelInteraction();
      state.runtime = actions.newRuntime();
      simulate(state.project, state.runtime, 0);
      actions.updateSignals();
    },
    adoptPlayback: (nextProject, nextRuntime) => {
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
      if (nextProject) state.project = nextProject;
      if (nextRuntime) state.runtime = nextRuntime;
      if (redraw) services.board.render();
      actions.updateSignals();
      actions.persist();
    },
    loadProject: actions.replaceProject,
  });
}
