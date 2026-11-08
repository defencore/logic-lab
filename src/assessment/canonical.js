export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
// A compact, deterministic graph refinement label. It is deliberately not used for file integrity.
export function labelHash(value) {
  let a = 2166136261,
    b = 5381;
  for (let index = 0; index < value.length; index++) {
    a = Math.imul(a ^ value.charCodeAt(index), 16777619);
    b = Math.imul(b, 33) ^ value.charCodeAt(index);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
export async function digest(value) {
  const bytes = new TextEncoder().encode(stable(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
export const payload = (submission) => {
  const result = { ...submission };
  delete result.integrity;
  return result;
};
export function valuesEqual(a, b) {
  return typeof a === 'number' && typeof b === 'number'
    ? Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b))
    : a === b;
}
export function observationsEqual(a, b) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        Math.abs(entry.at - b[index].at) < 1e-8 &&
        entry.after === b[index].after &&
        entry.values.length === b[index].values.length &&
        entry.values.every((value, bit) => valuesEqual(value, b[index].values[bit])),
    )
  );
}
