export const MAX_FILES = 40;
export const MAX_ISSUED = 200;
export const MAX_JOURNAL = 2000;
export const LIMITATION =
  'Browser files and hashes can be edited. Similarity is a review signal, not proof of copying or identity. Verify understanding with an individual task or discussion.';
export const fail = (message) => {
  throw new Error(message);
};
export function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Checking cancelled.', 'AbortError');
}
export const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const clone = (value) => structuredClone(value);
export const text = (value, label, max = 200) => {
  if (typeof value !== 'string' || value.length > max) fail(`${label} is invalid.`);
  return value;
};
export const object = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object.`);
  return value;
};
export const id = (value) => {
  const result = text(value, 'Identifier', 100);
  if (!/^[A-Za-z0-9_-]+$/.test(result)) fail('Identifier contains unsupported characters.');
  return result;
};
export function studentData(value = {}) {
  object(value, 'Student');
  return {
    name: text(value.name || '', 'Student name', 200),
    id: text(value.id || '', 'Student ID', 100),
    group: text(value.group || '', 'Student group', 100),
  };
}
export function journalData(value) {
  if (!Array.isArray(value) || value.length > MAX_JOURNAL) fail('Invalid construction journal.');
  let previous = 0;
  return value.map((entry) => {
    object(entry, 'Journal entry');
    if (
      !Number.isFinite(entry.at) ||
      entry.at < previous ||
      entry.at > 1e9 ||
      !Number.isInteger(entry.nodes) ||
      entry.nodes < 0 ||
      entry.nodes > 1000 ||
      !Number.isInteger(entry.wires) ||
      entry.wires < 0 ||
      entry.wires > 5000 ||
      !/^[0-9a-f]{16}$/.test(entry.fingerprint)
    )
      fail('Invalid construction journal entry.');
    previous = entry.at;
    return {
      at: entry.at,
      event: text(entry.event, 'Edit label', 100),
      fingerprint: entry.fingerprint,
      nodes: entry.nodes,
      wires: entry.wires,
    };
  });
}
export function observationsData(observations, sequence) {
  if (!Array.isArray(observations) || observations.length > sequence.actions.length + 2)
    fail('Invalid submitted observations.');
  return observations.map((entry) => {
    object(entry, 'Observation');
    if (
      !Number.isFinite(entry.at) ||
      entry.at < 0 ||
      entry.at > sequence.duration + 1e-8 ||
      !Number.isInteger(entry.after) ||
      entry.after < -1 ||
      entry.after > sequence.actions.length ||
      !Array.isArray(entry.values) ||
      entry.values.length !== sequence.probes.length
    )
      fail('Invalid submitted observation.');
    const values = entry.values.map((value) => {
      if (value === 'X' || value === 'Z' || (typeof value === 'number' && Number.isFinite(value)))
        return value;
      fail('Invalid observed value.');
    });
    return { at: entry.at, after: entry.after, values };
  });
}
