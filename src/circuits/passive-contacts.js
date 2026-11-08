const connectorTypes = new Set(['splitter', 'merger']);

export const isPassiveConnector = (node) => connectorTypes.has(node.type);

/** Each numbered pair is one physical conductor; adjacent bits stay isolated. */
export function passiveContacts(node) {
  if (!isPassiveConnector(node) || node.enabled === false) return [];
  return Array.from({ length: 8 }, (_, bit) => ({
    input: `${node.type === 'splitter' ? 'in' : 'b'}${bit}`,
    output: `${node.type === 'splitter' ? 'b' : 'out'}${bit}`,
  }));
}
