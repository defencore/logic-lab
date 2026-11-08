import { getDefinition } from '../components/catalog/index.js';

/** Record every semantic output; passive indicators expose their measured inputs instead. */
export function availableProbes(project) {
  return project.nodes
    .filter((node) => !['note', 'group'].includes(node.type))
    .flatMap((node) => {
      const definition = getDefinition(node.type);
      const side = definition.signals.outputs.length ? 'outputs' : 'inputs';
      return definition.signals[side].map((port) => ({ node: node.id, port: port.id, side }));
    });
}
export const probeId = (probe) => `${probe.node}:${probe.side || 'outputs'}:${probe.port}`;
export function recommendedProbes(project, preferred = [], limit = 32) {
  const available = availableProbes(project),
    allowed = new Set(available.map(probeId));
  const valid = preferred.filter((probe) => allowed.has(probeId(probe)));
  return (valid.length ? valid : available).slice(0, limit);
}
