import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, sequenceFor } from './fixtures/classroom-session.js';
import { createActionSession } from '../../src/classroom/action-session.js';

test('reviewing a student circuit is temporary and preserves the teacher sequence and viewport', () => {
  const f = fixture();
  const original = f.project,
    runtime = f.runtime;
  let view = { x: 20, y: 30, zoom: 1.2 };
  f.adapter.getViewport = () => ({ ...view });
  f.adapter.restoreViewport = (value) => {
    view = value;
  };
  let lessonStep = 5;
  f.adapter.getLessonStep = () => lessonStep;
  f.adapter.restoreLessonStep = (value) => {
    lessonStep = value;
  };
  let saved = 0;
  const sequence = sequenceFor(original);
  const session = createActionSession(f.adapter, { sequence, onSave: () => saved++ });
  const submitted = structuredClone(original);
  submitted.name = 'Student circuit';
  session.reviewWork(submitted);
  view = { x: 0, y: 0, zoom: 0.5 };
  lessonStep = 1;
  assert.equal(session.state.reviewMode, 'circuit');
  assert.equal(session.isLocked(), true);
  assert.equal(session.tick(1).playing, true);
  assert.equal(f.project.name, 'Student circuit');
  assert.equal(session.projectToSave(), original);
  assert.equal(session.sequenceToSave(), sequence);
  assert.deepEqual(session.viewportToSave(), { x: 20, y: 30, zoom: 1.2 });
  assert.throws(() => session.startRecording(), /Return/);
  assert.throws(() => session.replay(), /Return/);
  session.stopPlayback();
  assert.equal(f.project, original);
  assert.equal(f.runtime, runtime);
  assert.equal(session.state.sequence, sequence);
  assert.equal(session.isLocked(), false);
  assert.deepEqual(view, { x: 20, y: 30, zoom: 1.2 });
  assert.equal(saved, 0);
  assert.equal(lessonStep, 5);
});

test('reviewing student actions never saves them over the teacher reference scenario', () => {
  const f = fixture();
  const original = f.project;
  const sequence = sequenceFor(original);
  const session = createActionSession(f.adapter, { sequence });
  const submitted = sequenceFor(original);
  const studentCircuit = structuredClone(original);
  studentCircuit.name = 'Student replay';
  session.reviewWork(studentCircuit, submitted);
  assert.equal(session.state.reviewMode, 'replay');
  assert.equal(f.project.name, 'Student replay');
  assert.equal(session.sequenceToSave(), sequence);
  session.tick(0.2);
  assert.equal(session.state.player.done, true);
  session.stopPlayback();
  assert.equal(session.state.sequence, sequence);
  assert.equal(f.project, original);
});

test('an invalid reviewed circuit cannot replace the editor or lock it', () => {
  const f = fixture();
  const session = createActionSession(f.adapter);
  const original = f.project;
  assert.throws(() => session.reviewWork({ version: 0 }), /version/);
  assert.equal(f.project, original);
  assert.equal(session.isLocked(), false);
});

test('student experiment review uses the submitted circuit even when its recording baseline differs', () => {
  const f = fixture();
  const sequence = sequenceFor(f.project);
  const submitted = structuredClone(f.project);
  submitted.wires = submitted.wires.filter((wire) => wire.to.node !== 'shift');
  const session = createActionSession(f.adapter);
  session.reviewWork(submitted, sequence);
  session.tick(0.1);
  assert.equal(f.project.wires.length, submitted.wires.length);
  assert.notEqual(f.runtime.signals.outputs.shift.out, 1);
  session.nextAction();
  assert.equal(f.project.wires.length, submitted.wires.length);
  session.stopPlayback();
});
