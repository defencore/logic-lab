import { simulate } from '../simulation/index.js';
import { createApplicationModel, createLocalization } from './model.js';
import { composeWorkbench } from './composition.js';
import { bindApplicationEvents } from './events.js';
import { createHistory } from './history.js';
import { createCommands } from './commands.js';
import { createViewport } from './viewport.js';
import { createView } from './view.js';
import { createGestures } from './gestures.js';
import { createConnections } from './connections.js';
import { createSimulation } from './simulation.js';
import { createShellBindings } from './shell-bindings.js';
import { createCanvasBindings } from './canvas-bindings.js';
import { normalizeMomentaryInputs } from './momentary-controller.js';
import { createProjectRecovery } from './project-recovery.js';
export function startApplication() {
  const state = createApplicationModel(),
    services = {},
    actions = {};
  const context = { state, services, actions, ...createLocalization(state) };
  // Controllers share the model. Only cross-controller dependencies stay dynamic.
  Object.defineProperties(state, {
    classroom: { get: () => services.classroom },
    wiring: { get: () => services.wiring },
  });
  Object.assign(actions, createHistory(context));
  Object.assign(actions, createCommands(context));
  Object.assign(actions, createViewport(context));
  Object.assign(actions, createView(context));
  Object.assign(actions, createGestures(context));
  Object.assign(actions, createConnections(context));
  Object.assign(actions, createSimulation(context));
  Object.assign(actions, createShellBindings(context), createCanvasBindings(context));
  state.runtime = actions.newRuntime();
  composeWorkbench(context);
  bindApplicationEvents(context);
  state.project = normalizeMomentaryInputs(state.project);
  simulate(state.project, state.runtime, 0);
  actions.shell();
  services.hotkeys.reconcile();
  services.recovery = createProjectRecovery(context);
  services.recovery.mount();
  services.recovery.open();
  requestAnimationFrame(() => {
    if (!state.project.viewport) actions.fit({ readable: true });
    requestAnimationFrame(actions.tick);
  });
}
