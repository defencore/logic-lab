import test from 'node:test';
import assert from 'node:assert/strict';
import { node, wire, student } from '../assessment/fixtures/lab-assessment.js';
import { fixture, sequenceFor } from './fixtures/classroom-session.js';
import { createSequence, appendAction, finishSequence } from '../../src/experiments/actions.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { createReviewWorkController } from '../../src/classroom/review-work-controller.js';
import {
  createAssignment,
  issueAssignment,
  createAttempt,
  createSubmission,
  buildReferenceCheck,
  gradeSubmission,
} from '../../src/assessment/index.js';
import { run } from '../../src/assessment/replay.js';

async function checkedWork() {
  const project = {
    version: 1,
    name: 'Reference inverter',
    nodes: [node('data', 'switch'), node('invert', 'not'), node('lamp', 'led')],
    wires: [wire('a', 'data', 'out', 'invert', 'a'), wire('q', 'invert', 'out', 'lamp', 'in')],
  };
  const probes = [{ node: 'lamp', port: 'in', side: 'inputs' }];
  const record = (project, count) => {
    const sequence = createSequence(project, { probes });
    for (let i = 0; i < count; i++)
      appendAction(sequence, {
        at: Math.floor(i / 2) / 1000,
        node: 'data',
        key: 'value',
        value: i % 2,
      });
    return finishSequence(sequence, 0.1);
  };
  const sequence = record(project, 100);
  const key = createAssignment({
    title: 'Check 100 actions',
    instructions: 'Invert every input.',
    referenceProject: project,
    sequence,
  });
  const assignment = issueAssignment(key, { studentId: student.id, seed: 'individual-variant' });
  const submitted = structuredClone(project);
  submitted.name = 'Student circuit';
  submitted.wires.shift();
  const submission = await createSubmission({
    project: submitted,
    sequence: record(submitted, 70),
    assignment,
    student,
    attempt: createAttempt(assignment, student),
  });
  return { submission, key, ...buildReferenceCheck(submission, key) };
}

test('reference action98 uses all100 instructor actions on the submitted circuit, pauses at its exact observation and restores the teacher editor', async () => {
  const check = await checkedWork();
  const grade = await gradeSubmission(check.submission, check.key);
  const mismatch = grade.mismatches.find(({ after }) => after === 97);
  assert.ok(mismatch);
  assert.equal(check.submission.sequence.actions.length, 70);
  const f = fixture(),
    original = f.project,
    originalRuntime = f.runtime;
  let view = { x: 12, y: 34, zoom: 0.58 },
    saves = 0;
  f.adapter.getViewport = () => ({ ...view });
  f.adapter.restoreViewport = (value) => {
    view = value;
  };
  const ownSequence = sequenceFor(original);
  const session = createActionSession(f.adapter, { sequence: ownSequence, onSave: () => saves++ });
  const before = structuredClone(check);
  await session.reviewCheck(check.submission.project, check.sequence, mismatch, {
    label: check.key.title,
  });
  assert.equal(session.state.reviewMode, 'check');
  assert.equal(session.state.playbackRunning, false);
  assert.equal(session.state.player.cursor, 98);
  assert.equal(f.runtime.time, mismatch.at);
  assert.equal(f.runtime.signals.inputs.lamp.in, mismatch.actual);
  assert.equal(f.project.wires.length, check.submission.project.wires.length);
  assert.equal(session.state.sequence.actions.length, 100);
  assert.equal(session.projectToSave(), original);
  assert.equal(session.sequenceToSave(), ownSequence);
  assert.deepEqual(session.viewportToSave(), view);
  assert.deepEqual(check, before);
  session.nextAction();
  assert.equal(session.state.player.cursor, 99);
  session.tick(1);
  assert.equal(session.state.player.cursor, 99, 'a paused checkpoint does not run by itself');
  view = { x: 0, y: 0, zoom: 1 };
  session.stopPlayback();
  assert.equal(f.project, original);
  assert.equal(f.runtime, originalRuntime);
  assert.equal(session.state.sequence, ownSequence);
  assert.equal(session.state.reviewCheck, null);
  assert.deepEqual(view, { x: 12, y: 34, zoom: 0.58 });
  assert.equal(saves, 0);
});

test('checkpoint seeking separates same-time actions, the initial state and the final-duration observation', async () => {
  const check = await checkedWork();
  for (const after of [-1, 0, 96, 97, 99, 100]) {
    const at = after < 0 ? 0 : after === 100 ? 0.1 : check.sequence.actions[after].at;
    const playback = await run(check.sequence, check.submission.project, {
      checkpoint: { after, at },
    });
    assert.equal(playback.cursor, after < 0 ? 0 : Math.min(100, after + 1));
    assert.equal(playback.runtime.time, at);
    assert.equal(playback.observations.at(-1).after, after);
    assert.equal(playback.done, after === 100);
  }
});

test('invalid checkpoint, cancellation and missing student input cannot take over the editor', async () => {
  const check = await checkedWork(),
    f = fixture(),
    original = f.project;
  const session = createActionSession(f.adapter);
  for (const checkpoint of [
    undefined,
    {},
    { after: 101, at: 0.1 },
    { after: 97, at: 0 },
    { after: -2, at: 0 },
  ]) {
    await assert.rejects(
      session.reviewCheck(check.submission.project, check.sequence, checkpoint),
      /checkpoint/,
    );
    assert.equal(f.project, original);
    assert.equal(session.isLocked(), false);
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    run(check.sequence, check.submission.project, {
      signal: controller.signal,
      checkpoint: { after: 0, at: 0 },
    }),
    { name: 'AbortError' },
  );
  const missingInput = structuredClone(check.submission.project);
  missingInput.nodes.shift();
  await assert.rejects(
    session.reviewCheck(missingInput, check.sequence, { after: 0, at: 0 }),
    /Missing input/,
  );
  assert.equal(f.project, original);
  assert.equal(session.isLocked(), false);
});

test('review controller commits a paused reference check before closing the dialog and keeps ordinary student replay separate', async () => {
  const check = await checkedWork(),
    f = fixture(),
    events = [];
  const session = createActionSession(f.adapter);
  const open = createReviewWorkController({
    adapter: {
      ...f.adapter,
      closeModal: () => events.push('closed'),
      fitProject: () => events.push('fit'),
      notify() {},
    },
    session,
    guardEditableSession() {},
    L: (ua) => ua,
    operations: {
      run: async (action) => {
        events.push('busy');
        await action();
        events.push('idle');
      },
    },
  });
  await open(check.submission, {
    replay: true,
    referenceKey: check.key,
    checkpoint: { after: 97, at: check.sequence.actions[97].at },
  });
  assert.deepEqual(events, ['busy', 'closed', 'fit', 'idle']);
  assert.equal(session.state.player.cursor, 98);
  session.stopPlayback();
  const oldKey = structuredClone(check.key);
  oldKey.issued = [];
  events.length = 0;
  await assert.rejects(
    open(check.submission, { replay: true, referenceKey: oldKey, checkpoint: { after: 0, at: 0 } }),
    { code: 'assessment_variant_missing' },
  );
  assert.deepEqual(events, []);
  assert.equal(session.isLocked(), false);
  await open(check.submission, { replay: true });
  assert.equal(session.state.sequence.actions.length, 70);
  assert.equal(session.state.reviewMode, 'replay');
  assert.equal(session.state.playbackRunning, true);
});
