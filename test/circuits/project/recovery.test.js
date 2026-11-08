import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProject, serializeProject, validateProject } from '../../../src/circuits/project.js';
import {
  createProjectStorage,
  STORAGE_KEY,
  PROJECT_RECOVERY_KEY,
} from '../../../src/circuits/project-storage.js';

const node = (id, type, params = {}) => ({ id, type, params, x: 0, y: 0, enabled: true });
const legacyProject = () => ({
  version: 1,
  name: 'Original custom servo work',
  nodes: [
    node('pwm', 'pwm', { frequency: 105, duty: 0.5 }),
    node('motor', 'servo', { minDuty: 0.18, maxDuty: 0.82, range: 180 }),
  ],
  wires: [
    {
      id: 'signal',
      from: { node: 'pwm', port: 'duty' },
      to: { node: 'motor', port: 's1' },
      width: 1,
    },
  ],
});
const freshProject = () => ({ version: 1, name: 'Current work', nodes: [], wires: [] });
function fixture() {
  const data = new Map();
  let deniedKey = null;
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (key === deniedKey) throw new Error('Storage full');
      data.set(key, value);
    },
  };
  const create = () =>
    createProjectStorage({
      parse: parseProject,
      serialize: serializeProject,
      getStorage: () => storage,
    });
  return {
    data,
    create,
    deny: (key) => {
      deniedKey = key;
    },
  };
}

test('obsolete servo parameters are rejected explicitly before their analog wire is validated', () => {
  const old = legacyProject();
  assert.throws(() => validateProject(old), /obsolete servo duty-ratio.*digital PWM.*microseconds/);
  assert.throws(() => parseProject(JSON.stringify(old)), /obsolete servo duty-ratio/);
  assert.throws(() => serializeProject({ ...old, wires: [] }), /obsolete servo duty-ratio/);
});

test('an unreadable stored project is preserved byte for byte and cannot be replaced by fallback autosave', () => {
  const { data, create } = fixture();
  const raw = '\n' + JSON.stringify(legacyProject(), null, 4) + '\n';
  data.set(STORAGE_KEY, raw);
  const project = create();
  assert.equal(project.load(), null);
  assert.equal(project.recovery().raw, raw);
  assert.equal(project.recovery().backedUp, true);
  assert.equal(project.recovery().handled, false);
  assert.equal(project.save(freshProject()), false);
  assert.equal(data.get(STORAGE_KEY), raw);
  assert.equal(JSON.parse(data.get(PROJECT_RECOVERY_KEY)).raw, raw);
});

test('explicit recovery acknowledgement permits new work while retaining the original backup', () => {
  const { data, create } = fixture();
  const raw = JSON.stringify(legacyProject());
  data.set(STORAGE_KEY, raw);
  const project = create();
  project.load();
  assert.equal(project.acknowledgeRecovery(raw), true);
  assert.equal(project.save(freshProject()), true);
  assert.equal(JSON.parse(data.get(STORAGE_KEY)).name, 'Current work');
  assert.equal(project.recovery().raw, raw);
  assert.equal(project.recovery().handled, true);
});

test('an unhandled recovery warning and its exact original survive a new application instance', () => {
  const { data, create } = fixture();
  const raw = '{ invalid JSON with useful original text';
  data.set(STORAGE_KEY, raw);
  create().load();
  const reopened = create();
  assert.equal(reopened.load(), null);
  assert.equal(reopened.recovery().raw, raw);
  assert.equal(reopened.recovery().handled, false);
  assert.equal(reopened.save(freshProject()), false);
  assert.equal(data.get(STORAGE_KEY), raw);
});

test('failed backup persistence blocks acknowledgement and every attempted original overwrite', () => {
  const { data, create, deny } = fixture();
  const raw = JSON.stringify(legacyProject());
  data.set(STORAGE_KEY, raw);
  deny(PROJECT_RECOVERY_KEY);
  const project = create();
  assert.equal(project.load(), null);
  assert.equal(project.recovery().raw, raw);
  assert.equal(project.recovery().backedUp, false);
  assert.equal(project.acknowledgeRecovery(raw), false);
  assert.equal(project.save(freshProject()), false);
  assert.equal(data.get(STORAGE_KEY), raw);
});

test('backup acknowledgement must itself persist before automatic saving can resume', () => {
  const { data, create, deny } = fixture();
  const raw = JSON.stringify(legacyProject());
  data.set(STORAGE_KEY, raw);
  const project = create();
  project.load();
  deny(PROJECT_RECOVERY_KEY);
  assert.equal(project.acknowledgeRecovery(raw), false);
  assert.equal(project.save(freshProject()), false);
  assert.equal(data.get(STORAGE_KEY), raw);
});

test('an older pending backup is handled before a different unreadable original can replace it', () => {
  const { data, create } = fixture();
  const first = JSON.stringify(legacyProject());
  data.set(STORAGE_KEY, first);
  const project = create();
  project.load();
  const second = JSON.stringify({ ...legacyProject(), name: 'Another original' });
  data.set(STORAGE_KEY, second);
  assert.equal(project.recovery().raw, first);
  assert.equal(project.save(freshProject()), false);
  assert.equal(project.acknowledgeRecovery(first), true);
  assert.equal(project.recovery().raw, second);
  assert.equal(project.recovery().handled, false);
  assert.equal(project.save(freshProject()), false);
  assert.equal(data.get(STORAGE_KEY), second);
  assert.equal(project.acknowledgeRecovery(second), true);
  assert.equal(project.save(freshProject()), true);
});

test('valid current projects load unchanged without a recovery record', () => {
  const { data, create } = fixture();
  const original = freshProject();
  data.set(STORAGE_KEY, serializeProject(original));
  const project = create();
  assert.deepEqual(project.load(), original);
  assert.equal(project.recovery(), null);
  assert.equal(data.has(PROJECT_RECOVERY_KEY), false);
});
