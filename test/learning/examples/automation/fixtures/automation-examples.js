import { EXAMPLES, createExample } from '../../../../../examples/index.js';
import { createRuntime, simulate } from '../../../../../src/simulation/index.js';

export const IDS = [
  'aquarium-life-support',
  'aquarium-feeding',
  'aquarium-lighting',
  'greenhouse-climate',
  'greenhouse-irrigation',
  'home-climate',
  'yard-security',
  'railway-dispatch',
];

export function open(id) {
  const project = createExample(id),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}

export function source(context, id, value, key = 'value') {
  context.project.nodes.find((node) => node.id === id).params[key] = value;
  simulate(context.project, context.runtime, 0);
}

export function advance(context, seconds, observe = () => {}, dt = 0.05) {
  const count = Math.ceil(seconds / dt);
  for (let index = 0; index < count; index++) {
    simulate(context.project, context.runtime, seconds / count);
    observe(context);
  }
}

export const output = (context, id = 'world', port = 'alarm') =>
  context.runtime.signals.outputs[id][port];

export const input = (context, port, id = 'world') => context.runtime.signals.inputs[id][port];

export const state = (context) => context.runtime.state.world.scenario;

export function reset(context) {
  source(context, 'reset', 1);
  source(context, 'reset', 0);
}
