import { SOURCE_PARAMETERS } from '../simulation/input-sources.js';
import { getDefinition } from '../components/catalog/index.js';
import { validateProject } from '../circuits/project.js';
import { stable, labelHash } from './canonical.js';

function semanticNodes(project, { ignoreSourceValues = false } = {}) {
  return project.nodes
    .filter((node) => !['note', 'group'].includes(node.type))
    .map((node) => {
      const params = { ...getDefinition(node.type).defaults, ...node.params };
      if (ignoreSourceValues)
        for (const key of Object.keys(SOURCE_PARAMETERS[node.type] || {})) delete params[key];
      return { id: node.id, type: node.type, enabled: node.enabled !== false, params };
    });
}
export function graphLabels(project, options) {
  const nodes = semanticNodes(project, options);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = project.wires.filter(
    (wire) => nodeMap.has(wire.from.node) && nodeMap.has(wire.to.node),
  );
  const adjacent = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    adjacent.get(edge.from.node).push(['out', edge.from.port, edge.to.port, edge.to.node]);
    adjacent.get(edge.to.node).push(['in', edge.to.port, edge.from.port, edge.from.node]);
  }
  let labels = new Map(
    nodes.map((node) => [
      node.id,
      labelHash(stable({ type: node.type, enabled: node.enabled, params: node.params })),
    ]),
  );
  // Fixed rounds and sorted multisets make labels invariant to ordering and cosmetic edits.
  for (let round = 0; round < Math.min(12, nodes.length); round++) {
    const next = new Map();
    for (const node of nodes) {
      const neighbours = adjacent
        .get(node.id)
        .map(([direction, from, to, neighbour]) => [direction, from, to, labels.get(neighbour)]);
      next.set(node.id, labelHash(stable([labels.get(node.id), neighbours.map(stable).sort()])));
    }
    labels = next;
  }
  return { nodes, edges, labels };
}
export function graphFingerprint(source, options = {}) {
  const project = validateProject(source);
  const { nodes, edges, labels } = graphLabels(project, options);
  return labelHash(
    stable({
      nodes: nodes.map((node) => labels.get(node.id)).sort(),
      edges: edges
        .map((edge) => [
          labels.get(edge.from.node),
          edge.from.port,
          labels.get(edge.to.node),
          edge.to.port,
        ])
        .map(stable)
        .sort(),
    }),
  );
}
export function multisetDice(a, b) {
  if (!a.length && !b.length) return 0;
  const counts = new Map();
  for (const value of a) counts.set(value, (counts.get(value) || 0) + 1);
  let common = 0;
  for (const value of b)
    if ((counts.get(value) || 0) > 0) {
      common++;
      counts.set(value, counts.get(value) - 1);
    }
  return (2 * common) / (a.length + b.length);
}
export function graphFeatures(project, starter) {
  const nodes = semanticNodes(project, { ignoreSourceValues: true });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const describe = ({ type, params, enabled }) => stable({ type, params, enabled });
  const template = new Map();
  for (const node of starter ? semanticNodes(starter, { ignoreSourceValues: true }) : []) {
    const feature = describe(node);
    template.set(feature, (template.get(feature) || 0) + 1);
  }
  const result = [];
  for (const node of nodes) {
    const feature = describe(node);
    if (template.get(feature) > 0) template.set(feature, template.get(feature) - 1);
    else result.push(`node:${feature}`);
  }
  for (const wire of project.wires) {
    const a = byId.get(wire.from.node),
      b = byId.get(wire.to.node);
    if (a && b) result.push(`edge:${a.type}:${wire.from.port}>${b.type}:${wire.to.port}`);
  }
  return result;
}
export function actionFingerprint(sequence) {
  const nodes = graphLabels(sequence.initialProject, { ignoreSourceValues: true }).labels;
  return labelHash(
    stable(
      sequence.actions.map((action) =>
        action.op === 'reset'
          ? ['reset', action.at]
          : [nodes.get(action.node), action.key, action.value, action.at],
      ),
    ),
  );
}

export function sameCircuitStructure(left, right) {
  const options = { ignoreSourceValues: true };
  if (graphFingerprint(left, options) !== graphFingerprint(right, options)) return false;
  return exactTopology(graphLabels(left, options), graphLabels(right, options));
}
export function exactTopology(left, right) {
  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length)
    return false;
  const named = (graph) =>
    stable({
      nodes: graph.nodes.map((node) => stable(node)).sort(),
      edges: graph.edges
        .map((edge) => stable([edge.from.node, edge.from.port, edge.to.node, edge.to.port]))
        .sort(),
    });
  if (named(left) === named(right)) return true;
  const candidates = new Map(
    left.nodes.map((node) => [
      node.id,
      right.nodes
        .filter((other) => left.labels.get(node.id) === right.labels.get(other.id))
        .map((other) => other.id)
        .sort((a, b) => Number(b === node.id) - Number(a === node.id)),
    ]),
  );
  if ([...candidates.values()].some((list) => !list.length)) return false;
  const pairs = (graph) => {
    const values = new Map();
    for (const edge of graph.edges) {
      const key = stable([edge.from.node, edge.to.node]);
      if (!values.has(key)) values.set(key, []);
      values.get(key).push(stable([edge.from.port, edge.to.port]));
    }
    return new Map([...values].map(([key, ports]) => [key, stable(ports.sort())]));
  };
  const leftPairs = pairs(left),
    rightPairs = pairs(right),
    mapped = new Map(),
    used = new Set();
  const ordered = [...left.nodes].sort(
    (a, b) => candidates.get(a.id).length - candidates.get(b.id).length,
  );
  const connection = (table, a, b) => table.get(stable([a, b])) || '[]';
  let work = 0;
  const visit = (index) => {
    if (index === ordered.length) return true;
    if (++work > 20_000) return null;
    const a = ordered[index].id;
    for (const b of candidates.get(a)) {
      if (++work > 20_000) return null;
      if (used.has(b) || connection(leftPairs, a, a) !== connection(rightPairs, b, b)) continue;
      let compatible = true;
      for (const [previous, other] of mapped) {
        if (++work > 20_000) return null;
        if (
          connection(leftPairs, a, previous) !== connection(rightPairs, b, other) ||
          connection(leftPairs, previous, a) !== connection(rightPairs, other, b)
        ) {
          compatible = false;
          break;
        }
      }
      if (!compatible) continue;
      mapped.set(a, b);
      used.add(b);
      const result = visit(index + 1);
      if (result !== false) return result;
      mapped.delete(a);
      used.delete(b);
    }
    return false;
  };
  return visit(0);
}
