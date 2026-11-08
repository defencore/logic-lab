import { ELEVATOR_INPUT_DEFAULTS, FLOOR_MIN, FLOOR_MAX, parameters } from './config.js';

export function initialElevatorState(node) {
  const p = parameters(node);
  return {
    kind: 'elevator',
    time: 0,
    position:
      Number.isInteger(p.initialFloor) && p.initialFloor >= FLOOR_MIN && p.initialFloor <= FLOOR_MAX
        ? p.initialFloor
        : FLOOR_MIN,
    door: Number.isFinite(p.initialDoor) ? Math.max(0, Math.min(1, p.initialDoor)) : 0,
    moving: 0,
    fault: false,
    failure: null,
    uncertain: false,
    controls: { ...ELEVATOR_INPUT_DEFAULTS },
  };
}
