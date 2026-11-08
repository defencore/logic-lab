import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialAutomationState,
  advanceAutomation,
  evaluateAutomation,
} from '../../../src/scenes/models/automation/index.js';

const component = (type, params = {}) => ({ id: 'world', type, params, enabled: true });
function run(node, duration, controller, dt = 0.05) {
  let state = initialAutomationState(node);
  const count = Math.ceil(duration / dt);
  for (let index = 0; index < count; index++) {
    const outputs = evaluateAutomation(node, state, {});
    state = advanceAutomation(
      node,
      state,
      controller(outputs, state),
      Math.min(dt, duration - index * dt),
    );
  }
  return state;
}
const aquariumFeedback = (o) => ({
  heater: o.cold,
  cooler: o.hot,
  aerator: o.low_oxygen,
  feed: o.hungry,
  filter: o.dirty,
  light: o.day,
});

for (const [type, actuator] of [
  ['smart_home', 'fan'],
  ['greenhouse', 'vent'],
]) {
  test(`${type} ventilation exchanges heat with ambient air rather than refrigerating it`, () => {
    const equal = component(type, { ambientTemperature: 30, initialTemperature: 30 });
    const ventilated = run(equal, 60, () => ({ [actuator]: 1 }));
    assert.ok(
      ventilated.temperature >= 30 - 1e-9,
      'ventilation cannot cool below equal outdoor temperature',
    );

    const hot = component(type, { ambientTemperature: 20, initialTemperature: 40 });
    const open = run(hot, 30, () => ({ [actuator]: 1 }));
    const shut = run(hot, 30, () => ({}));
    assert.ok(open.temperature >= 20);
    assert.ok(open.temperature < shut.temperature, 'cooler ambient air removes heat faster');

    const cold = component(type, { ambientTemperature: 30, initialTemperature: 10 });
    const warmAir = run(cold, 10, () => ({ [actuator]: 1 }));
    const isolated = run(cold, 10, () => ({}));
    assert.ok(
      warmAir.temperature > isolated.temperature,
      'warmer ambient air heats the interior faster',
    );
  });
}

test('fish count changes oxygen, food and cleanliness demand in the fixed-size tank', () => {
  const one = run(component('aquarium', { fishCount: 1 }), 10, () => ({}));
  const eight = run(component('aquarium', { fishCount: 8 }), 10, () => ({}));
  for (const [key, initial] of [
    ['oxygen', 70],
    ['food', 45],
    ['cleanliness', 80],
  ]) {
    assert.ok(eight[key] < one[key], key);
    assert.ok(Math.abs((initial - eight[key]) / (initial - one[key]) - 8) < 1e-8, key);
  }
});

test('life-support feedback has capacity for one to eight fish while reflecting their load', () => {
  for (const fishCount of [1, 4, 8]) {
    const node = component('aquarium', { fishCount });
    const state = run(node, 300, aquariumFeedback);
    assert.equal(state.fish.filter((fish) => fish.alive).length, fishCount);
    assert.equal(state.health, 100);
    assert.equal(state.alarm, false);
  }
});

test('DAY-driven lighting remains healthy when the complete day/night cycle changes', () => {
  for (const dayLength of [10, 60, 600]) {
    const node = component('aquarium', { dayLength });
    const state = run(node, dayLength * 2, aquariumFeedback);
    assert.equal(state.health, 100, `dayLength=${dayLength}`);
    assert.equal(state.alarm, false, `dayLength=${dayLength}`);
    assert.equal(state.fish.filter((fish) => fish.alive).length, 4);
  }
});

test('continuous light becomes harmful after 1.5 configured cycles while ordinary darkness restores rest', () => {
  for (const dayLength of [10, 60, 600]) {
    const node = component('aquarium', { dayLength });
    const lit = (o) => ({ ...aquariumFeedback(o), light: 1 });
    const rested = run(node, dayLength, lit);
    assert.equal(rested.health, 100);
    const stressed = run(node, dayLength * 1.5 + 5, lit);
    assert.ok(stressed.health < 100 && stressed.health > 0, `dayLength=${dayLength}`);
    const dark = advanceAutomation(node, stressed, { light: 0, run: 1 }, dayLength);
    assert.equal(dark.lightExposure, 0);
  }
});
