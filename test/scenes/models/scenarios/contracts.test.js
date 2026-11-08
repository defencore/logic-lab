import { node, near, positions } from './fixtures/scenarios.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../../../../src/components/catalog/index.js';
import { createRuntime, simulate } from '../../../../src/simulation/index.js';
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../../../../src/scenes/models/scenarios/index.js';

test('scenario models expose aggregate signals and simulators expose individual contacts', () => {
  assert.ok(Object.isFrozen(SCENARIO_TYPES));
  for (const type of SCENARIO_TYPES) {
    const definition = getDefinition(type);
    assert.ok(['scenes', 'automation'].includes(definition.category));
    assert.equal(definition.defaults, SCENARIO_DEFAULTS[type]);
    const n = node(type),
      state = initialScenarioState(n);
    assert.deepEqual(
      Object.keys(evaluateScenario(n, state, {})).sort(),
      definition.signals.outputs.map(({ id }) => id).sort(),
    );
    const runtime = simulate({ nodes: [n], wires: [] }, createRuntime(), 0);
    assert.deepEqual(
      Object.keys(runtime.outputs.scene).sort(),
      definition.outputs.map(({ id }) => id).sort(),
    );
    assert.ok([...definition.inputs, ...definition.outputs].every(({ width }) => width === 1));
  }
  const aquarium = getDefinition('aquarium');
  assert.equal(aquarium.signals.outputs.find(({ id }) => id === 'alive').width, 8);
  assert.deepEqual(
    aquarium.outputs.filter(({ group }) => group === 'alive').map(({ id, bit }) => [id, bit]),
    Array.from({ length: 8 }, (_, bit) => [`alive${bit}`, bit]),
  );
  const runtime = simulate(
    { nodes: [node('aquarium', { fishCount: 4 })], wires: [] },
    createRuntime(),
    0,
  );
  assert.equal(runtime.signals.outputs.scene.alive, 4);
  assert.equal(runtime.outputs.scene.alive, undefined);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, bit) => runtime.outputs.scene[`alive${bit}`]),
    [0, 0, 1, 0, 0, 0, 0, 0],
  );
  assert.equal(getDefinition('railway').outputs.find(({ id }) => id === 'speed').unit, 'km/h');
  assert.equal(getDefinition('animal_feeder').outputs.find(({ id }) => id === 'level').unit, 'g');
  assert.equal(getDefinition('water_tank').outputs.find(({ id }) => id === 'level').unit, '%');
});

test('unknown controls freeze mechanics, expose uncertainty, and recover when controls are defined', () => {
  const cases = {
    traffic_junction: 'ns_green',
    railway: 'signal_a',
    animal_feeder: 'dispense',
    water_tank: 'pump',
  };
  for (const [type, pin] of Object.entries(cases)) {
    const n = node(type),
      original = initialScenarioState(n);
    const frozen = advanceScenario(n, original, { [pin]: 'X' }, 10);
    assert.deepEqual(positions(frozen), positions(original), type);
    assert.equal(frozen.time, 0);
    assert.equal(frozen.uncertain, true);
    assert.ok(Object.values(evaluateScenario(n, frozen, { [pin]: 'X' })).includes('X'));
    assert.equal(advanceScenario(n, frozen, {}, 0.1).uncertain, false);
    assert.equal(advanceScenario({ ...n, enabled: false }, original, {}, 10), original);
  }
});

test('invalid thresholds, rates and initial quantities produce visible errors instead of advancing mechanics', () => {
  const cases = [
    node('traffic_junction', { carSpeed: 0 }),
    node('railway', { speedLimit: -1 }),
    node('animal_feeder', { fullThreshold: 10 }),
    node('animal_feeder', { initialHopper: 1000 }),
    node('water_tank', { lowThreshold: 90, highThreshold: 80 }),
    node('water_tank', { capacity: 0 }),
  ];
  for (const n of cases) {
    assert.ok(scenarioParameterError(n));
    const state = advanceScenario(n, initialScenarioState(n), {}, 1);
    assert.equal(state.failure, 'invalid_parameters');
    assert.equal(state.uncertain, true);
    assert.ok(Object.values(evaluateScenario(n, state, {})).every((value) => value === 'X'));
    const runtime = createRuntime();
    simulate({ nodes: [n], wires: [] }, runtime, 0.01);
    assert.ok(runtime.diagnostics.some(({ code }) => code === 'invalid_scenario'));
  }
});

test('settling never advances scene physics, disabled outputs release, and runtime reset restores all scenes', () => {
  for (const type of SCENARIO_TYPES) {
    const n = node(type),
      project = { nodes: [n], wires: [] },
      runtime = createRuntime();
    simulate(project, runtime, 0.5);
    const saved = structuredClone(runtime.state.scene.scenario);
    for (let iteration = 0; iteration < 50; iteration++) simulate(project, runtime, 0);
    assert.deepEqual(runtime.state.scene.scenario, saved, type);
    n.enabled = false;
    simulate(project, runtime, 1);
    assert.deepEqual(runtime.state.scene.scenario, saved);
    assert.ok(Object.values(runtime.outputs.scene).every((value) => value === 'Z'));
    n.enabled = true;
    const reset = createRuntime();
    simulate(project, reset, 0);
    near(reset.state.scene.scenario.time, 0);
  }
});
