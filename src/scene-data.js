import { getDefinition } from './catalog.js';
import { getMotionState } from './motion-data.js';
import { SCENARIO_TYPES } from './scenarios.js';

export function getSceneEntries(project) {
  const motors = project.nodes.filter((node) => node.type === 'stepper');
  const entries = motors.length
    ? [{ id: '@mechanics', type: 'mechanics', nodeIds: motors.map((node) => node.id) }]
    : [];
  for (const node of project.nodes) {
    if (SCENARIO_TYPES.includes(node.type)) {
      entries.push({ id: node.id, type: node.type, nodeId: node.id, nodeIds: [node.id] });
    }
  }
  return entries;
}

export function getSceneSnapshot(project, runtime, entry) {
  if (!entry) return null;
  if (entry.type === 'mechanics') return getMotionState(project, runtime);
  const node = project.nodes.find((item) => item.id === entry.nodeId);
  if (!node || !SCENARIO_TYPES.includes(node.type)) return null;
  return {
    node,
    parameters: { ...getDefinition(node.type).defaults, ...node.params },
    inputs: runtime.inputs[node.id] || {},
    outputs: runtime.outputs[node.id] || {},
    state: runtime.state[node.id]?.scenario,
    time: runtime.time,
  };
}

export function sceneHealth(snapshot) {
  if (!snapshot) return { status: 'unknown', reason: 'noScene' };
  if (snapshot.node.enabled === false) return { status: 'disabled', reason: 'disabled' };
  if (snapshot.state?.failure === 'invalid_parameters') {
    return { status: 'warning', reason: 'invalid_parameters' };
  }
  const outputs = snapshot.outputs;
  if (['crash', 'fault', 'alarm', 'overflow'].some((port) => outputs[port] === 1)) {
    return { status: 'fault', reason: snapshot.state?.failure || 'sceneFault' };
  }
  if (Object.values(outputs).some((value) => value === 'X' || value === 'Z')) {
    return { status: 'unknown', reason: 'sceneUnknown' };
  }
  if (snapshot.node.type === 'traffic_light' && outputs.valid !== 1) {
    return { status: 'warning', reason: 'invalidLights' };
  }
  return { status: 'ready', reason: 'sceneReady' };
}
