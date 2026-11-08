import assert from 'node:assert/strict';
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../../../../../src/scenes/models/scenarios/index.js';

export const node = (type, params = {}) => ({
  id: 'scene',
  type,
  params,
  enabled: true,
  x: 0,
  y: 0,
});

export const near = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);

export function advance(n, state, inputs, duration, step = 0.01) {
  const count = Math.ceil(duration / step);
  for (let index = 0; index < count; index++)
    state = advanceScenario(n, state, inputs, duration / count);
  return state;
}

export const positions = (state) =>
  state.cars?.map((car) => car.position) ??
  state.trains?.map((train) => train.position) ?? [state.bowl ?? state.level];
