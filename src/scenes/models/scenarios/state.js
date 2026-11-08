import { AUTOMATION_TYPES, initialAutomationState } from '../automation/index.js';
import { parameters } from './config.js';
import { finite as numeric, clamp, positive } from '../../common/numbers.js';
import { RAILWAY } from '../../transport/geometry.js';
import { initialElevatorState } from '../elevator/index.js';

export function initialScenarioState(node) {
  if (node.type === 'elevator') return initialElevatorState(node);
  if (AUTOMATION_TYPES.includes(node.type)) return initialAutomationState(node);
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
        exitPoints: 0,
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
