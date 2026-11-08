import { getDefinition } from '../components/catalog/index.js';
import { unknown, logic, active, signalValues, resolveDrivers } from './signals.js';

export function outputContacts(node, values, runtime) {
  const inputs = runtime.inputs[node.id];
  const control = runtime.signals.inputs[node.id];
  const state = runtime.state[node.id];
  return Object.fromEntries(
    getDefinition(node.type).outputs.map((port) => {
      const value = values[port.group || port.id] ?? 'Z';
      let result = port.group && !unknown(value) ? (value >> port.bit) & 1 : value;
      if (node.enabled !== false) {
        if (node.type === 'register' || node.type === 'shift_register') {
          result = state.qBits[port.id === 'serial' ? 7 : port.bit];
        } else if (
          node.type === 'ram' &&
          active(control.cs, 1) &&
          active(control.oe, 1) &&
          !active(control.we) &&
          !unknown(control.address)
        ) {
          result = state.memoryBits[control.address & 15][port.bit];
        } else if (node.type === 'register_file' && !unknown(control.read)) {
          result = state.memoryBits[control.read & 7][port.bit];
        } else if (node.type === 'mux') {
          const a = inputs[`a${port.bit}`],
            b = inputs[`b${port.bit}`];
          result = logic(control.sel) === 0 ? a : logic(control.sel) === 1 ? b : a === b ? a : 'X';
        } else if (node.type === 'demux') {
          const selected = logic(control.sel);
          result =
            selected === 0 || selected === 1
              ? (port.group === 'a') === (selected === 0)
                ? inputs[`in${port.bit}`]
                : 0
              : 'X';
        } else if (node.type === 'tristate') {
          result =
            logic(control.enable) === 0
              ? 'Z'
              : logic(control.enable) === 1
                ? inputs[`in${port.bit}`]
                : 'X';
        } else if (node.type === 'splitter') {
          result = inputs[`in${Number(port.id.slice(1))}`];
        } else if (node.type === 'merger') {
          result = inputs[`b${port.bit}`];
        }
      }
      return [port.id, result];
    }),
  );
}

export function readInputs(nodes, incoming, runtime) {
  for (const node of nodes) {
    const definition = getDefinition(node.type);
    const inputs = {};
    for (const port of definition.inputs) {
      const wires = incoming.get(`${node.id}:${port.id}`) || [];
      inputs[port.id] = resolveDrivers(
        wires.map((wire) => ({
          value: runtime.outputs[wire.from.node]?.[wire.from.port] ?? 'Z',
          weak: wire.sourceType === 'pullup' || wire.sourceType === 'pulldown',
        })),
      );
    }
    runtime.inputs[node.id] = inputs;
    runtime.signals.inputs[node.id] = signalValues(definition.signals.inputs, inputs);
  }
}
