import { getDefinition } from '../components/catalog/index.js';

const compiled = new WeakMap();

function unchanged(project, cache) {
  const nodes = project.nodes || [],
    wires = project.wires || [];
  if (nodes.length !== cache.nodes.length || wires.length !== cache.wires.length) return false;
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index],
      old = cache.nodes[index];
    if (node !== old.value || node.id !== old.id || node.type !== old.type) return false;
  }
  for (let index = 0; index < wires.length; index++) {
    const wire = wires[index],
      old = cache.wires[index];
    if (
      wire.id !== old.id ||
      wire.from?.node !== old.fromNode ||
      wire.from?.port !== old.fromPort ||
      wire.to?.node !== old.toNode ||
      wire.to?.port !== old.toPort
    )
      return false;
  }
  return true;
}

/** Compile electrical connectivity once; source values, enable flags and layout remain live. */
export function compileCircuit(project) {
  const previous = compiled.get(project);
  if (previous && unchanged(project, previous)) return previous.network;
  const network = buildNetwork(project);
  compiled.set(project, {
    network,
    nodes: (project.nodes || []).map((value) => ({ value, id: value.id, type: value.type })),
    wires: (project.wires || []).map((wire) => ({
      id: wire.id,
      fromNode: wire.from?.node,
      fromPort: wire.from?.port,
      toNode: wire.to?.node,
      toPort: wire.to?.port,
    })),
  });
  return network;
}

function buildNetwork(project) {
  const nodes = (project.nodes || []).filter((node) => getDefinition(node.type));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map();
  const parents = new Map();
  const find = (key) => {
    if (!parents.has(key)) parents.set(key, key);
    let root = key;
    while (parents.get(root) !== root) root = parents.get(root);
    while (parents.get(key) !== key) {
      const next = parents.get(key);
      parents.set(key, root);
      key = next;
    }
    return root;
  };
  const validWires = [];
  for (const wire of project.wires || []) {
    const source = nodeById.get(wire.from?.node),
      target = nodeById.get(wire.to?.node);
    if (!source || !target) continue;
    const sourcePort = getDefinition(source.type).outputs.find(
      (port) => port.id === wire.from.port,
    );
    const targetPort = getDefinition(target.type).inputs.find((port) => port.id === wire.to.port);
    if (
      !sourcePort ||
      !targetPort ||
      (!targetPort.acceptAny && !!sourcePort.analog !== !!targetPort.analog)
    )
      continue;
    const sourceKey = `out:${source.id}:${sourcePort.id}`;
    const targetKey = `in:${target.id}:${targetPort.id}`;
    parents.set(find(sourceKey), find(targetKey));
    validWires.push({
      id: wire.id,
      from: { ...wire.from },
      to: { ...wire.to },
      sourceType: source.type,
      sourceKey,
      targetKey,
    });
  }
  // A shared output pin electrically joins all of its fan-out wires into one net.
  const driversByNet = new Map();
  for (const wire of validWires) {
    const net = find(wire.sourceKey);
    if (!driversByNet.has(net)) driversByNet.set(net, new Map());
    driversByNet.get(net).set(wire.sourceKey, wire);
  }
  for (const wire of validWires) {
    const key = `${wire.to.node}:${wire.to.port}`;
    incoming.set(key, [...driversByNet.get(find(wire.targetKey)).values()]);
  }
  return { nodes, incoming, validWires };
}
