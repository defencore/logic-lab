import { finite, clamp } from '../../common/numbers.js';

export const TAU = Math.PI * 2;
export const COLORS = {
  x: 0x4c987a,
  y: 0x6d88ad,
  z: 0xb98a52,
  active: 0x2caa72,
  idle: 0x93a29b,
  unknown: 0xd89b3e,
};
/** Convert a physical position to a bounded fraction of the visible rail. */
export function travelRatio(position, minimum = 0, maximum = 200) {
  const lower = finite(minimum);
  const upper = finite(maximum, lower + 200);
  if (upper <= lower) return 0;
  return clamp((finite(position, lower) - lower) / (upper - lower), 0, 1);
}

/** The simulator reports the shaft angle in degrees, including negative turns. */
export function shaftRadians(angle) {
  return ((finite(angle) % 360) * Math.PI) / 180;
}
