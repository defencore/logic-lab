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

const OUTPUTS = Object.freeze({
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

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const parameters = (node) => ({ ...AUTOMATION_DEFAULTS[node.type], ...node.params });

function controls(type, inputs = {}) {
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

export function initialAutomationState(node) {
  const p = parameters(node);
  const state = {
    kind: node.type,
    time: 0,
    uncertain: false,
    failure: null,
    alarm: false,
    temperature: finite(p.initialTemperature, 20),
    controls: { ...AUTOMATION_INPUT_DEFAULTS[node.type] },
  };
  if (node.type === 'aquarium')
    return {
      ...state,
      oxygen: clamp(finite(p.initialOxygen, 70), 0, 100),
      food: clamp(finite(p.initialFood, 45), 0, 100),
      cleanliness: clamp(finite(p.initialCleanliness, 80), 0, 100),
      health: 100,
      lightExposure: 0,
      fish: Array.from({ length: clamp(Math.round(finite(p.fishCount, 4)), 1, 8) }, (_, index) => ({
        id: index + 1,
        alive: true,
        health: 100,
        deadAt: null,
      })),
    };
  if (node.type === 'greenhouse')
    return {
      ...state,
      moisture: clamp(finite(p.initialMoisture, 45), 0, 100),
      growth: 15,
      health: 100,
      darkExposure: 0,
    };
  if (node.type === 'smart_home')
    return {
      ...state,
      water: clamp(finite(p.initialWater, 70), 0, 100),
      energy: 0,
      gate: 0,
      alarmActive: false,
      dryPump: false,
    };
  return undefined;
}

function environment(state, p) {
  const phase = (state.time % p.dayLength) / p.dayLength;
  return {
    day: phase < 0.5,
    motion: (phase > 0.12 && phase < 0.22) || (phase > 0.66 && phase < 0.78),
    rain: phase > 0.35 && phase < 0.48,
  };
}

function aquariumStep(s, c, p, dt) {
  const live = s.fish.filter((fish) => fish.alive).length;
  const inhabitants = live / Math.max(1, p.fishCount);
  s.temperature = clamp(
    s.temperature +
      ((p.ambientTemperature - s.temperature) * 0.035 +
        c.heater * 1.8 -
        c.cooler * 1.9 +
        c.light * 0.03) *
        dt,
    -20,
    80,
  );
  s.oxygen = clamp(
    s.oxygen +
      (c.aerator * 4.5 + c.water_change * 1.2 - 0.65 * inhabitants - (s.food > 85 ? 0.5 : 0)) * dt,
    0,
    100,
  );
  s.food = clamp(s.food + (c.feed * 8 - 1.1 * inhabitants) * dt, 0, 100);
  s.cleanliness = clamp(
    s.cleanliness +
      (c.filter * 3 + c.water_change * 5 - 0.28 * inhabitants - Math.max(0, s.food - 65) * 0.015) *
        dt,
    0,
    100,
  );
  s.lightExposure = c.light ? s.lightExposure + dt : Math.max(0, s.lightExposure - dt * 4);
  const risks = [
    ['cold', s.temperature < 20 ? (20 - s.temperature) * 0.7 + 0.2 : 0],
    ['heat', s.temperature > 30 ? (s.temperature - 30) * 0.8 + 0.2 : 0],
    ['oxygen', s.oxygen < 25 ? (25 - s.oxygen) * 0.12 + 0.2 : 0],
    ['overfed', s.food > 85 ? (s.food - 85) * 0.12 + 0.2 : 0],
    ['starved', s.food < 8 ? (8 - s.food) * 0.15 + 0.2 : 0],
    ['dirty', s.cleanliness < 25 ? (25 - s.cleanliness) * 0.12 + 0.2 : 0],
    ['light', s.lightExposure > 90 ? 0.7 : 0],
  ];
  const danger = risks.reduce((best, risk) => (risk[1] > best[1] ? risk : best), ['', 0]);
  for (let index = 0; index < s.fish.length; index++) {
    const fish = s.fish[index];
    if (!fish.alive) continue;
    fish.health = clamp(
      fish.health + (danger[1] > 0 ? -danger[1] * (1 + index * 0.07) : 0.45) * dt,
      0,
      100,
    );
    if (fish.health < 60) {
      s.alarm = true;
      s.failure ||= danger[0] || null;
    }
    if (fish.health <= 0) {
      fish.alive = false;
      fish.deadAt = s.time;
      s.failure ||= danger[0] || 'oxygen';
      s.alarm = true;
    }
  }
  s.health = s.fish.reduce((sum, fish) => sum + fish.health, 0) / s.fish.length;
}

function greenhouseStep(s, c, p, dt) {
  const { day } = environment(s, p);
  s.temperature = clamp(
    s.temperature +
      ((p.ambientTemperature - s.temperature) * 0.035 +
        (day ? 0.22 : 0) +
        c.heater * 1.6 -
        c.vent * 1.5) *
        dt,
    -20,
    80,
  );
  s.moisture = clamp(
    s.moisture + (c.pump * 5 - (day ? 0.55 : 0.3) - (c.vent ? 0.2 : 0)) * dt,
    0,
    100,
  );
  const lit = day || c.grow_light === 1;
  s.darkExposure = lit ? Math.max(0, s.darkExposure - dt * 3) : s.darkExposure + dt;
  const risks = [
    ['cold', s.temperature < 12 ? (12 - s.temperature) * 0.15 + 0.1 : 0],
    ['heat', s.temperature > 36 ? (s.temperature - 36) * 0.2 + 0.1 : 0],
    ['drought', s.moisture < 12 ? (12 - s.moisture) * 0.1 + 0.15 : 0],
    ['flood', s.moisture > 88 ? (s.moisture - 88) * 0.12 + 0.15 : 0],
    ['dark', s.darkExposure > 50 ? 0.5 : 0],
  ];
  const danger = risks.reduce((best, risk) => (risk[1] > best[1] ? risk : best), ['', 0]);
  s.health = clamp(s.health + (danger[1] > 0 ? -danger[1] : 0.2) * dt, 0, 100);
  if (s.health < 60) {
    s.alarm = true;
    s.failure ||= danger[0];
  }
  if (
    lit &&
    s.temperature >= 16 &&
    s.temperature <= 30 &&
    s.moisture >= 20 &&
    s.moisture <= 80 &&
    s.health > 0
  )
    s.growth = clamp(s.growth + 0.18 * (s.health / 100) * dt, 0, 100);
}

function homeStep(s, c, p, dt) {
  const env = environment(s, p);
  s.temperature = clamp(
    s.temperature +
      ((p.ambientTemperature - s.temperature) * 0.025 + c.heater * 1.2 - c.fan * 1.1) * dt,
    -20,
    80,
  );
  const requested = c.sprinkler === 1;
  s.water = clamp(
    s.water + ((env.rain ? 4 : 0) - (requested && s.water > 0 ? 0.7 : 0)) * dt,
    0,
    100,
  );
  s.gate = clamp(s.gate + (c.gate ? 0.4 : -0.4) * dt, 0, 1);
  s.energy +=
    ((c.heater * 2 +
      c.fan * 0.4 +
      c.indoor_light * 0.08 +
      c.outdoor_light * 0.06 +
      (requested ? 0.12 : 0)) *
      dt) /
    3600;
  s.alarmActive = c.alarm_arm === 1 && env.motion && s.gate < 0.95;
  s.dryPump = requested && s.water <= 0;
  if (s.dryPump) {
    s.alarm = true;
    s.failure ||= 'empty_tank';
  }
}

/** Educational accelerated-world mechanics; one model second is one simulation second. */
export function advanceAutomation(node, state, inputs, dt) {
  if (!AUTOMATION_TYPES.includes(node.type) || node.enabled === false) return state;
  const c = controls(node.type, inputs),
    p = parameters(node);
  if (c.reset === 1) return initialAutomationState(node);
  const next = structuredClone(state || initialAutomationState(node));
  const parameterError = automationParameterError(node);
  next.uncertain = !!parameterError || Object.values(c).includes('X');
  if (parameterError) next.failure ||= 'invalid_parameters';
  if (next.uncertain) return next;
  next.controls = c;
  if (node.type === 'smart_home') {
    const env = environment(next, p);
    next.alarmActive = c.alarm_arm === 1 && env.motion && next.gate < 0.95;
  }
  if (c.run === 0) return next;
  const duration = Math.max(0, finite(dt));
  const count = Math.min(100000, Math.max(1, Math.ceil(duration / 0.02))),
    step = duration / count;
  const advance = { aquarium: aquariumStep, greenhouse: greenhouseStep, smart_home: homeStep }[
    node.type
  ];
  for (let index = 0; index < count && step > 0; index++) {
    next.time += step;
    advance(next, c, p, step);
  }
  return next;
}

export function evaluateAutomation(node, state, inputs) {
  if (!AUTOMATION_TYPES.includes(node.type)) return undefined;
  const s = state || initialAutomationState(node),
    c = controls(node.type, inputs),
    p = parameters(node);
  if (automationParameterError(node))
    return Object.fromEntries(OUTPUTS[node.type].map((key) => [key, 'X']));
  const env = environment(s, p),
    uncertain = Object.values(c).includes('X');
  // Measurements remain known while undefined commands freeze the physical world.
  const alarm = (active) => (active ? 1 : uncertain ? 'X' : 0);
  if (node.type === 'aquarium')
    return {
      cold: Number(s.temperature < 22),
      hot: Number(s.temperature > 28),
      low_oxygen: Number(s.oxygen < 55),
      hungry: Number(s.food < 35),
      dirty: Number(s.cleanliness < 45),
      day: Number(env.day),
      alarm: alarm(s.alarm),
      alive: s.fish.filter((fish) => fish.alive).length,
      temperature: s.temperature,
      oxygen: s.oxygen,
      food: s.food,
      cleanliness: s.cleanliness,
      health: s.health,
    };
  if (node.type === 'greenhouse')
    return {
      cold: Number(s.temperature < 18),
      hot: Number(s.temperature > 28),
      dry: Number(s.moisture < 35),
      wet: Number(s.moisture > 75),
      dark: Number(!env.day),
      day: Number(env.day),
      alarm: alarm(s.alarm),
      temperature: s.temperature,
      moisture: s.moisture,
      growth: s.growth,
      health: s.health,
    };
  return {
    cold: Number(s.temperature < 19),
    hot: Number(s.temperature > 25),
    dark: Number(!env.day),
    motion: Number(env.motion),
    rain: Number(env.rain),
    tank_low: Number(s.water < 15),
    gate_open: Number(s.gate >= 1 - 1e-9),
    alarm: alarm(s.alarm || (c.alarm_arm === 1 && env.motion && s.gate < 0.95)),
    temperature: s.temperature,
    water: s.water,
    energy: s.energy,
  };
}
