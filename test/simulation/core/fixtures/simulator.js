import assert from 'node:assert/strict';
import { COMPONENTS, getDefinition } from '../../../../src/components/catalog/index.js';
import { createRuntime, simulate } from '../../../../src/simulation/index.js';

export const node = (id, type, params = {}) => ({ id, type, x: 0, y: 0, enabled: true, params });

export const wire = (source, sourcePort, target, targetPort) => ({
  id: `${source}.${sourcePort}-${target}.${targetPort}`,
  from: { node: source, port: sourcePort },
  to: { node: target, port: targetPort },
});

export const circuit = (nodes, wires = []) => ({
  nodes,
  wires: wires.flatMap((connection) => {
    const source = getDefinition(nodes.find((node) => node.id === connection.from.node)?.type);
    const target = getDefinition(nodes.find((node) => node.id === connection.to.node)?.type);
    const outputs =
      source?.outputs.filter(
        (pin) => pin.id === connection.from.port || pin.group === connection.from.port,
      ) || [];
    const inputs =
      target?.inputs.filter(
        (pin) => pin.id === connection.to.port || pin.group === connection.to.port,
      ) || [];
    if (outputs.length <= 1 && inputs.length <= 1) return [connection];
    assert.equal(
      outputs.length,
      inputs.length,
      'Test fixtures must connect matching groups of individual lines',
    );
    return outputs.map((pin, index) => ({
      ...connection,
      id: `${connection.id}-${index}`,
      from: { ...connection.from, port: pin.id },
      to: { ...connection.to, port: inputs[index].id },
      width: 1,
    }));
  }),
});

export const source = (id, value) => node(id, 'switch', { value });

export const byte = (id, value) => node(id, 'bus_input', { value });

export const output = (runtime, id, port = 'out') => runtime.signals.outputs[id][port];

export const evaluate = (project) => simulate(project, createRuntime(), 0);
