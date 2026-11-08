import assert from 'node:assert/strict';
import { EXAMPLES, createExample } from '../../../../examples/index.js';
import { createRuntime, simulate } from '../../../../src/simulation/index.js';
import {
  JUNCTION,
  RAILWAY,
  RAIL_RESERVATION,
  trainFootprint,
  carFootprint,
} from '../../../../src/scenes/transport/geometry.js';

export function open(id) {
  const project = createExample(id),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}

export function value(context, id, value, key = 'value') {
  context.project.nodes.find((node) => node.id === id).params[key] = value;
  simulate(context.project, context.runtime, 0);
}

export function advance(context, seconds, interval = 0.0005) {
  const count = Math.ceil(seconds / interval);
  for (let i = 0; i < count; i++) simulate(context.project, context.runtime, seconds / count);
}

export const output = (context, node, port = 'out') => context.runtime.signals.outputs[node][port];

export const input = (context, node, port = 'in') => context.runtime.signals.inputs[node][port];

export function advanceProcess(context, seconds, observe = () => {}) {
  const count = Math.ceil(seconds / 0.02);
  for (let index = 0; index < count; index++) {
    simulate(context.project, context.runtime, seconds / count);
    observe(context);
  }
}

export const processState = (context, node) => context.runtime.state[node].scenario;

export function bodyCorners(body) {
  const cosine = Math.cos(body.heading),
    sine = Math.sin(body.heading);
  return [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ].map(([right, forward]) => ({
    x: body.x + right * body.halfWidth * cosine + forward * body.halfLength * sine,
    z: body.z - right * body.halfWidth * sine + forward * body.halfLength * cosine,
  }));
}

export function bodiesContact(first, second) {
  const a = bodyCorners(first),
    b = bodyCorners(second);
  for (const polygon of [a, b])
    for (let index = 0; index < polygon.length; index++) {
      const next = polygon[(index + 1) % polygon.length];
      const normal = { x: polygon[index].z - next.z, z: next.x - polygon[index].x };
      const project = (points) => points.map((point) => point.x * normal.x + point.z * normal.z);
      const ap = project(a),
        bp = project(b);
      if (Math.max(...ap) < Math.min(...bp) - 1e-7 || Math.max(...bp) < Math.min(...ap) - 1e-7)
        return false;
    }
  return true;
}

export function collisionBodies(state) {
  const objects = [...state.trains, ...(state.roadCars || [])];
  return state.collisionPair.map((id) => {
    const object = objects.find((item) => item.id === id);
    assert.ok(object && object.crashed, `Missing crashed body ${id}`);
    return object.track ? trainFootprint(object) : carFootprint(object, 'railway');
  });
}

export function openRailwayUnsafe(openBarrier = 0) {
  const context = open('railway-interlocking');
  value(context, 'unsafe', 1);
  value(context, 'open', openBarrier);
  return context;
}
