import { getDefinition } from '../../../../src/components/catalog/index.js';

export function fixture() {
  return {
    version: 1,
    name: 'Truth table',
    nodes: [
      { id: 'source', type: 'switch', x: 0, y: 0, label: 'A', enabled: true, params: { value: 1 } },
      { id: 'gate', type: 'and', x: 240, y: 0, label: 'AND', enabled: true, params: {} },
    ],
    wires: [
      {
        id: 'wire-1',
        from: { node: 'source', port: getDefinition('switch').outputs[0].id },
        to: { node: 'gate', port: getDefinition('and').inputs[0].id },
        width: 1,
      },
    ],
  };
}
