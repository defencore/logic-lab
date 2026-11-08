export const FLOOR_ZONE = 0.015;
export const FLOOR_MIN = 1;
export const FLOOR_MAX = 9;
export const FLOOR_COUNT = FLOOR_MAX - FLOOR_MIN + 1;
export const FLOORS = Object.freeze(
  Array.from({ length: FLOOR_COUNT }, (_, index) => index + FLOOR_MIN),
);
export const ELEVATOR_DEFAULTS = Object.freeze({
  initialFloor: FLOOR_MIN,
  initialDoor: 0,
  travelSpeed: 0.5,
  doorSpeed: 1,
});
export const ELEVATOR_INPUT_DEFAULTS = Object.freeze({
  up: 0,
  down: 0,
  open: 0,
  close: 0,
  run: 1,
  reset: 0,
});
export const ELEVATOR_OUTPUTS = Object.freeze([
  ...FLOORS.map((floor) => `floor${floor}`),
  'door_open',
  'door_closed',
  'moving',
  'fault',
  'position',
  'door_position',
]);
export const parameters = (node) => ({ ...ELEVATOR_DEFAULTS, ...node.params });
export const floorAt = (position) => {
  const floor = Math.round(position);
  return floor >= FLOOR_MIN && floor <= FLOOR_MAX && Math.abs(position - floor) <= FLOOR_ZONE + 1e-9
    ? floor
    : null;
};
export function elevatorParameterError(node) {
  const p = parameters(node);
  if (
    !Object.keys(ELEVATOR_DEFAULTS).every(
      (key) => typeof p[key] === 'number' && Number.isFinite(p[key]),
    ) ||
    !Number.isInteger(p.initialFloor) ||
    p.initialFloor < FLOOR_MIN ||
    p.initialFloor > FLOOR_MAX ||
    p.initialDoor < 0 ||
    p.initialDoor > 1 ||
    p.travelSpeed <= 0 ||
    p.travelSpeed > 4 ||
    p.doorSpeed <= 0 ||
    p.doorSpeed > 10
  )
    return 'Initial floor must be an integer from 1 to 9; Initial door must be 0–1; Travel speed must be >0 and ≤4 floors/s; Door speed must be >0 and ≤10 per second.';
  return null;
}
export function elevatorControls(inputs = {}) {
  return Object.fromEntries(
    Object.entries(ELEVATOR_INPUT_DEFAULTS).map(([key, fallback]) => {
      const value = inputs[key] === undefined || inputs[key] === 'Z' ? fallback : inputs[key];
      return [key, value === 0 || value === 1 ? value : 'X'];
    }),
  );
}
