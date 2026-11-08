import { getDefinition } from './catalog.js';
import { getMotionState } from './motion-data.js';
import { SCENARIO_TYPES, SCENARIO_INPUT_DEFAULTS } from './scenarios.js';

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
  if (snapshot.node.type === 'smart_home' && outputs.alarm === 1 && !snapshot.state?.failure)
    return { status: 'warning', reason: 'homeSecurity' };
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

export function sceneMessageKey(snapshot, reason) {
  const processReasons = {
    aquarium: {
      cold: 'fishCold',
      heat: 'fishHeat',
      oxygen: 'fishOxygen',
      overfed: 'fishOverfed',
      starved: 'fishStarved',
      dirty: 'fishDirty',
      light: 'fishLight',
    },
    greenhouse: {
      cold: 'plantCold',
      heat: 'plantHeat',
      drought: 'plantDry',
      flood: 'plantWet',
      dark: 'plantDark',
    },
    smart_home: { empty_tank: 'homeEmptyTank' },
  };
  return (
    processReasons[snapshot.node.type]?.[reason] ||
    {
      invalid_parameters: 'sceneParameters',
      collision: 'sceneCollision',
      overspeed: 'sceneOverspeed',
      points_under_train: 'scenePoints',
      wrong_route: 'sceneWrongRoute',
      open_barrier: 'sceneBarrier',
      spill: 'sceneSpill',
      overfed: 'sceneOverfed',
      overflow: 'sceneOverflow',
    }[reason] ||
    reason
  );
}

/** Scene buttons operate circuit switches; computed control signals remain owned by the circuit. */
export function sceneControlSwitch(project, nodeId, port) {
  let wires = project.wires.filter((wire) => wire.to.node === nodeId && wire.to.port === port);
  const node = project.nodes.find((item) => item.id === nodeId);
  if (!wires.length && node?.type === 'railway' && port === 'exit_points')
    wires = project.wires.filter((wire) => wire.to.node === nodeId && wire.to.port === 'points');
  if (wires.length !== 1) return null;
  const source = project.nodes.find((item) => item.id === wires[0].from.node);
  return source?.type === 'switch' && source.enabled !== false ? source.id : null;
}

export function sceneActuatorValues(snapshot) {
  const defaults = SCENARIO_INPUT_DEFAULTS[snapshot.node.type];
  return Object.fromEntries(
    getDefinition(snapshot.node.type).inputs.map(({ id }) => {
      if (snapshot.node.enabled === false) return [id, 'Z'];
      if (id === 'points' || id === 'exit_points') return [id, snapshot.outputs[`${id}_state`]];
      const input = snapshot.inputs[id];
      return [id, input === 'Z' || input === undefined ? defaults[id] : input];
    }),
  );
}
