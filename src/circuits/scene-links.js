import { getDefinition } from '../components/catalog/index.js';
import { SCENARIO_TYPES } from '../scenes/models/scenarios/index.js';

export function sceneNodeIds(project, entry) {
  if (entry.type !== 'mechanics') return [entry.nodeId];
  return project.nodes
    .filter((node) => ['stepper', 'position_sensor', 'limit_switch'].includes(node.type))
    .map((node) => node.id);
}

/** Structural dependency paths are an inspection aid; they do not infer a logical cause. */
export function linkedCircuitPath(project, contact) {
  const upstream = contact.side === 'in';
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  const root = nodes.get(contact.node);
  const ports = root && getDefinition(root.type)?.[upstream ? 'inputs' : 'outputs'];
  if (!ports?.some((port) => port.id === contact.port)) return { nodes: [], wires: [] };
  const reached = new Set([root.id]),
    wires = new Set(),
    visited = new Set();
  const adjacent = new Map();
  for (const wire of project.wires) {
    const end = upstream ? wire.to : wire.from;
    if (!adjacent.has(end.node)) adjacent.set(end.node, []);
    adjacent.get(end.node).push(wire);
  }
  const remaining = [{ node: root.id, port: contact.port }];
  while (remaining.length) {
    const current = remaining.pop();
    const key = JSON.stringify([current.node, current.port]);
    if (visited.has(key)) continue;
    visited.add(key);
    for (const wire of adjacent.get(current.node) || []) {
      const near = upstream ? wire.to : wire.from;
      if (near.node !== current.node || (current.port && near.port !== current.port)) continue;
      wires.add(wire.id);
      const far = upstream ? wire.from : wire.to;
      reached.add(far.node);
      const node = nodes.get(far.node);
      if (node && !SCENARIO_TYPES.includes(node.type) && node.type !== 'stepper')
        remaining.push({ node: node.id, port: null });
    }
  }
  return { nodes: [...reached], wires: [...wires] };
}

export function relatedSceneSources(project, entry) {
  const ids = new Set();
  for (const id of sceneNodeIds(project, entry)) {
    const node = project.nodes.find((item) => item.id === id);
    for (const port of getDefinition(node?.type)?.inputs || [])
      linkedCircuitPath(project, { node: id, port: port.id, side: 'in' }).nodes.forEach((id) =>
        ids.add(id),
      );
  }
  return project.nodes.filter(
    (node) =>
      ids.has(node.id) &&
      ['switch', 'button', 'keypad', 'keypad_4x4', 'hotkey', 'clock', 'bus_input'].includes(
        node.type,
      ),
  );
}

export function sceneContactFor(project, entry, contact) {
  const ids = new Set(sceneNodeIds(project, entry));
  if (ids.has(contact.node)) {
    const node = project.nodes.find((node) => node.id === contact.node);
    if (
      contact.port &&
      !getDefinition(node?.type)?.[contact.side === 'in' ? 'inputs' : 'outputs'].some(
        (port) => port.id === contact.port,
      )
    )
      return null;
    return contact;
  }
  for (const id of ids) {
    const node = project.nodes.find((item) => item.id === id);
    for (const side of ['in', 'out']) {
      for (const port of getDefinition(node?.type)?.[side === 'in' ? 'inputs' : 'outputs'] || []) {
        const candidate = { node: id, port: port.id, side };
        const path = linkedCircuitPath(project, candidate);
        if (
          path.nodes.includes(contact.node) &&
          (!contact.port ||
            project.wires.some(
              (wire) =>
                path.wires.includes(wire.id) &&
                [wire.from, wire.to].some(
                  (end) => end.node === contact.node && end.port === contact.port,
                ),
            ))
        )
          return candidate;
      }
    }
  }
  return null;
}
