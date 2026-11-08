import { getDefinition } from '../components/catalog/index.js';
import { isScenarioType, advanceScenario } from '../scenes/models/scenarios/index.js';
import { modulationInput } from './models.js';
import { advanceServo } from './servo.js';
import { TAU, unknown, clamp, number } from './signals.js';

/** Continuous worlds and sampled actuators advance once per external physics step. */
export function advanceState(nodes, runtime, incoming, dt) {
  const updates = new Map();
  for (const node of nodes) {
    if (node.enabled === false) continue;
    const inputs = runtime.signals.inputs[node.id],
      state = runtime.state[node.id];
    const p = { ...getDefinition(node.type).defaults, ...node.params };
    if (isScenarioType(node.type))
      updates.set(node.id, {
        ...state,
        scenario: advanceScenario(node, state.scenario, inputs, dt),
      });
    else if (node.type === 'servo')
      updates.set(node.id, advanceServo(state, inputs, p, runtime.time));
    else if (node.type === 'fm' && inputs.mod !== 'Z' && !unknown(inputs.mod)) {
      const modulation = modulationInput(node, inputs.mod, p, incoming);
      updates.set(node.id, {
        ...state,
        fmPhase:
          ((state.fmPhase ?? 0) +
            TAU *
              Math.max(0, number(p.carrier, 8)) *
              (1 + clamp(number(p.depth, 0.6), 0, 1) * modulation) *
              dt) %
          TAU,
      });
    }
  }
  for (const [id, state] of updates) runtime.state[id] = state;
}
