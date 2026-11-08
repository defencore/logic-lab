import { fixture } from './fixtures/project.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  validateProject,
  parseProject,
  serializeProject,
  loadProject,
  saveProject,
} from '../../../src/circuits/project.js';

test('local storage handles normal writes, corrupt data, and denied access', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    const data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
      },
    });
    assert.equal(loadProject(), null);
    assert.equal(saveProject(fixture()), true);
    assert.deepEqual(loadProject(), fixture());
    const previous = data.get(STORAGE_KEY);
    assert.equal(saveProject({ ...fixture(), version: 999 }), false);
    assert.equal(
      data.get(STORAGE_KEY),
      previous,
      'An invalid save does not replace the last valid project',
    );
    data.set(STORAGE_KEY, '{ broken');
    assert.equal(loadProject(), null);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage denied');
      },
    });
    assert.equal(loadProject(), null);
    assert.equal(saveProject(fixture()), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
