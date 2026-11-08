export const TAU = Math.PI * 2;
export const unknown = (value) => typeof value !== 'number' || !Number.isFinite(value);
export const logic = (value) => (unknown(value) ? 'X' : Number(value !== 0));
export const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
export const number = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
export const complement = (value) => (unknown(value) ? 'X' : 1 - logic(value));
export const valueOr = (value, fallback) =>
  value === 'Z' || value === undefined ? fallback : value;
export const active = (value, fallback = 0) => logic(valueOr(value, fallback)) === 1;
export const allKnown = (...values) => values.every((value) => !unknown(value));
/** Resolve strong drivers first; weak pull resistors only apply to a released net. */
export function resolveDrivers(drivers) {
  const driven = drivers.filter((driver) => driver.value !== 'Z' && driver.value !== undefined);
  if (!driven.length) return 'Z';
  const strong = driven.filter((driver) => !driver.weak);
  const selected = strong.length ? strong : driven;
  const first = selected[0].value;
  return selected.every((driver) => driver.value === first) ? first : 'X';
}

export function packBits(bits) {
  if (bits.every((value) => value === 'Z')) return 'Z';
  if (bits.some(unknown)) return 'X';
  return bits.reduce((value, bit, index) => value | (logic(bit) << index), 0);
}

export function signalValues(signals, contacts) {
  return Object.fromEntries(
    signals.map((signal) => [
      signal.id,
      signal.width === 1
        ? (contacts[signal.id] ?? 'Z')
        : packBits(
            Array.from(
              { length: signal.width },
              (_, index) => contacts[`${signal.id}${index}`] ?? 'Z',
            ),
          ),
    ]),
  );
}
