export const STORAGE_KEY = 'logic-lab.project.v1';
export const PROJECT_RECOVERY_KEY = 'logic-lab.project.recovery.v1';

/** Keep original bytes outside the working slot until the user handles the recovery. */
export function createStoredRecovery({ getStorage, backupKey, kind }) {
  function read() {
    try {
      const value = JSON.parse(getStorage()?.getItem(backupKey) || 'null');
      if (!value || typeof value.raw !== 'string' || typeof value.reason !== 'string') return null;
      return { ...value, kind, backupKey, backedUp: true, handled: value.handled === true };
    } catch {
      return null;
    }
  }
  function preserve(raw, reason) {
    const previous = read();
    if (previous?.raw === raw) return previous;
    if (previous && !previous.handled) return previous;
    const record = { raw, reason, kind, handled: false };
    try {
      const storage = getStorage();
      if (!storage) throw new Error('Browser storage is unavailable.');
      storage.setItem(backupKey, JSON.stringify(record));
      // Verify the backup before permitting the original working slot to change.
      const saved = read();
      if (saved?.raw !== raw) throw new Error('The original backup could not be verified.');
      return saved;
    } catch {
      return { ...record, backupKey, backedUp: false };
    }
  }
  function acknowledge(raw) {
    const current = read();
    if (!current || (raw !== undefined && current.raw !== raw)) return false;
    try {
      getStorage().setItem(backupKey, JSON.stringify({ ...current, handled: true }));
      return read()?.handled === true;
    } catch {
      return false;
    }
  }
  return { read, preserve, acknowledge };
}

export function createProjectStorage({
  parse,
  serialize,
  getStorage = () => globalThis.localStorage,
}) {
  const recovery = createStoredRecovery({
    getStorage,
    backupKey: PROJECT_RECOVERY_KEY,
    kind: 'project',
  });
  function current() {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (!raw) return { project: null, issue: null };
    try {
      return { project: parse(raw), issue: null };
    } catch (error) {
      return { project: null, issue: { raw, reason: error.message } };
    }
  }
  function load() {
    try {
      const value = current();
      if (value.issue) recovery.preserve(value.issue.raw, value.issue.reason);
      return value.project;
    } catch {
      return null;
    }
  }
  function getRecovery() {
    try {
      const value = current();
      if (value.issue) return recovery.preserve(value.issue.raw, value.issue.reason);
      return recovery.read();
    } catch {
      return recovery.read();
    }
  }
  function save(project) {
    try {
      const encoded = serialize(project);
      const storage = getStorage();
      if (!storage) return false;
      const value = current();
      if (value.issue) {
        const original = recovery.preserve(value.issue.raw, value.issue.reason);
        if (!original.backedUp || original.raw !== value.issue.raw || !original.handled)
          return false;
      }
      storage.setItem(STORAGE_KEY, encoded);
      return true;
    } catch {
      return false;
    }
  }
  function acknowledge(raw) {
    const value = getRecovery();
    if (!value?.backedUp || (raw !== undefined && value.raw !== raw)) return false;
    return recovery.acknowledge(value.raw);
  }
  return { load, save, recovery: getRecovery, acknowledgeRecovery: acknowledge };
}
