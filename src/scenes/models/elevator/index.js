import {
  ELEVATOR_OUTPUTS,
  FLOOR_MIN,
  FLOOR_MAX,
  FLOORS,
  parameters,
  elevatorControls,
  elevatorParameterError,
  floorAt,
} from './config.js';
import { initialElevatorState } from './state.js';
export {
  ELEVATOR_DEFAULTS,
  ELEVATOR_INPUT_DEFAULTS,
  FLOOR_ZONE,
  FLOOR_MIN,
  FLOOR_MAX,
  FLOOR_COUNT,
  FLOORS,
  elevatorParameterError,
} from './config.js';
export { initialElevatorState } from './state.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const uncertain = (controls) => Object.values(controls).includes('X');
function faultReason(state, c) {
  if (c.up && c.down) return 'drive_conflict';
  if (c.open && c.close) return 'door_conflict';
  if ((c.up || c.down) && (state.door > 1e-9 || c.open)) return 'motion_with_open_door';
  if (c.open && floorAt(state.position) === null) return 'open_between_floors';
  return null;
}
function moving(state, c) {
  return Number(
    !state.fault &&
      !uncertain(c) &&
      c.run === 1 &&
      c.reset === 0 &&
      state.door <= 1e-9 &&
      !c.open &&
      ((c.up === 1 && c.down === 0 && state.position < FLOOR_MAX) ||
        (c.down === 1 && c.up === 0 && state.position > FLOOR_MIN)),
  );
}

/** Physical plant only: requests, dispatch, stopping and dwell belong to the external circuit. */
export function advanceElevator(node, state, inputs, dt) {
  if (node.enabled === false) return state;
  const c = elevatorControls(inputs);
  if (c.reset === 1) return initialElevatorState(node);
  const next = structuredClone(state || initialElevatorState(node));
  next.controls = c;
  next.moving = 0;
  const invalid = elevatorParameterError(node);
  next.uncertain = !!invalid || uncertain(c);
  if (invalid) {
    next.failure ||= 'invalid_parameters';
    return next;
  }
  if (next.uncertain || c.run === 0 || next.fault) return next;
  const reason = faultReason(next, c);
  if (reason) {
    next.fault = true;
    next.failure = reason;
    return next;
  }
  const p = parameters(node);
  const duration = typeof dt === 'number' && Number.isFinite(dt) ? Math.max(0, dt) : 0;
  next.time += duration;
  next.moving = moving(next, c);
  if (next.moving)
    next.position = clamp(
      next.position + (c.up - c.down) * p.travelSpeed * duration,
      FLOOR_MIN,
      FLOOR_MAX,
    );
  next.door = clamp(next.door + (c.open - c.close) * p.doorSpeed * duration, 0, 1);
  next.moving = moving(next, c);
  return next;
}

export function evaluateElevator(node, state, inputs) {
  if (node.enabled === false) return Object.fromEntries(ELEVATOR_OUTPUTS.map((id) => [id, 'Z']));
  if (elevatorParameterError(node))
    return Object.fromEntries(ELEVATOR_OUTPUTS.map((id) => [id, 'X']));
  const s = state || initialElevatorState(node),
    c = elevatorControls(inputs);
  const floor = floorAt(s.position),
    unknown = uncertain(c);
  return {
    ...Object.fromEntries(FLOORS.map((number) => [`floor${number}`, Number(floor === number)])),
    door_open: Number(s.door >= 1 - 1e-9),
    door_closed: Number(s.door <= 1e-9),
    moving: c.reset === 1 || s.fault ? 0 : unknown ? 'X' : moving(s, c),
    fault: s.fault ? 1 : unknown ? 'X' : 0,
    position: s.position,
    door_position: s.door,
  };
}
