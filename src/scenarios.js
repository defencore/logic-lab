import {
  JUNCTION,
  RAILWAY,
  carFootprint,
  trainFootprint,
  overlaps,
  contactPoint,
  trainReservesSection,
  trainInTurnout,
  trainAtEntryTurnout,
  crossingClear,
} from './transport-geometry.js';

export const SCENARIO_TYPES = Object.freeze([
  'traffic_light',
  'traffic_junction',
  'railway',
  'animal_feeder',
  'water_tank',
]);

export const SCENARIO_DEFAULTS = Object.freeze({
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
    barrier: 0,
    throttle: 30,
    run: 1,
    reset: 0,
  }),
  animal_feeder: Object.freeze({ dispense: 0, refill: 0, run: 1, reset: 0 }),
  water_tank: Object.freeze({ pump: 0, drain: 1, run: 1, reset: 0 }),
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const numeric = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const positive = (value, fallback) => Math.max(0.000001, numeric(value, fallback));
const parameters = (node) => ({ ...SCENARIO_DEFAULTS[node.type], ...node.params });
export const isScenarioType = (type) => SCENARIO_TYPES.includes(type);

export function scenarioParameterError(node) {
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

function controls(type, inputs = {}) {
  return Object.fromEntries(
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
}

const uncertain = (control) => Object.values(control).some((value) => value === 'X');
const flag = (latched, control) => (latched ? 1 : uncertain(control) ? 'X' : 0);

export function initialScenarioState(node) {
  const p = parameters(node);
  const base = { kind: node.type, time: 0, uncertain: false, failure: null };
  switch (node.type) {
    case 'traffic_light':
      return { ...base, lamps: { red: 0, yellow: 0, green: 0 } };
    case 'traffic_junction': {
      const count = clamp(Math.round(numeric(p.initialCars, 2)), 0, 8);
      return {
        ...base,
        cars: ['ns', 'ew'].flatMap((axis, direction) =>
          Array.from({ length: count }, (_, index) => ({
            id: `car-${direction * count + index + 1}`,
            axis,
            position: -28 - index * 12,
            stopped: false,
            crashed: false,
          })),
        ),
        spawn: { ns: 0, ew: positive(p.arrivalInterval, 4) / 2 },
        nextId: count * 2 + 1,
        passed: 0,
        crash: false,
        collisionPoint: null,
        collisionPair: null,
        lights: { ns_green: 0, ns_yellow: 0, ew_green: 0, ew_yellow: 0 },
      };
    }
    case 'railway':
      return {
        ...base,
        trains: [
          {
            id: 'train-a',
            track: 'a',
            position: clamp(numeric(p.initialA, -48), -200, 95),
            speed: 0,
            stopped: true,
            crashed: false,
            derailed: false,
          },
          {
            id: 'train-b',
            track: 'b',
            position: clamp(numeric(p.initialB, -85), -200, 95),
            speed: 0,
            stopped: true,
            crashed: false,
            derailed: false,
          },
        ],
        points: 0,
        barrier: 0,
        barrierTarget: 0,
        roadCars: [
          {
            id: 'road-a',
            direction: 1,
            position: -55,
            speed: RAILWAY.roadSpeed,
            stopped: false,
            crashed: false,
          },
          {
            id: 'road-b',
            direction: -1,
            position: -90,
            speed: RAILWAY.roadSpeed,
            stopped: false,
            crashed: false,
          },
        ],
        roadPassed: 0,
        collisionPoint: null,
        collisionPair: null,
        signals: { a: 0, b: 0 },
        passed: 0,
        fault: false,
        faults: [],
      };
    case 'animal_feeder':
      return {
        ...base,
        hopper: clamp(numeric(p.initialHopper, 300), 0, positive(p.hopperCapacity, 500)),
        bowl: clamp(numeric(p.initialLevel, 10), 0, positive(p.bowlCapacity, 100)),
        eaten: 0,
        spilled: 0,
        alarm: false,
        fed: 0,
        animal: {
          phase: 0,
          eating: false,
          hungry: numeric(p.initialLevel, 10) <= numeric(p.hungryThreshold, 20),
        },
        dispensing: false,
        refilling: false,
        lastRefill: 0,
      };
    case 'water_tank':
      return {
        ...base,
        level: clamp(numeric(p.initialLevel, 35), 0, 100),
        spilled: 0,
        overflow: false,
        pumping: false,
        draining: false,
      };
    default:
      return undefined;
  }
}

function collisionFraction(a, b, old, shapeA, shapeB) {
  const at = (vehicle, fraction) => ({
    ...vehicle,
    position:
      (old.get(vehicle) ?? vehicle.position) +
      (vehicle.position - (old.get(vehicle) ?? vehicle.position)) * fraction,
  });
  if (overlaps(shapeA(at(a, 0)), shapeB(at(b, 0)))) return 0;
  if (!overlaps(shapeA(a), shapeB(b))) return null;
  let low = 0,
    high = 1;
  for (let index = 0; index < 24; index++) {
    const middle = (low + high) / 2;
    if (overlaps(shapeA(at(a, middle)), shapeB(at(b, middle)))) high = middle;
    else low = middle;
  }
  return high;
}

function stopAtContact(a, b, old, fraction, shapeA, shapeB) {
  for (const vehicle of [a, b]) {
    const start = old.get(vehicle) ?? vehicle.position;
    vehicle.position = start + (vehicle.position - start) * fraction;
    vehicle.crashed = true;
    vehicle.stopped = true;
    vehicle.speed = 0;
  }
  return contactPoint(shapeA(a), shapeB(b));
}

function advanceTraffic(state, c, p, dt) {
  if (state.crash) return;
  const speed = Math.max(0, numeric(p.carSpeed, 12));
  const old = new Map(state.cars.map((car) => [car, car.position]));
  for (const axis of ['ns', 'ew']) {
    const green = c[`${axis}_green`] === 1 && c[`${axis}_yellow`] === 0;
    const lane = state.cars
      .filter((car) => car.axis === axis)
      .sort((a, b) => b.position - a.position);
    let ahead = Infinity;
    for (const car of lane) {
      const old = car.position;
      const stop = !green && old <= JUNCTION.stopPosition + 1e-9 ? JUNCTION.stopPosition : Infinity;
      car.position = Math.max(old, Math.min(old + speed * dt, stop, ahead - JUNCTION.queueHeadway));
      car.stopped = car.position - old < 1e-9;
      ahead = car.position;
    }
    state.spawn[axis] += dt;
    const interval = positive(p.arrivalInterval, 4);
    const arrivals = Math.floor((state.spawn[axis] + 1e-10) / interval);
    if (arrivals > 0) {
      state.spawn[axis] = Math.max(0, state.spawn[axis] - arrivals * interval);
      const tail = lane.at(-1)?.position ?? Infinity;
      if (lane.length < 12 && tail >= JUNCTION.spawnPosition + JUNCTION.queueHeadway) {
        const car = {
          id: `car-${state.nextId++}`,
          axis,
          position: JUNCTION.spawnPosition,
          stopped: false,
          crashed: false,
        };
        state.cars.push(car);
        lane.push(car);
      }
    }
  }
  let first = null;
  for (let a = 0; a < state.cars.length; a++)
    for (let b = a + 1; b < state.cars.length; b++) {
      const one = state.cars[a],
        two = state.cars[b];
      const fraction = collisionFraction(one, two, old, carFootprint, carFootprint);
      if (fraction !== null && (!first || fraction < first.fraction))
        first = { one, two, fraction };
    }
  if (first) {
    state.crash = true;
    state.failure = 'collision';
    for (const car of state.cars)
      if (old.has(car))
        car.position = old.get(car) + (car.position - old.get(car)) * first.fraction;
    first.one.crashed = true;
    first.two.crashed = true;
    state.collisionPoint = contactPoint(carFootprint(first.one), carFootprint(first.two));
    state.collisionPair = [first.one.id, first.two.id];
    for (const car of state.cars) car.stopped = true;
  }
  const departed = state.cars.filter((car) => car.position > JUNCTION.exitPosition);
  state.passed += departed.length;
  state.cars = state.cars.filter((car) => car.position <= JUNCTION.exitPosition);
}

function railFault(state, reason) {
  if (!state.faults.includes(reason)) state.faults.push(reason);
  state.fault = true;
  if (!state.failure) state.failure = reason;
}

function advanceRailway(state, c, p, dt) {
  const speedLimit = Math.max(0, numeric(p.speedLimit, 60));
  state.roadCars ??= [];
  const old = new Map(
    [...state.trains, ...state.roadCars].map((vehicle) => [vehicle, vehicle.position]),
  );
  // A closing request stops new entrants immediately, while cars already inside clear.
  for (const direction of [1, -1]) {
    const lane = state.roadCars
      .filter((car) => car.direction === direction)
      .sort((a, b) => b.position - a.position);
    let ahead = Infinity;
    for (const car of lane) {
      if (car.crashed) {
        car.speed = 0;
        car.stopped = true;
        ahead = car.position;
        continue;
      }
      const stop =
        (c.barrier === 1 || state.barrier > 1e-9) && car.position <= RAILWAY.roadStopPosition + 1e-9
          ? RAILWAY.roadStopPosition
          : Infinity;
      const before = car.position;
      car.position = Math.max(
        before,
        Math.min(before + RAILWAY.roadSpeed * dt, stop, ahead - JUNCTION.queueHeadway),
      );
      car.stopped = car.position - before < 1e-10;
      car.speed = car.stopped ? 0 : RAILWAY.roadSpeed;
      ahead = car.position;
    }
  }
  state.barrierTarget = c.barrier;
  if (c.barrier === 0) state.barrier = Math.max(0, state.barrier - RAILWAY.barrierRate * dt);
  else if (crossingClear(state.roadCars))
    state.barrier = Math.min(1, state.barrier + RAILWAY.barrierRate * dt);
  for (const train of state.trains) {
    if (train.crashed || train.derailed) {
      train.speed = 0;
      train.stopped = true;
      continue;
    }
    const old = train.position;
    const stop =
      c[`signal_${train.track}`] === 0 && old <= RAILWAY.stopPosition + 1e-9
        ? RAILWAY.stopPosition
        : Infinity;
    train.position = Math.min(old + (c.throttle / 3.6) * dt, stop);
    train.speed = train.position - old > 1e-10 ? c.throttle : 0;
    train.stopped = train.speed === 0;
    if (c.points !== Number(train.track === 'b') && trainAtEntryTurnout(train)) {
      railFault(state, 'wrong_route');
      train.derailed = true;
      train.speed = 0;
      train.stopped = true;
    }
    if (train.speed > speedLimit) {
      railFault(state, 'overspeed');
      if (trainInTurnout(train)) {
        train.derailed = true;
        train.speed = 0;
        train.stopped = true;
      }
    }
  }
  const roadShape = (car) => carFootprint(car, 'railway');
  const contacts = [];
  for (let a = 0; a < state.trains.length; a++) {
    for (let b = a + 1; b < state.trains.length; b++) {
      const fraction = collisionFraction(
        state.trains[a],
        state.trains[b],
        old,
        trainFootprint,
        trainFootprint,
      );
      if (fraction !== null)
        contacts.push({
          a: state.trains[a],
          b: state.trains[b],
          fraction,
          shapeA: trainFootprint,
          shapeB: trainFootprint,
          reason: 'collision',
        });
    }
    for (const car of state.roadCars) {
      const fraction = collisionFraction(state.trains[a], car, old, trainFootprint, roadShape);
      if (fraction !== null)
        contacts.push({
          a: state.trains[a],
          b: car,
          fraction,
          shapeA: trainFootprint,
          shapeB: roadShape,
          reason: 'open_barrier',
        });
    }
  }
  const impacted = new Set();
  for (const contact of contacts.sort((a, b) => a.fraction - b.fraction)) {
    if (impacted.has(contact.a) || impacted.has(contact.b)) continue;
    if (contact.a.crashed && contact.b.crashed) continue;
    railFault(state, contact.reason);
    const point = stopAtContact(
      contact.a,
      contact.b,
      old,
      contact.fraction,
      contact.shapeA,
      contact.shapeB,
    );
    state.collisionPoint ||= point;
    state.collisionPair ||= [contact.a.id, contact.b.id];
    impacted.add(contact.a);
    impacted.add(contact.b);
  }
  for (const train of state.trains)
    if (!train.crashed && !train.derailed && train.position > 95) {
      train.position = -110 + (train.position - 95);
      state.passed++;
    }
  for (const car of state.roadCars)
    if (!car.crashed && car.position > RAILWAY.roadExitPosition) {
      const lane = state.roadCars.filter(
        (other) => other !== car && other.direction === car.direction,
      );
      if (
        lane.every((other) => other.position >= RAILWAY.roadEntryPosition + JUNCTION.queueHeadway)
      ) {
        car.position =
          RAILWAY.roadEntryPosition +
          Math.min(car.position - RAILWAY.roadExitPosition, RAILWAY.roadSpeed * dt);
        state.roadPassed = (state.roadPassed || 0) + 1;
      } else {
        car.position = RAILWAY.roadExitPosition + 0.001;
        car.speed = 0;
        car.stopped = true;
      }
    }
}

function advanceFeeder(state, c, p, dt) {
  const capacity = positive(p.bowlCapacity, 100);
  const dispenseRate = c.dispense === 1 ? Math.max(0, numeric(p.dispenseRate, 25)) : 0;
  const eatingRate = Math.max(0, numeric(p.eatRate, 4));
  const feedingTime = dispenseRate > 0 ? Math.min(dt, state.hopper / dispenseRate) : 0;
  const dispensed = dispenseRate * feedingTime;
  state.hopper = Math.max(0, state.hopper - dispensed);
  let eaten = 0;
  for (const [duration, incomingRate] of [
    [feedingTime, dispenseRate],
    [dt - feedingTime, 0],
  ]) {
    if (duration <= 0) continue;
    const before = state.bowl;
    const consumed = Math.min(eatingRate * duration, before + incomingRate * duration);
    const rawLevel = before + incomingRate * duration - consumed;
    const spill = Math.max(0, rawLevel - capacity);
    state.bowl = clamp(rawLevel, 0, capacity);
    state.spilled += spill;
    eaten += consumed;
    if (Math.max(before, state.bowl) > numeric(p.alarmThreshold, 90)) {
      state.alarm = true;
      state.failure ||= 'overfed';
    }
    if (spill > 0) {
      state.alarm = true;
      state.failure ||= 'spill';
    }
  }
  state.eaten += eaten;
  state.fed = Math.floor((state.eaten + 1e-9) / positive(p.portionSize, 40));
  state.dispensing = c.dispense === 1 && state.hopper > 1e-9;
  state.animal = {
    phase: state.time % 1,
    eating: state.bowl > 1e-9 || state.dispensing,
    hungry: state.bowl <= numeric(p.hungryThreshold, 20),
  };
}

function advanceTank(state, c, p, dt) {
  const capacity = positive(p.capacity, 100);
  const input = c.pump === 1 ? Math.max(0, numeric(p.pumpRate, 12)) : 0;
  const output = c.drain === 1 ? Math.max(0, numeric(p.drainRate, 4)) : 0;
  const volume = (state.level / 100) * capacity + (input - output) * dt;
  const spill = Math.max(0, volume - capacity);
  state.spilled += spill;
  state.level = clamp((volume / capacity) * 100, 0, 100);
  state.overflow ||= spill > 1e-10;
  if (state.overflow) state.failure = 'overflow';
  state.pumping = input > 0;
  state.draining = output > 0 && state.level > 0;
}

/** Advance scene mechanics once per physics call, never during logic settling. */
export function advanceScenario(node, state, inputs, dt) {
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
    if (c.points !== next.points)
      for (const train of next.trains)
        if (trainInTurnout(train)) {
          railFault(next, 'points_under_train');
          train.derailed = true;
          train.speed = 0;
          train.stopped = true;
        }
    next.points = c.points;
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
      ],
      animal_feeder: ['hungry', 'full', 'empty', 'alarm', 'level', 'hopper', 'fed'],
      water_tank: ['low', 'high', 'overflow', 'level'],
    };
    return Object.fromEntries(ports[node.type].map((id) => [id, 'X']));
  }
  switch (node.type) {
    case 'traffic_light': {
      if (uncertain(c)) return { valid: 'X', go: 'X' };
      const valid = Number(c.red + c.yellow + c.green === 1);
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
