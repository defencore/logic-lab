import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOMATION_TYPES,
  AUTOMATION_DEFAULTS,
  AUTOMATION_INPUT_DEFAULTS,
  initialAutomationState,
  advanceAutomation,
  evaluateAutomation,
  automationParameterError,
} from '../../../src/scenes/models/automation/index.js';

const node = (type, params = {}) => ({ id: 'world', type, enabled: true, params });
function run(
  component,
  duration,
  controller,
  dt = 0.05,
  initial = initialAutomationState(component),
) {
  let state = initial;
  for (let time = 0; time < duration - 1e-9; time += dt) {
    const outputs = evaluateAutomation(component, state, {});
    state = advanceAutomation(
      component,
      state,
      controller(outputs, state),
      Math.min(dt, duration - time),
    );
  }
  return state;
}
const aquariumSafe = (o) => ({
  heater: o.cold,
  cooler: o.hot,
  aerator: o.low_oxygen,
  feed: o.hungry,
  filter: o.dirty,
  light: o.day,
});
const greenhouseSafe = (o) => ({ heater: o.cold, vent: o.hot, pump: o.dry, grow_light: o.dark });
const homeSafe = (o) => ({
  heater: o.cold,
  fan: o.hot,
  indoor_light: o.dark,
  outdoor_light: Number(o.dark && o.motion),
  gate: o.motion,
  sprinkler: Number(!o.rain && !o.tank_low),
});

test('three automation worlds hold healthy closed-loop operation for five minutes through repeated day/night cycles', () => {
  const aquarium = node('aquarium'),
    tank = run(aquarium, 300, aquariumSafe);
  const fish = evaluateAutomation(aquarium, tank, {});
  assert.equal(fish.alive, 4);
  assert.equal(fish.health, 100);
  assert.equal(fish.alarm, 0);
  assert.ok(fish.temperature >= 21.8 && fish.temperature < 24.1);
  assert.ok(fish.oxygen >= 54.8 && fish.oxygen <= 70);
  assert.ok(fish.food >= 34.8 && fish.food <= 45);
  assert.ok(fish.cleanliness >= 44.8 && fish.cleanliness <= 80);
  const greenhouse = node('greenhouse'),
    garden = run(greenhouse, 300, greenhouseSafe);
  assert.equal(garden.health, 100);
  assert.equal(garden.alarm, false);
  assert.ok(garden.growth > 60);
  const house = node('smart_home'),
    home = run(house, 300, homeSafe);
  assert.equal(home.alarm, false);
  assert.ok(home.temperature >= 18.8 && home.temperature <= 20.1);
  assert.ok(home.water >= 14.8 && home.water <= 100);
  assert.ok(home.energy > 0 && home.energy < 0.2);
});

test('aquarium damage is gradual, visible and causal; dead fish remain dead until reset', () => {
  for (const [reason, params, actuator] of [
    ['cold', { initialTemperature: 15, ambientTemperature: 15 }, {}],
    ['heat', { initialTemperature: 24 }, { heater: 1 }],
    ['oxygen', { initialOxygen: 10 }, {}],
    ['overfed', { initialFood: 95 }, { feed: 1 }],
    ['starved', { initialFood: 0 }, {}],
    ['dirty', { initialCleanliness: 5 }, {}],
    ['light', {}, { light: 1 }],
  ]) {
    const component = node('aquarium', params);
    const controller = (o) => ({
      ...aquariumSafe(o),
      ...actuator,
      ...(reason === 'cold' ? { heater: 0 } : {}),
      ...(reason === 'heat' ? { cooler: 0 } : {}),
      ...(reason === 'oxygen' ? { aerator: 0, water_change: 0 } : {}),
      ...(reason === 'starved' ? { feed: 0 } : {}),
      ...(reason === 'dirty' ? { filter: 0, water_change: 0 } : {}),
    });
    const early = run(component, 1, controller);
    assert.equal(early.fish.filter((fish) => fish.alive).length, 4, reason);
    assert.ok(early.health > 0, reason);
    const failed = run(component, 300, controller);
    assert.equal(failed.fish.filter((fish) => fish.alive).length, 0, reason);
    assert.equal(failed.failure, reason);
    assert.equal(failed.alarm, true);
    const recoveredConditions = run(component, 30, aquariumSafe, 0.05, failed);
    assert.equal(recoveredConditions.fish.filter((fish) => fish.alive).length, 0);
    const reset = advanceAutomation(component, failed, { reset: 1 }, 1);
    assert.equal(reset.fish.filter((fish) => fish.alive).length, 4);
    assert.equal(reset.health, 100);
    assert.equal(reset.failure, null);
  }
});

test('actuators control actual aquarium quantities and daylight exposure rather than decorative flags', () => {
  const component = node('aquarium');
  const idle = run(component, 5, () => ({}));
  const powered = run(component, 5, () => ({
    heater: 1,
    aerator: 1,
    feed: 1,
    filter: 1,
    light: 1,
  }));
  assert.ok(powered.temperature > idle.temperature + 7);
  assert.ok(powered.oxygen > idle.oxygen + 15);
  assert.ok(powered.food > idle.food + 30);
  assert.ok(powered.cleanliness > idle.cleanliness + 10);
  assert.ok(Math.abs(powered.lightExposure - 5) < 1e-9);
  assert.equal(evaluateAutomation(component, { ...powered, time: 35 }, {}).day, 0);
  const darkness = advanceAutomation(component, powered, { light: 0 }, 1);
  assert.ok(darkness.lightExposure < powered.lightExposure);
});

test('greenhouse flooding and drought reduce health; wet/dry sensor hysteresis can prevent either', () => {
  const component = node('greenhouse');
  const flooded = run(component, 100, (o) => ({ ...greenhouseSafe(o), pump: 1 }));
  assert.equal(flooded.moisture, 100);
  assert.equal(flooded.failure, 'flood');
  assert.ok(flooded.health < 60);
  const drought = run(component, 300, (o) => ({ ...greenhouseSafe(o), pump: 0 }));
  assert.equal(drought.failure, 'drought');
  assert.ok(drought.health < 60);
  let watering = 0;
  const safe = run(component, 300, (o) => {
    if (o.dry) watering = 1;
    if (o.wet) watering = 0;
    return { ...greenhouseSafe(o), pump: watering };
  });
  assert.equal(safe.health, 100);
  assert.equal(safe.alarm, false);
  assert.ok(safe.moisture >= 34.8 && safe.moisture < 75.5);
});

test('house sensors follow environment, gate takes travel time and water/energy respond to controls', () => {
  const component = node('smart_home');
  const initial = initialAutomationState(component);
  const partial = advanceAutomation(component, initial, { gate: 1 }, 1);
  assert.ok(partial.gate > 0.39 && partial.gate < 0.41);
  assert.equal(evaluateAutomation(component, partial, {}).gate_open, 0);
  const open = advanceAutomation(component, partial, { gate: 1 }, 2);
  assert.equal(evaluateAutomation(component, open, {}).gate_open, 1);
  const closed = advanceAutomation(component, open, { gate: 0 }, 3);
  assert.equal(closed.gate, 0);
  const night = evaluateAutomation(component, { ...initial, time: 41 }, {});
  assert.equal(night.dark, 1);
  assert.equal(night.motion, 1);
  assert.equal(night.rain, 0);
  assert.equal(evaluateAutomation(component, { ...initial, time: 24 }, {}).rain, 1);
  const alarm = advanceAutomation(component, { ...initial, time: 8 }, { alarm_arm: 1 }, 0.1);
  assert.equal(evaluateAutomation(component, alarm, { alarm_arm: 1 }).alarm, 1);
  const disarmed = advanceAutomation(component, alarm, { alarm_arm: 0, run: 0 }, 0);
  assert.equal(disarmed.alarmActive, false);
  assert.equal(evaluateAutomation(component, disarmed, { alarm_arm: 0 }).alarm, 0);
  const dryComponent = node('smart_home', { initialWater: 1, dayLength: 3600 });
  const dry = run(dryComponent, 5, () => ({ sprinkler: 1 }));
  assert.equal(dry.water, 0);
  assert.equal(dry.failure, 'empty_tank');
  const reset = advanceAutomation(dryComponent, dry, { reset: 1 }, 0);
  assert.equal(reset.alarm, false);
  assert.equal(reset.water, 1);
  const energy = advanceAutomation(component, initial, { heater: 1 }, 60);
  assert.ok(Math.abs(energy.energy - 2 / 60) < 1e-9);
});

test('automation worlds freeze on pause, unknown controls and disabled components without replaying wall time', () => {
  for (const type of AUTOMATION_TYPES) {
    const component = node(type),
      initial = initialAutomationState(component);
    const paused = advanceAutomation(component, initial, { run: 0 }, 100);
    assert.equal(paused.time, 0);
    const actuator = Object.keys(AUTOMATION_INPUT_DEFAULTS[type])[0];
    const unknown = advanceAutomation(component, initial, { [actuator]: 'X' }, 10);
    assert.equal(unknown.time, 0);
    assert.equal(unknown.uncertain, true);
    const measured = evaluateAutomation(component, unknown, { [actuator]: 'X' });
    assert.equal(measured.alarm, 'X');
    for (const [port, value] of Object.entries(evaluateAutomation(component, initial, {})))
      if (port !== 'alarm') assert.equal(measured[port], value, `${type}: measured ${port}`);
    assert.equal(
      evaluateAutomation(component, { ...unknown, alarm: true }, { [actuator]: 'X' }).alarm,
      1,
    );
    const recovered = advanceAutomation(component, unknown, { [actuator]: 0 }, 1);
    assert.ok(Math.abs(recovered.time - 1) < 1e-9);
    assert.equal(recovered.uncertain, false);
    assert.equal(advanceAutomation({ ...component, enabled: false }, initial, {}, 10), initial);
    assert.equal(advanceAutomation(component, initial, {}, 0).time, 0);
    assert.deepEqual(
      evaluateAutomation(component, initial, { [actuator]: 'Z' }),
      evaluateAutomation(component, initial, {}),
    );
  }
});

test('world integration is independent of public step subdivision and rejects invalid laboratory parameters', () => {
  for (const type of AUTOMATION_TYPES) {
    const component = node(type),
      initial = initialAutomationState(component),
      control = Object.fromEntries(
        Object.keys(AUTOMATION_INPUT_DEFAULTS[type]).map((key) => [key, key === 'run' ? 1 : 0]),
      );
    const coarse = advanceAutomation(component, initial, control, 10);
    let fine = initial;
    for (let index = 0; index < 500; index++)
      fine = advanceAutomation(component, fine, control, 0.02);
    for (const key of [
      'time',
      'temperature',
      'oxygen',
      'food',
      'cleanliness',
      'health',
      'moisture',
      'growth',
      'water',
      'energy',
      'gate',
    ])
      if (typeof coarse[key] === 'number')
        assert.ok(Math.abs(coarse[key] - fine[key]) < 1e-8, `${type}: ${key}`);
    for (const [key] of Object.entries(AUTOMATION_DEFAULTS[type])) {
      const invalid = node(type, { [key]: NaN });
      assert.ok(automationParameterError(invalid));
      assert.ok(
        Object.values(evaluateAutomation(invalid, initial, {})).every((value) => value === 'X'),
      );
    }
    assert.ok(automationParameterError(node(type, { dayLength: 0 })));
  }
  assert.ok(automationParameterError(node('aquarium', { fishCount: 2.5 })));
  assert.ok(automationParameterError(node('greenhouse', { initialMoisture: 101 })));
});
