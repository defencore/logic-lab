import { getDefinition } from '../components/catalog/index.js';
import { parseProject } from './project.js';

/** Explicitly prepare an editable copy; recordings and original bytes are never rewritten. */
export function recoverProjectCopy(raw) {
  try {
    if (typeof raw !== 'string' || raw.length > 5_000_000) return null;
    const value = JSON.parse(raw);
    if (!Array.isArray(value.nodes) || !Array.isArray(value.wires)) return null;
    const servos = new Set(
      value.nodes.filter((node) => node.type === 'servo').map((node) => node.id),
    );
    let changed = false;
    for (const node of value.nodes) {
      if (!servos.has(node.id)) continue;
      for (const key of ['minDuty', 'maxDuty']) {
        if (Object.hasOwn(node.params || {}, key)) {
          delete node.params[key];
          changed = true;
        }
      }
    }
    const byId = new Map(value.nodes.map((node) => [node.id, node]));
    let disconnected = 0;
    value.wires = value.wires.filter((wire) => {
      if (!servos.has(wire.to?.node)) return true;
      const source = byId.get(wire.from?.node);
      const port = getDefinition(source?.type)?.outputs.find((port) => port.id === wire.from?.port);
      if (!port?.analog) return true;
      disconnected++;
      changed = true;
      return false;
    });
    return changed ? { project: parseProject(JSON.stringify(value)), disconnected } : null;
  } catch {
    return null;
  }
}
