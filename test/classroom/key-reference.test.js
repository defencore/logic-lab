import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStudentWork } from '../../src/classroom/student-work-files.js';
import { fixture, withDOM, baseline, assertOriginal } from './fixtures/key-reference.js';

test('viewing the key opens its actual six components and Stop restores the seven-component work, sequence and viewport', () => {
  const f = fixture(),
    key = structuredClone(f.key),
    observations = f.state.observations;
  f.bridge.openKeyReference(f.key);
  assert.equal(f.project.nodes.length, 6);
  assert.equal(f.project.name, 'Stored six');
  assert.equal(f.state.reviewMode, 'reference');
  assert.equal(f.state.preview.label, f.key.title);
  assert.equal(f.session.isLocked(), true);
  assert.equal(f.session.projectToSave(), f.originalProject);
  assert.equal(f.session.sequenceToSave(), f.originalSequence);
  f.session.stopPlayback();
  assert.equal(f.project, f.originalProject);
  assert.equal(f.project.nodes.length, 7);
  assert.equal(f.runtime, f.originalRuntime);
  assert.equal(f.state.sequence, f.originalSequence);
  assert.equal(f.state.observations, observations);
  assert.deepEqual(f.viewport, { x: 43, y: 21, zoom: 1.25 });
  assert.equal(f.lessonStep, 3);
  assert.deepEqual(f.key, key);
});

test('cancelling reference-copy confirmation leaves the current work and issued key untouched', async () => {
  const f = fixture(),
    before = baseline(f),
    key = structuredClone(f.key);
  await withDOM(f, async () => {
    f.bridge.openKeyReference(f.key, { edit: true });
    f.controls.buttons.get('reference-copy-cancel').onclick();
  });
  assertOriginal(f, before);
  assert.equal(f.controls.loads, 0);
  assert.deepEqual(f.key, key);
});

test('save-and-open backs up the seven-component circuit and its sequence before installing an editable key copy', async () => {
  const f = fixture(),
    key = structuredClone(f.key),
    issued = structuredClone(f.state.issued);
  await withDOM(f, async () => {
    f.bridge.openKeyReference(f.key, { edit: true });
    await f.controls.buttons.get('reference-copy-backup').onclick();
  });
  assert.equal(f.controls.downloads.length, 1);
  const saved = await parseStudentWork(await f.controls.blobs[0].text());
  assert.equal(saved.project.nodes.length, 7);
  assert.equal(saved.project.name, 'Current seven');
  assert.deepEqual(saved.sequence, f.originalSequence);
  assert.equal(saved.notes, 'Original explanation');
  assert.equal(f.project.nodes.length, 6);
  assert.notEqual(f.project, f.key.referenceProject);
  assert.deepEqual(f.state.sequence, f.key.sequence);
  assert.equal(f.running, false);
  assert.equal(f.teacher.status(f.project).referenceChanged, false);
  f.project.wires.pop();
  assert.deepEqual(f.key, key);
  assert.deepEqual(f.state.issued, issued);
  assert.equal(f.teacher.status(f.project).referenceChanged, true);
});

test('copy installation failures restore editor data, observations, lesson position and reference baselines atomically', async () => {
  for (const failure of ['load', 'sequence-save', 'teacher-save']) {
    const f = fixture(),
      before = baseline(f),
      key = structuredClone(f.key),
      issued = structuredClone(f.state.issued);
    f.controls.failure = failure;
    await withDOM(f, async () => {
      f.bridge.openKeyReference(f.key, { edit: true });
      await assert.rejects(f.controls.buttons.get('reference-copy-open').onclick(), /Injected/);
    });
    assertOriginal(f, before);
    assert.deepEqual(f.key, key);
    assert.deepEqual(f.state.issued, issued);
    assert.equal(f.controls.persisted.at(-1).sequence, f.originalSequence);
  }
});

test('reference mismatch aborts installation instead of adopting an unverified editing baseline', async () => {
  const f = fixture(),
    before = baseline(f);
  f.teacher.markReferenceCopyOpened = () => false;
  await withDOM(f, async () => {
    f.bridge.openKeyReference(f.key, { edit: true });
    await assert.rejects(f.controls.buttons.get('reference-copy-open').onclick(), /does not match/);
  });
  assertOriginal(f, before);
});

test('backup confirmation locks duplicate/cancel actions and closing the dialog cancels pending installation', async () => {
  const f = fixture(),
    before = baseline(f);
  let release;
  f.controls.gate = new Promise((resolve) => {
    release = resolve;
  });
  await withDOM(f, async () => {
    f.bridge.openKeyReference(f.key, { edit: true });
    const cancel = f.controls.buttons.get('reference-copy-cancel'),
      open = f.controls.buttons.get('reference-copy-open'),
      save = f.controls.buttons.get('reference-copy-backup');
    const pending = save.onclick();
    assert.equal(cancel.disabled, true);
    assert.equal(open.disabled, true);
    assert.equal(save.disabled, true);
    cancel.onclick();
    assert.ok(f.controls.modal);
    await open.onclick();
    assert.equal(f.controls.loads, 0);
    f.adapter.closeModal();
    release();
    await pending;
    assert.equal(save.disabled, false);
  });
  assertOriginal(f, before);
  assert.equal(f.controls.downloads.length, 1);
  assert.equal(f.controls.loads, 0);
});
