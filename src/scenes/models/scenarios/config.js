import {
  AUTOMATION_TYPES,
  AUTOMATION_DEFAULTS,
  AUTOMATION_INPUT_DEFAULTS,
  automationParameterError,
} from '../automation/index.js';
import { clamp } from '../../common/numbers.js';

export const SCENARIO_TYPES = Object.freeze([
  ...AUTOMATION_TYPES,
  'traffic_light',
  'traffic_junction',
  'railway',
  'animal_feeder',
  'water_tank',
]);

export const SCENARIO_DEFAULTS = Object.freeze({
  ...AUTOMATION_DEFAULTS,
  traffic_light: Object.freeze({}),
  traffic_junction: Object.freeze({ carSpeed: 12, arrivalInterval: 4, initialCars: 2 }),
  railway: Object.freeze({ initialA: -48, initialB: -85, speedLimit: 60 }),
  animal_feeder: Object.freeze({
    hopperCapacity: 500,
    bowlCapacity: 100,
    initialHopper: 300,
    initialLevel: 10,
    dispenseRate: 25,
    eatRate: 4,
    hungryThreshold: 20,
    fullThreshold: 60,
    alarmThreshold: 90,
    portionSize: 40,
  }),
  water_tank: Object.freeze({
    capacity: 100,
    initialLevel: 35,
    pumpRate: 12,
    drainRate: 4,
    lowThreshold: 20,
    highThreshold: 80,
  }),
});

export const SCENARIO_INPUT_DEFAULTS = Object.freeze({
  ...AUTOMATION_INPUT_DEFAULTS,
  traffic_light: Object.freeze({ red: 0, yellow: 0, green: 0 }),
  traffic_junction: Object.freeze({
    ns_green: 0,
    ns_yellow: 0,
    ew_green: 0,
    ew_yellow: 0,
    run: 1,
    reset: 0,
  }),
  railway: Object.freeze({
    signal_a: 0,
    signal_b: 0,
    points: 0,
    exit_points: 0,
    barrier: 0,
    throttle: 30,
    run: 1,
    reset: 0,
  }),
  animal_feeder: Object.freeze({ dispense: 0, refill: 0, run: 1, reset: 0 }),
  water_tank: Object.freeze({ pump: 0, drain: 1, run: 1, reset: 0 }),
});

export const parameters = (node) => ({ ...SCENARIO_DEFAULTS[node.type], ...node.params });
export const isScenarioType = (type) => SCENARIO_TYPES.includes(type);

export function scenarioParameterError(node) {
  if (AUTOMATION_TYPES.includes(node.type)) return automationParameterError(node);
  const p = parameters(node);
  const finite = (...keys) =>
    keys.every((key) => typeof p[key] === 'number' && Number.isFinite(p[key]));
  if (
    node.type === 'traffic_junction' &&
    (!finite('carSpeed', 'arrivalInterval', 'initialCars') ||
      p.carSpeed <= 0 ||
      p.arrivalInterval <= 0 ||
      !Number.isInteger(p.initialCars) ||
      p.initialCars < 0 ||
      p.initialCars > 8)
  )
    return 'Car speed and arrival interval must be positive; Initial cars must be an integer from 0 to 8.';
  if (
    node.type === 'railway' &&
    (!finite('initialA', 'initialB', 'speedLimit') ||
      p.speedLimit <= 0 ||
      p.initialA < -200 ||
      p.initialA > 95 ||
      p.initialB < -200 ||
      p.initialB > 95)
  )
    return 'Speed limit must be positive and initial train positions must be between -200 and 95 meters.';
  if (
    node.type === 'animal_feeder' &&
    (!finite(...Object.keys(SCENARIO_DEFAULTS.animal_feeder)) ||
      p.hopperCapacity <= 0 ||
      p.bowlCapacity <= 0 ||
      p.dispenseRate <= 0 ||
      p.eatRate <= 0 ||
      p.portionSize <= 0 ||
      p.initialHopper < 0 ||
      p.initialHopper > p.hopperCapacity ||
      p.initialLevel < 0 ||
      p.initialLevel > p.bowlCapacity ||
      p.hungryThreshold < 0 ||
      p.hungryThreshold >= p.fullThreshold ||
      p.fullThreshold > p.alarmThreshold ||
      p.alarmThreshold > p.bowlCapacity)
  )
    return 'Feeder rates and capacities must be positive; initial quantities must fit, and 0 ≤ Hungry < Full ≤ Alarm ≤ Bowl capacity.';
  if (
    node.type === 'water_tank' &&
    (!finite(...Object.keys(SCENARIO_DEFAULTS.water_tank)) ||
      p.capacity <= 0 ||
      p.pumpRate <= 0 ||
      p.drainRate <= 0 ||
      p.initialLevel < 0 ||
      p.initialLevel > 100 ||
      p.lowThreshold < 0 ||
      p.lowThreshold >= p.highThreshold ||
      p.highThreshold > 100)
  )
    return 'Tank capacity and rates must be positive; Initial level must be 0–100%, and 0 ≤ Low < High ≤ 100.';
  return null;
}

export function controls(type, inputs = {}) {
  const result = Object.fromEntries(
    Object.entries(SCENARIO_INPUT_DEFAULTS[type] || {}).map(([id, fallback]) => {
      const value = inputs[id] === 'Z' || inputs[id] === undefined ? fallback : inputs[id];
      return [
        id,
        typeof value !== 'number' || !Number.isFinite(value)
          ? 'X'
          : id === 'throttle'
            ? clamp(value, 0, 255)
            : Number(value !== 0),
      ];
    }),
  );
  // An unwired far turnout is intentionally ganged to the near turnout.
  if (type === 'railway' && (inputs.exit_points === 'Z' || inputs.exit_points === undefined))
    result.exit_points = result.points;
  return result;
}

export const uncertain = (control) => Object.values(control).some((value) => value === 'X');
export const flag = (latched, control) => (latched ? 1 : uncertain(control) ? 'X' : 0);
