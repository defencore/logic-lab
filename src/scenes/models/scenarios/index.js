import { AUTOMATION_TYPES, advanceAutomation, evaluateAutomation } from '../automation/index.js';
import {
  parameters,
  controls,
  uncertain,
  flag,
  isScenarioType,
  scenarioParameterError,
} from './config.js';
import { initialScenarioState } from './state.js';
import { finite as numeric, positive } from '../../common/numbers.js';
import {
  JUNCTION,
  RAILWAY,
  trainAtTurnout,
  trainReservesSection,
  crossingClear,
} from '../../transport/geometry.js';
import { railFault, advanceRailway } from './railway.js';
import { advanceTraffic } from './traffic.js';
import { advanceFeeder, advanceTank } from './resources.js';
export {
  SCENARIO_TYPES,
  SCENARIO_DEFAULTS,
  SCENARIO_INPUT_DEFAULTS,
  isScenarioType,
  scenarioParameterError,
} from './config.js';
export { initialScenarioState } from './state.js';

/** Advance scene mechanics once per physics call, never during logic settling. */
export function advanceScenario(node, state, inputs, dt) {
  if (AUTOMATION_TYPES.includes(node.type)) return advanceAutomation(node, state, inputs, dt);
  if (!isScenarioType(node.type)) return state;
  if (node.enabled === false) return state;
  const c = controls(node.type, inputs),
    p = parameters(node);
  if (c.reset === 1) return initialScenarioState(node);
  const next = structuredClone(state || initialScenarioState(node));
  const parameterError = scenarioParameterError(node);
  if (parameterError) {
    next.uncertain = true;
    next.failure ||= 'invalid_parameters';
    return next;
  }
  next.uncertain = uncertain(c);
  if (node.type === 'traffic_light') {
    next.lamps = c;
    return next;
  }
  if (node.type === 'traffic_junction')
    next.lights = Object.fromEntries(
      ['ns_green', 'ns_yellow', 'ew_green', 'ew_yellow'].map((key) => [key, c[key]]),
    );
  if (node.type === 'railway' && !next.uncertain) {
    const changedEnds = [c.points !== next.points, c.exit_points !== next.exitPoints];
    for (const train of next.trains)
      if (changedEnds.some((changed, end) => changed && trainAtTurnout(train, end))) {
        railFault(next, 'points_under_train');
        train.derailed = true;
        train.speed = 0;
        train.stopped = true;
      }
    next.points = c.points;
    next.exitPoints = c.exit_points;
    next.barrierTarget = c.barrier;
    next.signals = { a: c.signal_a, b: c.signal_b };
  }
  if (node.type === 'animal_feeder') {
    next.refilling = false;
    if (!next.uncertain && c.run === 1 && c.refill === 1 && next.lastRefill === 0) {
      next.hopper = positive(p.hopperCapacity, 500);
      next.refilling = true;
    }
    next.lastRefill = c.refill;
    next.dispensing = !next.uncertain && c.run === 1 && c.dispense === 1 && next.hopper > 1e-9;
    next.animal.eating = !next.uncertain && c.run === 1 && (next.bowl > 1e-9 || next.dispensing);
  }
  if (node.type === 'water_tank') {
    next.pumping = !next.uncertain && c.run === 1 && c.pump === 1;
    next.draining = !next.uncertain && c.run === 1 && c.drain === 1 && next.level > 0;
  }
  if (next.uncertain || c.run === 0) {
    if (node.type === 'railway')
      for (const train of next.trains) {
        train.speed = 0;
        train.stopped = true;
      }
    return next;
  }
  const duration = Math.max(0, numeric(dt));
  const speed =
    node.type === 'traffic_junction'
      ? Math.max(1, numeric(p.carSpeed, 12))
      : node.type === 'railway'
        ? Math.max(1, c.throttle / 3.6)
        : 1;
  const count = Math.min(10_000, Math.max(1, Math.ceil(duration / Math.min(0.01, 0.25 / speed))));
  const step = duration / count;
  for (let index = 0; index < count && step > 0; index++) {
    next.time += step;
    if (node.type === 'traffic_junction') advanceTraffic(next, c, p, step);
    if (node.type === 'railway') advanceRailway(next, c, p, step);
    if (node.type === 'animal_feeder') advanceFeeder(next, c, p, step);
    if (node.type === 'water_tank') advanceTank(next, c, p, step);
  }
  return next;
}

export function evaluateScenario(node, state, inputs) {
  if (AUTOMATION_TYPES.includes(node.type)) return evaluateAutomation(node, state, inputs);
  if (!isScenarioType(node.type)) return undefined;
  const s = state || initialScenarioState(node),
    c = controls(node.type, inputs),
    p = parameters(node);
  if (scenarioParameterError(node)) {
    const ports = {
      traffic_junction: ['ns_wait', 'ew_wait', 'crash', 'passed'],
      railway: [
        'approach_a',
        'approach_b',
        'occupied',
        'fault',
        'speed',
        'passed',
        'gate_closed',
        'crossing_clear',
        'cars_wait',
        'points_state',
        'exit_points_state',
      ],
      animal_feeder: ['hungry', 'full', 'empty', 'alarm', 'level', 'hopper', 'fed'],
      water_tank: ['low', 'high', 'overflow', 'level'],
    };
    return Object.fromEntries(ports[node.type].map((id) => [id, 'X']));
  }
  switch (node.type) {
    case 'traffic_light': {
      if (uncertain(c)) return { valid: 'X', go: 'X' };
      const valid = Number(c.green ? !c.red && !c.yellow : c.red || c.yellow);
      return { valid, go: valid && c.green ? 1 : 0 };
    }
    case 'traffic_junction':
      return {
        ns_wait: Number(
          s.cars.some(
            (car) =>
              car.axis === 'ns' && car.stopped && car.position <= JUNCTION.stopPosition + 1e-9,
          ),
        ),
        ew_wait: Number(
          s.cars.some(
            (car) =>
              car.axis === 'ew' && car.stopped && car.position <= JUNCTION.stopPosition + 1e-9,
          ),
        ),
        crash: flag(s.crash, c),
        passed: s.passed & 255,
      };
    case 'railway':
      return {
        approach_a: Number(
          s.trains.some(
            (train) => train.track === 'a' && train.position >= -100 && train.position <= 0,
          ),
        ),
        approach_b: Number(
          s.trains.some(
            (train) => train.track === 'b' && train.position >= -100 && train.position <= 0,
          ),
        ),
        occupied: Number(s.trains.some(trainReservesSection)),
        fault: flag(s.fault, c),
        speed: uncertain(c) ? 'X' : Math.max(...s.trains.map((train) => train.speed)),
        passed: s.passed & 255,
        points_state: s.points,
        exit_points_state: s.exitPoints,
        gate_closed: Number(s.barrier >= 1 - 1e-9),
        crossing_clear: Number(crossingClear(s.roadCars || [])),
        cars_wait: Number(
          (s.roadCars || []).some(
            (car) => car.stopped && !car.crashed && car.position <= RAILWAY.roadStopPosition + 1e-9,
          ),
        ),
      };
    case 'animal_feeder':
      return {
        hungry: Number(s.bowl <= numeric(p.hungryThreshold, 20)),
        full: Number(s.bowl >= numeric(p.fullThreshold, 60)),
        empty: Number(s.hopper <= 1e-9),
        alarm: flag(s.alarm, c),
        level: s.bowl,
        hopper: s.hopper,
        fed: s.fed & 255,
      };
    case 'water_tank':
      return {
        low: Number(s.level <= numeric(p.lowThreshold, 20)),
        high: Number(s.level >= numeric(p.highThreshold, 80)),
        overflow: flag(s.overflow, c),
        level: s.level,
      };
  }
}
