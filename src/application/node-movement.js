import { portDirection, translateWirePoints, wireVertices } from '../circuits/geometry/index.js';
import { boundCoordinate } from './model.js';

const stationary = { x: 0, y: 0 };

export function prepareNodeMovement(project, selected) {
  const nodes = project.nodes
    .filter((node) => selected.has(node.id))
    .map((node) => ({ node, x: node.x, y: node.y }));
  const byId = new Map(project.nodes.map((node) => [node.id, node]));
  const wires = project.wires
    .filter((wire) => selected.has(wire.from.node) || selected.has(wire.to.node))
    .map((wire) => {
      const source = byId.get(wire.from.node);
      const target = byId.get(wire.to.node);
      if (!wire.points?.length || !source || !target) return { wire };
      return {
        wire,
        points: wire.points,
        vertices: wireVertices(wire, project),
        directions: {
          start: portDirection(source, wire.from.port, 'out'),
          end: portDirection(target, wire.to.port, 'in'),
        },
      };
    });
  return { nodes, wires };
}

export function applyNodeMovement({ nodes, wires }, dx, dy) {
  const deltas = new Map();
  for (const { node, x, y } of nodes) {
    node.x = boundCoordinate(x + dx);
    node.y = boundCoordinate(y + dy);
    if (node.x !== x || node.y !== y) deltas.set(node.id, { x: node.x - x, y: node.y - y });
  }
  for (const { wire, points, vertices, directions } of wires) {
    if (!points) continue;
    const start = deltas.get(wire.from.node);
    const end = deltas.get(wire.to.node);
    wire.points =
      start || end
        ? translateWirePoints(vertices, points, start ?? stationary, end ?? stationary, directions)
        : points;
  }
  return deltas.size > 0;
}
