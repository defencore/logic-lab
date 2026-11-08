import { getDefinition } from '../../components/catalog/index.js';
import { createWireSession } from './session.js';
import { createPresentation } from './presentation.js';
import { createTrace } from './trace.js';
import { createEditing } from './editing.js';
import { createGestures } from './gestures.js';
import { createBindings } from './bindings.js';
/** Canvas gestures remain previews until pointerup; only commits enter history. */
export function createWiringEditor(options) {
  const state = createWireSession(),
    commands = {};
  const project = options.getProject;
  const context = {
    state,
    options,
    commands,
    project,
    t: options.t,
    wire: () => project().wires.find((item) => item.id === options.getSelectedWire()),
    position: (event) => options.worldPoint(event),
    label: (node) => {
      const definition = getDefinition(node.type);
      return node.label || (options.getLanguage() === 'ua' ? definition.ua : definition.label);
    },
    pinFromElement: (element) => ({
      node: element.dataset.node,
      port: element.dataset.pin,
      side: element.dataset.side,
    }),
  };
  Object.assign(commands, createPresentation(context));
  Object.assign(commands, createTrace(context));
  Object.assign(commands, createEditing(context));
  Object.assign(commands, createGestures(context));
  Object.assign(commands, createBindings(context));
  return {
    bind: commands.bind,
    refresh: commands.refresh,
    renderEditor: commands.renderEditor,
    decorateInspector: commands.decorateInspector,
    pinPointerDown: commands.pinPointerDown,
    pointerMove: commands.pointerMove,
    pointerUp: commands.pointerUp,
    blankPointerDown: commands.blankPointerDown,
    keyDown: commands.keyDown,
    cancelGesture: commands.cancelGesture,
    clear: commands.clear,
    get busy() {
      return !!state.drag;
    },
  };
}
