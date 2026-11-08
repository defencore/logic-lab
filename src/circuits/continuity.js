import { passiveContacts } from './passive-contacts.js';
import { getDefinition } from '../components/catalog/index.js';

const keyForPin = ({ node, port, side }) => JSON.stringify([node, side, port]);
const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const emptyNet = () => ({ wires: [], pins: [], nodes: [] });

/**
 * Trace one physical net through shared wire endpoints. Passive connector pairs are conductors; logic inputs/outputs
 * and geometric crossings remain separate. Rebuild the index so edits cannot leave a stale continuity result.
 */
export function traceNet(project, seed) {
  if (!seed || typeof seed !== 'object') return emptyNet();
  const pins = new Map();
  const nodes = new Set();
  for (const node of Array.isArray(project?.nodes) ? project.nodes : []) {
    if (typeof node?.id !== 'string' || !node.id || nodes.has(node.id)) continue;
    const definition = getDefinition(node.type);
    if (!definition) continue;
    nodes.add(node.id);
    for (const [side, ports] of [
      ['in', definition.inputs],
      ['out', definition.outputs],
    ]) {
      for (const port of ports) {
        const pin = { node: node.id, port: port.id, side };
        pins.set(keyForPin(pin), pin);
      }
    }
  }

  const wires = new Map();
  const adjacent = new Map();
  for (const wire of Array.isArray(project?.wires) ? project.wires : []) {
    if (typeof wire?.id !== 'string' || !wire.id || wires.has(wire.id)) continue;
    const from = keyForPin({ ...wire.from, side: 'out' });
    const to = keyForPin({ ...wire.to, side: 'in' });
    if (!pins.has(from) || !pins.has(to)) continue;
    const edge = { id: wire.id, from, to };
    wires.set(edge.id, edge);
    for (const key of [from, to]) {
      if (!adjacent.has(key)) adjacent.set(key, []);
      adjacent.get(key).push(edge);
    }
  }

  for (const node of Array.isArray(project?.nodes) ? project.nodes : []) {
    for (const pair of passiveContacts(node)) {
      const from = keyForPin({ node: node.id, port: pair.input, side: 'in' });
      const to = keyForPin({ node: node.id, port: pair.output, side: 'out' });
      if (!pins.has(from) || !pins.has(to)) continue;
      const conductor = { from, to };
      for (const key of [from, to]) {
        if (!adjacent.has(key)) adjacent.set(key, []);
        adjacent.get(key).push(conductor);
      }
    }
  }

  const start = typeof seed.wire === 'string' ? wires.get(seed.wire)?.from : keyForPin(seed);
  if (!pins.has(start)) return emptyNet();
  const reachedPins = new Set();
  const reachedWires = new Set();
  const remaining = [start];
  while (remaining.length) {
    const key = remaining.pop();
    if (reachedPins.has(key)) continue;
    reachedPins.add(key);
    for (const wire of adjacent.get(key) || []) {
      if (wire.id) reachedWires.add(wire.id);
      remaining.push(wire.from, wire.to);
    }
  }

  const contacts = [...reachedPins].map((key) => pins.get(key));
  contacts.sort(
    (a, b) =>
      compareText(a.node, b.node) || compareText(a.side, b.side) || compareText(a.port, b.port),
  );
  return {
    wires: [...reachedWires].sort(compareText),
    pins: contacts,
    nodes: [...new Set(contacts.map((pin) => pin.node))].sort(compareText),
  };
}
