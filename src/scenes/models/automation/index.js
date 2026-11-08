import {
  AUTOMATION_TYPES,
  OUTPUTS,
  parameters,
  controls,
  automationParameterError,
} from './config.js';
import { finite } from '../../common/numbers.js';
import { initialAutomationState } from './state.js';
import { environment } from './environment.js';
import { aquariumStep } from './aquarium.js';
import { greenhouseStep } from './greenhouse.js';
import { homeStep } from './home.js';
export {
  AUTOMATION_TYPES,
  AUTOMATION_DEFAULTS,
  AUTOMATION_INPUT_DEFAULTS,
  automationParameterError,
} from './config.js';
export { initialAutomationState } from './state.js';

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
