import { getDefinition } from './catalog.js';

function motorSource(project, nodeId, visited = new Set()) {
  if (visited.has(nodeId)) return null;
  visited.add(nodeId);
  const node = project.nodes.find((item) => item.id === nodeId);
  if (!node) return null;
  if (node.type === 'stepper') return node.id;
  const incoming = project.wires.filter(
    (wire) => wire.to.node === nodeId && wire.to.port === 'position',
  );
  if (incoming.length !== 1) return null;
  return motorSource(project, incoming[0].from.node, visited);
}

export function getMotionState(project, runtime) {
  const motors = project.nodes
    .filter((node) => node.type === 'stepper')
    .map((node) => {
      const parameters = { ...getDefinition(node.type).defaults, ...node.params };
      const output = runtime.outputs[node.id] || {};
      const enable = runtime.inputs[node.id]?.enable;
      const enableWired = project.wires.some(
        (wire) => wire.to.node === node.id && wire.to.port === 'enable',
      );
      return {
        id: node.id,
        label: node.label || getDefinition(node.type).label,
        position: output.position,
        angle: output.angle,
        moving: output.moving === 1,
        enabled: node.enabled !== false && (!enableWired || enable === 1),
        min: parameters.min,
        max: parameters.max,
      };
    });
  const sensors = project.nodes
    .filter((node) => ['limit_switch', 'position_sensor'].includes(node.type))
    .map((node) => {
      const parameters = { ...getDefinition(node.type).defaults, ...node.params };
      const output = runtime.outputs[node.id]?.out;
      const target = runtime.inputs[node.id]?.target;
      const active =
        typeof output === 'number'
          ? node.type === 'limit_switch' && parameters.normallyClosed
            ? output === 0
            : output === 1
          : null;
      return {
        id: node.id,
        label: node.label || getDefinition(node.type).label,
        motorId: motorSource(project, node.id),
        position: runtime.inputs[node.id]?.position,
        triggered: active,
        signal: output,
        threshold: typeof target === 'number' ? target : parameters.threshold,
        mode: parameters.mode,
        enabled: node.enabled !== false,
      };
    });
  return { motors, sensors };
}
