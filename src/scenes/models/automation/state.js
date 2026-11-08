import { AUTOMATION_INPUT_DEFAULTS, parameters } from './config.js';
import { finite, clamp } from '../../common/numbers.js';

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
