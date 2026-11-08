export const finite = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
export const clamp = (value, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, value));
export const positive = (value, fallback) => Math.max(0.000001, finite(value, fallback));
export const active = (value) => value === true || value === 1;
