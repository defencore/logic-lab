import { readMemoryBits } from './memory.js';
import { hc595OutputBits } from './hc595.js';
import { getDefinition } from '../components/catalog/index.js';
import { unknown, logic, signalValues, resolveDrivers } from './signals.js';
import { isPassiveConnector } from '../circuits/passive-contacts.js';

function contactLevel(incoming, contact, runtime) {
  return resolveDrivers(
    (incoming.get(contact) || []).map((wire) => ({
      value: runtime.outputs[wire.from.node]?.[wire.from.port] ?? 'Z',
      weak: wire.sourceType === 'pullup' || wire.sourceType === 'pulldown',
    })),
  );
}

export function outputContacts(node, values, runtime, incoming) {
  const inputs = runtime.inputs[node.id];
  const control = runtime.signals.inputs[node.id];
  const state = runtime.state[node.id];
  let outputByte;
  if (node.enabled !== false) {
    if (['ram', 'rom', 'eeprom', 'register_file'].includes(node.type)) {
      outputByte = readMemoryBits(node, inputs, incoming, state, {
        ...getDefinition(node.type).defaults,
        ...node.params,
      });
    } else if (node.type === 'hc595') {
      outputByte = hc595OutputBits(node, state, inputs, incoming);
    }
  }
  return Object.fromEntries(
    getDefinition(node.type).outputs.map((port) => {
      const value = values[port.group || port.id] ?? 'Z';
      let result = port.group && !unknown(value) ? (value >> port.bit) & 1 : value;
      if (node.enabled !== false) {
        if (node.type === 'register' || node.type === 'shift_register' || node.type === 'counter') {
          result = state.qBits[port.id === 'serial' ? 7 : port.bit];
        } else if (outputByte && port.group === 'out') {
          result = outputByte[port.bit];
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
        } else if (isPassiveConnector(node)) {
          result = contactLevel(incoming, `out:${node.id}:${port.id}`, runtime);
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
    for (const port of definition.inputs)
      inputs[port.id] = contactLevel(incoming, `${node.id}:${port.id}`, runtime);
    runtime.inputs[node.id] = inputs;
    runtime.signals.inputs[node.id] = signalValues(definition.signals.inputs, inputs);
  }
}
