import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import {
  createAssignment,
  issueAssignment,
  serializeAssignmentKey,
} from '../../src/assessment/index.js';
import { createTeacherWorkspace, probeKey } from '../../src/classroom/teacher-workspace.js';
import { sanitizeTeacherForm } from '../../src/classroom/storage.js';
import { teacherReferenceMarkup } from '../../src/classroom/teacher-reference-view.js';
import { sequenceFor } from './fixtures/classroom-session.js';

function fixture() {
  const project = createExample('shift-register-sequence');
  const sequence = sequenceFor(project);
  const key = createAssignment({ title: 'Stored shift task', referenceProject: project, sequence });
  const state = {
    teacherKey: key,
    sequence,
    issued: [],
    teacherForm: sanitizeTeacherForm({
      title: key.title,
      instructions: key.instructions,
      starterMode: key.starterMode,
      probes: key.probes.map(probeKey),
      studentIds: 's1',
    }),
    referenceWarnings: {},
  };
  return { project, sequence, key, state, workspace: createTeacherWorkspace(state) };
}

test('unsaved current key detection follows exported contents rather than form drafts', () => {
  const { workspace, state } = fixture();
  assert.equal(workspace.hasUnsavedKeys(), true);
  workspace.markKeyDownloaded();
  assert.equal(workspace.hasUnsavedKeys(), false);
  state.teacherForm.instructions = 'Unapplied form draft';
  assert.equal(
    workspace.hasUnsavedKeys(),
    false,
    'the separate form draft does not modify the exported key',
  );
  workspace.applyChanges();
  assert.equal(workspace.hasUnsavedKeys(), true);
  workspace.markKeyDownloaded();
  assert.equal(workspace.hasUnsavedKeys(), false);
  workspace.issueVariants();
  assert.equal(workspace.hasUnsavedKeys(), true, 'issued identities change the private registry');
});

test('a downloaded current key cannot hide an unsaved archived key', async () => {
  const { workspace, state, key, project } = fixture();
  const replacement = createAssignment({
    title: 'Imported replacement',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  await workspace.importKey(serializeAssignmentKey(replacement), project);
  assert.equal(state.teacherArchives[0].key.id, key.id);
  assert.equal(state.teacherArchives[0].downloaded, false);
  assert.equal(workspace.status().keyNeedsDownload, false);
  assert.equal(workspace.hasUnsavedKeys(), true);
  workspace.markKeyDownloaded();
  assert.equal(workspace.hasUnsavedKeys(), true);
  assert.equal(workspace.markArchiveDownloaded(-1), false);
  assert.equal(workspace.markArchiveDownloaded(99), false);
  assert.equal(workspace.markArchiveDownloaded(undefined), false);
  assert.equal(workspace.hasUnsavedKeys(), true);
  assert.equal(workspace.markArchiveDownloaded(0), true);
  assert.equal(workspace.hasUnsavedKeys(), false);
});

test('archiving an already downloaded key preserves its saved status while a new key stays unsaved', async () => {
  const { workspace, state, key, project } = fixture();
  workspace.markKeyDownloaded();
  await workspace.createKey(key.probes, project);
  assert.equal(state.teacherArchives[0].downloaded, true);
  assert.equal(workspace.hasUnsavedKeys(), true);
  workspace.markKeyDownloaded();
  assert.equal(workspace.hasUnsavedKeys(), false);
  state.teacherKey = null;
  state.teacherArchives[0].downloaded = false;
  assert.equal(workspace.hasUnsavedKeys(), true, 'archives are guarded even without an active key');
});

test('an opened reference copy becomes the clean editing baseline without changing its key or issued identities', async () => {
  const { workspace, state, key } = fixture();
  const task = issueAssignment(key, { studentId: 'already-issued' });
  const unrelated = createExample('half-adder');
  await workspace.importKey(serializeAssignmentKey(key), unrelated);
  const saved = structuredClone(state.teacherKey);
  const copy = structuredClone(state.teacherKey.referenceProject);
  state.sequence = structuredClone(state.teacherKey.sequence);
  assert.equal(workspace.markReferenceCopyOpened(copy, state.sequence), true);
  assert.equal(workspace.status(copy).referenceChanged, false);
  assert.deepEqual(state.teacherKey, saved);
  assert.equal(state.issued[0].id, task.id);
  copy.wires.pop();
  assert.equal(workspace.status(copy).referenceChanged, true);
  assert.throws(() => workspace.issueVariants(copy), /unapplied/);
  const before = structuredClone(state.teacherEditorBaseline);
  assert.equal(workspace.markReferenceCopyOpened(copy, state.sequence), false);
  assert.deepEqual(
    state.teacherEditorBaseline,
    before,
    'a modified circuit cannot be labelled an unchanged reference',
  );
});

test('teacher reference summary identifies an imported key and a different current circuit separately', () => {
  const { key } = fixture();
  const editor = createExample('half-adder');
  const markup = teacherReferenceMarkup({ key, project: editor, language: 'en', locked: false });
  assert.match(markup, /Reference in the applied key/);
  assert.match(markup, /Stored shift task/);
  assert.ok(markup.includes(key.referenceProject.name));
  assert.match(markup, /Currently in the editor/);
  assert.ok(markup.includes(editor.name));
  assert.ok(markup.includes(`${key.referenceProject.nodes.length} components`));
  assert.ok(markup.includes(`${editor.nodes.length} components`));
  assert.match(markup, /This is a different logical circuit/);
  assert.match(markup, /id="teacher-view-reference"/);
  assert.match(markup, /id="teacher-edit-reference"/);
  const locked = teacherReferenceMarkup({ key, project: editor, language: 'ua', locked: true });
  assert.equal((locked.match(/disabled/g) || []).length, 2);
  assert.match(locked, /Переглянути еталон ключа/);
  assert.match(locked, /Редагувати копію еталона/);
});
