export const AUTOMATION_TYPES = Object.freeze(['aquarium', 'greenhouse', 'smart_home']);

export const AUTOMATION_DEFAULTS = Object.freeze({
  aquarium: Object.freeze({
    initialTemperature: 24,
    ambientTemperature: 18,
    initialOxygen: 70,
    initialFood: 45,
    initialCleanliness: 80,
    fishCount: 4,
    dayLength: 60,
  }),
  greenhouse: Object.freeze({
    initialTemperature: 20,
    ambientTemperature: 12,
    initialMoisture: 45,
    dayLength: 60,
  }),
  smart_home: Object.freeze({
    initialTemperature: 20,
    ambientTemperature: 12,
    initialWater: 70,
    dayLength: 60,
  }),
});

export const AUTOMATION_INPUT_DEFAULTS = Object.freeze({
  aquarium: Object.freeze({
    heater: 0,
    cooler: 0,
    aerator: 0,
    feed: 0,
    light: 0,
    filter: 0,
    water_change: 0,
    run: 1,
    reset: 0,
  }),
  greenhouse: Object.freeze({ heater: 0, vent: 0, pump: 0, grow_light: 0, run: 1, reset: 0 }),
  smart_home: Object.freeze({
    heater: 0,
    fan: 0,
    indoor_light: 0,
    outdoor_light: 0,
    gate: 0,
    sprinkler: 0,
    alarm_arm: 0,
    run: 1,
    reset: 0,
  }),
});

export const OUTPUTS = Object.freeze({
  aquarium: [
    'cold',
    'hot',
    'low_oxygen',
    'hungry',
    'dirty',
    'day',
    'alarm',
    'alive',
    'temperature',
    'oxygen',
    'food',
    'cleanliness',
    'health',
  ],
  greenhouse: [
    'cold',
    'hot',
    'dry',
    'wet',
    'dark',
    'day',
    'alarm',
    'temperature',
    'moisture',
    'growth',
    'health',
  ],
  smart_home: [
    'cold',
    'hot',
    'dark',
    'motion',
    'rain',
    'tank_low',
    'gate_open',
    'alarm',
    'temperature',
    'water',
    'energy',
  ],
});

export const parameters = (node) => ({ ...AUTOMATION_DEFAULTS[node.type], ...node.params });

export function controls(type, inputs = {}) {
  return Object.fromEntries(
    Object.entries(AUTOMATION_INPUT_DEFAULTS[type]).map(([key, fallback]) => {
      const value = inputs[key] === undefined || inputs[key] === 'Z' ? fallback : inputs[key];
      return [key, typeof value === 'number' && Number.isFinite(value) ? Number(value !== 0) : 'X'];
    }),
  );
}

export function automationParameterError(node) {
  if (!AUTOMATION_TYPES.includes(node.type)) return null;
  const p = parameters(node);
  if (
    !Object.keys(AUTOMATION_DEFAULTS[node.type]).every(
      (key) => typeof p[key] === 'number' && Number.isFinite(p[key]),
    )
  )
    return 'Automation parameters must be finite numbers.';
  if (
    p.initialTemperature < -20 ||
    p.initialTemperature > 80 ||
    p.ambientTemperature < -20 ||
    p.ambientTemperature > 50 ||
    p.dayLength < 10 ||
    p.dayLength > 3600
  )
    return 'Temperatures must be within the laboratory range and Day length must be 10–3600 seconds.';
  const levels =
    node.type === 'aquarium'
      ? ['initialOxygen', 'initialFood', 'initialCleanliness']
      : node.type === 'greenhouse'
        ? ['initialMoisture']
        : ['initialWater'];
  if (levels.some((key) => p[key] < 0 || p[key] > 100))
    return 'Initial percentage levels must be between 0 and 100.';
  if (
    node.type === 'aquarium' &&
    (!Number.isInteger(p.fishCount) || p.fishCount < 1 || p.fishCount > 8)
  )
    return 'Fish count must be an integer from 1 to 8.';
  return null;
}
