import { contactSwitchClosed } from '../components/peripheral-inputs.js';

const connectorTypes = new Set(['splitter', 'merger', 'contact_switch']);

export const isPassiveConnector = (node) => connectorTypes.has(node.type);

/** Each numbered pair is one physical conductor; adjacent bits stay isolated. */
export function passiveContacts(node) {
  if (!isPassiveConnector(node) || node.enabled === false) return [];
  if (node.type === 'contact_switch')
    return contactSwitchClosed(node) ? [{ input: 'in', output: 'out' }] : [];
  return Array.from({ length: 8 }, (_, bit) => ({
    input: `${node.type === 'splitter' ? 'in' : 'b'}${bit}`,
    output: `${node.type === 'splitter' ? 'b' : 'out'}${bit}`,
  }));
}
