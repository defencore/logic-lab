import test from 'node:test';
import assert from 'node:assert/strict';
import { protectUnsavedKeys } from '../../src/application/unload-guard.js';
import { createTeacherWorkspace } from '../../src/classroom/teacher-workspace.js';

function event() {
  return {
    prevented: 0,
    returnValue: 'untouched',
    preventDefault() {
      this.prevented++;
    },
  };
}
function classroom(state) {
  const teacher = createTeacherWorkspace(state);
  return { teacher, api: { shouldWarnBeforeUnload: teacher.hasUnsavedKeys } };
}

test('before-unload protection leaves the native event unchanged when no private key needs saving', () => {
  const e = event();
  assert.equal(protectUnsavedKeys(e), false);
  assert.equal(e.prevented, 0);
  assert.equal(e.returnValue, 'untouched');
  const { api } = classroom({ teacherKey: null, teacherArchives: [] });
  assert.equal(protectUnsavedKeys(e, api), false);
  assert.equal(e.prevented, 0);
});

test('an unsaved current instructor key requests native browser confirmation until its contents are downloaded', () => {
  const state = { teacherKey: { id: 'key', issued: [] }, teacherArchives: [] };
  const { teacher, api } = classroom(state);
  const first = event();
  assert.equal(protectUnsavedKeys(first, api), true);
  assert.equal(first.prevented, 1);
  assert.equal(first.returnValue, '');
  teacher.markKeyDownloaded();
  const saved = event();
  assert.equal(protectUnsavedKeys(saved, api), false);
  assert.equal(saved.prevented, 0);
  state.teacherKey.issued.push({ id: 'new-variant' });
  const registry = event();
  assert.equal(protectUnsavedKeys(registry, api), true);
  assert.equal(registry.prevented, 1);
});

test('an unsaved archived key still protects the page when the active key was already downloaded', () => {
  const state = {
    teacherKey: { id: 'current', issued: [] },
    teacherArchives: [{ key: { id: 'previous' }, downloaded: false }],
  };
  const { teacher, api } = classroom(state);
  teacher.markKeyDownloaded();
  const original = event();
  assert.equal(protectUnsavedKeys(original, api), true);
  teacher.markArchiveDownloaded(0);
  const handled = event();
  assert.equal(protectUnsavedKeys(handled, api), false);
  assert.equal(handled.prevented, 0);
  state.teacherKey = null;
  state.teacherArchives[0].downloaded = false;
  assert.equal(protectUnsavedKeys(event(), api), true);
});
