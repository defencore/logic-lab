import { fixture, sequenceFor } from './fixtures/classroom-session.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createActionSession } from '../../src/classroom/action-session.js';

test('recording saves its fresh baseline immediately and preserves ordered paused input edges', () => {
  const f = fixture();
  const saves = [];
  const session = createActionSession(f.adapter, {
    onSave: () => saves.push(structuredClone(session.state.sequence)),
  });
  session.startRecording();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].actions.length, 0);
  assert.equal(f.runtime.time, 0);
  session.simulationStateChanged(false);
  assert.equal(session.state.simulationRunning, false);
  for (const [node, value] of [
    ['ser', 1],
    ['clock', 1],
    ['clock', 0],
  ]) {
    f.project.nodes.find((item) => item.id === node).params.value = value;
    simulate(f.project, f.runtime, 0);
    session.inputChanged(node, 'value', value);
  }
  session.stopRecording();
  assert.equal(session.state.sequence.actions.length, 3);
  assert.deepEqual(
    session.state.sequence.actions.map((action) => action.at),
    [0, 0, 0],
  );
  assert.equal(f.runtime.signals.outputs.shift.out, 1);
  assert.equal(session.state.observations.length, 4);
  assert.equal(session.isLocked(), false);
});

test('replaying an older circuit restores the exact editable project and runtime on stop', () => {
  const f = fixture();
  const sequence = sequenceFor(f.project);
  const originalProject = f.project;
  const originalRuntime = f.runtime;
  originalProject.nodes.push({
    id: 'new-note',
    type: 'note',
    x: 0,
    y: 0,
    label: 'New work',
    params: { text: 'Keep this' },
  });
  const session = createActionSession(f.adapter, { sequence });
  session.replay();
  assert.equal(
    f.project.nodes.some((node) => node.id === 'new-note'),
    false,
  );
  assert.equal(session.projectToSave(), originalProject);
  session.tick(0.1);
  assert.equal(session.state.player.done, true);
  assert.equal(session.state.playbackRunning, false);
  assert.equal(f.runtime.signals.outputs.shift.out, 1);
  session.stopPlayback();
  assert.equal(f.project, originalProject);
  assert.equal(f.runtime, originalRuntime);
  assert.equal(session.projectToSave(), originalProject);
});

test('single action stepping restarts completed playback without replacing its original restore point', () => {
  const f = fixture();
  const original = f.project;
  const session = createActionSession(f.adapter, { sequence: sequenceFor(original) });
  session.nextAction();
  assert.equal(session.state.player.cursor, 1);
  session.nextAction();
  assert.equal(session.state.player.cursor, 2);
  session.nextAction();
  assert.equal(session.state.player.done, true);
  session.nextAction();
  assert.equal(session.state.player.cursor, 1);
  session.stopPlayback();
  assert.equal(f.project, original);
});

test('starting a new recording during replay records the preserved editable circuit', () => {
  const f = fixture();
  const sequence = sequenceFor(f.project);
  f.project.name = 'My newer circuit';
  const session = createActionSession(f.adapter, { sequence });
  session.replay();
  assert.notEqual(f.project.name, 'My newer circuit');
  session.startRecording();
  assert.equal(session.state.sequence.initialProject.name, 'My newer circuit');
  assert.equal(session.state.recording, true);
  assert.equal(session.state.player, null);
});

test('invalid replay and import do not take over the editable circuit', () => {
  const f = fixture();
  const original = f.project;
  const session = createActionSession(f.adapter);
  assert.throws(() => session.replay(), /Record or import/);
  assert.throws(() => session.setSequence({}), /Unsupported/);
  assert.equal(f.project, original);
  assert.equal(session.state.player, null);
  session.stopPlayback();
  assert.equal(f.refreshes, 0);
});

test('recording caps its duration and stops without saving an invalid over-limit sequence', () => {
  const f = fixture();
  const session = createActionSession(f.adapter);
  session.startRecording();
  f.runtime.time = 119.99;
  assert.ok(Math.abs(session.recordingDelta(1) - 0.01) < 1e-10);
  f.runtime.time = 120;
  assert.equal(session.tick(0).limitReached, true);
  assert.equal(session.state.sequence.duration, 120);
  assert.equal(session.state.recording, false);
  assert.equal(f.running, false);
});
