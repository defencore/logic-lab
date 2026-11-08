import { node, near, advance } from './fixtures/scenarios.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../../../src/simulation/index.js';
import {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  initialScenarioState,
  advanceScenario,
  evaluateScenario,
  scenarioParameterError,
} from '../../../../src/scenes/models/scenarios/index.js';

test('feeder conserves grams, counts eaten portions and refills only on a fresh rising edge', () => {
  const n = node('animal_feeder');
  let state = advanceScenario(n, initialScenarioState(n), { dispense: 1 }, 1);
  near(state.hopper, 275);
  near(state.bowl, 31);
  near(state.eaten, 4);
  near(state.hopper + state.bowl + state.eaten + state.spilled, 310);
  state = advanceScenario(n, state, { refill: 1 }, 0);
  near(state.hopper, 500);
  state = advanceScenario(n, state, { dispense: 1, refill: 1 }, 1);
  near(state.hopper, 475);
  state = advanceScenario(n, state, { refill: 1 }, 0);
  near(state.hopper, 475);
  state = advanceScenario(n, state, { refill: 0 }, 0);
  state = advanceScenario(n, state, { refill: 1 }, 0);
  near(state.hopper, 500);
  state = advance(n, state, {}, 10);
  assert.ok(state.fed >= 1);
});

test('hunger feedback safely feeds an animal while continuous dispensing spills and latches its first alarm', () => {
  const n = node('animal_feeder');
  let safe = initialScenarioState(n);
  for (let index = 0; index < 3000; index++) {
    const sensed = evaluateScenario(n, safe, {});
    safe = advanceScenario(n, safe, { dispense: Number(sensed.hungry && !sensed.empty) }, 0.01);
  }
  assert.equal(safe.alarm, false);
  assert.ok(safe.eaten > 100);
  let unsafe = advance(n, initialScenarioState(n), { dispense: 1 }, 8);
  assert.equal(unsafe.alarm, true);
  assert.ok(unsafe.spilled > 0);
  assert.equal(unsafe.failure, 'overfed');
  unsafe = advance(n, unsafe, {}, 40);
  assert.equal(unsafe.alarm, true);
  assert.deepEqual(advanceScenario(n, unsafe, { reset: 1 }, 0), initialScenarioState(n));
});

test('tank integrates liters into percent, detects thresholds and retains its overflow after draining', () => {
  const n = node('water_tank', { capacity: 200, initialLevel: 50 });
  let state = advanceScenario(n, initialScenarioState(n), { pump: 1, drain: 1 }, 5);
  near(state.level, 70);
  state = advanceScenario(n, state, { pump: 1, drain: 0 }, 10);
  assert.equal(state.level, 100);
  assert.equal(state.overflow, true);
  near(state.spilled, 60);
  state = advanceScenario(n, state, { pump: 0, drain: 1 }, 50);
  near(state.level, 0);
  assert.equal(state.overflow, true);
  assert.equal(state.failure, 'overflow');
  assert.deepEqual(advanceScenario(n, state, { reset: 1 }, 0), initialScenarioState(n));
});

test('continuous feeder and tank quantities are independent of physics-step subdivision', () => {
  for (const type of ['animal_feeder', 'water_tank']) {
    const n = node(type),
      inputs = type === 'animal_feeder' ? { dispense: 1 } : { pump: 1, drain: 0 };
    const coarse = advanceScenario(n, initialScenarioState(n), inputs, 14);
    const fine = advance(n, initialScenarioState(n), inputs, 14, 0.005);
    for (const key of type === 'animal_feeder'
      ? ['bowl', 'hopper', 'eaten', 'spilled']
      : ['level', 'spilled'])
      near(coarse[key], fine[key]);
    near(coarse.time, fine.time);
  }
});

test('tank SR feedback starts at a known middle-band level without transient Z poisoning its stored state', () => {
  const tank = node('water_tank');
  const project = {
    nodes: [tank, { id: 'memory', type: 'sr_latch', params: { initial: 0 }, enabled: true }],
    wires: [
      { id: 'low', from: { node: 'scene', port: 'low' }, to: { node: 'memory', port: 's' } },
      { id: 'high', from: { node: 'scene', port: 'high' }, to: { node: 'memory', port: 'r' } },
      { id: 'pump', from: { node: 'memory', port: 'q' }, to: { node: 'scene', port: 'pump' } },
    ],
  };
  const runtime = createRuntime();
  simulate(project, runtime, 0);
  assert.equal(runtime.outputs.memory.q, 0);
  for (let index = 0; index < 10000; index++) simulate(project, runtime, 0.01);
  assert.equal(runtime.outputs.scene.overflow, 0);
  assert.ok(runtime.outputs.scene.level >= 19.9 && runtime.outputs.scene.level <= 80.2);
  assert.equal(runtime.state.scene.scenario.uncertain, false);
});
