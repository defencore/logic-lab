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
const trainIn = (train, low, high) => train.position >= low && train.position - 12 <= high;

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

function advanceTraffic(state, c, p, dt) {
  if (state.crash) return;
  const speed = Math.max(0, numeric(p.carSpeed, 12));
  for (const axis of ['ns', 'ew']) {
    const green = c[`${axis}_green`] === 1 && c[`${axis}_yellow`] === 0;
    const lane = state.cars
      .filter((car) => car.axis === axis)
      .sort((a, b) => b.position - a.position);
    let ahead = Infinity;
    for (const car of lane) {
      const old = car.position;
      const stop = !green && old <= -12 + 1e-9 ? -12 : Infinity;
      car.position = Math.min(old + speed * dt, stop, ahead - 7);
      car.stopped = car.position - old < 1e-9;
      ahead = car.position;
    }
    state.spawn[axis] += dt;
    const interval = positive(p.arrivalInterval, 4);
    const arrivals = Math.floor((state.spawn[axis] + 1e-10) / interval);
    if (arrivals > 0) {
      state.spawn[axis] = Math.max(0, state.spawn[axis] - arrivals * interval);
      const tail = lane.at(-1)?.position ?? Infinity;
      if (lane.length < 12 && tail > -58) {
        const car = {
          id: `car-${state.nextId++}`,
          axis,
          position: -65,
          stopped: false,
          crashed: false,
        };
        state.cars.push(car);
        lane.push(car);
      }
    }
  }
  const ns = state.cars.filter((car) => car.axis === 'ns' && Math.abs(car.position) <= 5);
  const ew = state.cars.filter((car) => car.axis === 'ew' && Math.abs(car.position) <= 5);
  if (ns.length && ew.length) {
    state.crash = true;
    state.failure = 'collision';
    for (const car of [...ns, ...ew]) car.crashed = true;
    for (const car of state.cars) car.stopped = true;
  }
  const departed = state.cars.filter((car) => car.position > 55);
  state.passed += departed.length;
  state.cars = state.cars.filter((car) => car.position <= 55);
}

function railFault(state, reason) {
  if (!state.faults.includes(reason)) state.faults.push(reason);
  state.fault = true;
  if (!state.failure) state.failure = reason;
}

function advanceRailway(state, c, p, dt) {
  const speedLimit = Math.max(0, numeric(p.speedLimit, 60));
  for (const train of state.trains) {
    if (train.crashed || train.derailed) {
      train.speed = 0;
      train.stopped = true;
      continue;
    }
    const old = train.position;
    const stop = c[`signal_${train.track}`] === 0 && old <= -16 + 1e-9 ? -16 : Infinity;
    train.position = Math.min(old + (c.throttle / 3.6) * dt, stop);
    train.speed = train.position - old > 1e-10 ? c.throttle : 0;
    train.stopped = train.speed === 0;
    if (old < 0 && train.position >= 0 && c.points !== Number(train.track === 'b')) {
      railFault(state, 'wrong_route');
      train.derailed = true;
      train.speed = 0;
      train.stopped = true;
    }
    if (train.speed > speedLimit) {
      railFault(state, 'overspeed');
      if (trainIn(train, -4, 12)) {
        train.derailed = true;
        train.speed = 0;
        train.stopped = true;
      }
    }
    if (c.barrier === 0 && trainIn(train, 12, 24)) {
      railFault(state, 'open_barrier');
      train.crashed = true;
      train.speed = 0;
      train.stopped = true;
    }
  }
  const [a, b] = state.trains;
  if (trainIn(a, 0, 35) && trainIn(b, 0, 35)) {
    const aLow = Math.max(0, a.position - 12),
      aHigh = Math.min(35, a.position);
    const bLow = Math.max(0, 35 - b.position),
      bHigh = Math.min(35, 47 - b.position);
    if (Math.max(aLow, bLow) <= Math.min(aHigh, bHigh)) {
      railFault(state, 'collision');
      for (const train of state.trains) {
        train.crashed = true;
        train.speed = 0;
        train.stopped = true;
      }
    }
  }
  for (const train of state.trains)
    if (!train.crashed && !train.derailed && train.position > 95) {
      train.position = -110 + (train.position - 95);
      state.passed++;
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
        if (trainIn(train, -4, 12)) {
          railFault(next, 'points_under_train');
          train.derailed = true;
          train.speed = 0;
          train.stopped = true;
        }
    next.points = c.points;
    next.barrier = c.barrier;
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
  const count = Math.min(10_000, Math.max(1, Math.ceil(duration / Math.min(0.02, 1 / speed))));
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
      railway: ['approach_a', 'approach_b', 'occupied', 'fault', 'speed', 'passed'],
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
          s.cars.some((car) => car.axis === 'ns' && car.stopped && car.position <= -12 + 1e-9),
        ),
        ew_wait: Number(
          s.cars.some((car) => car.axis === 'ew' && car.stopped && car.position <= -12 + 1e-9),
        ),
        crash: flag(s.crash, c),
        passed: s.passed & 255,
      };
    case 'railway':
      return {
        approach_a: Number(
          s.trains.some(
            (train) => train.track === 'a' && train.position >= -75 && train.position <= 0,
          ),
        ),
        approach_b: Number(
          s.trains.some(
            (train) => train.track === 'b' && train.position >= -75 && train.position <= 0,
          ),
        ),
        occupied: Number(s.trains.some((train) => trainIn(train, 0, 35))),
        fault: flag(s.fault, c),
        speed: uncertain(c) ? 'X' : Math.max(...s.trains.map((train) => train.speed)),
        passed: s.passed & 255,
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
