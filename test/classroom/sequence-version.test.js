import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { getDefinition } from '../../src/components/catalog/index.js';
import { createSequence } from '../../src/experiments/actions.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { studentPlaybackState } from '../../src/classroom/student-playback.js';
import {
  describeSequenceVersion,
  createSequenceVersion,
  previousVersionMessage,
} from '../../src/classroom/sequence-version.js';

test('a changed circuit labels its old recording before, during, after replay and after returning to the editor', () => {
  let project = createExample('half-adder'),
    runtime = createRuntime();
  const sequence = createSequence(project),
    recordedNodes = project.nodes.length;
  project.nodes.push({
    id: 'new-logic',
    type: 'not',
    x: 10,
    y: 10,
    params: { ...getDefinition('not').defaults },
  });
  const original = project;
  const adapter = {
    getProject: () => project,
    getRuntime: () => runtime,
    getLanguage: () => 'ua',
    setRunning() {},
    adoptPlayback(p, r) {
      project = p;
      runtime = r;
    },
    refreshPlayback() {},
  };
  simulate(project, runtime, 0);
  const session = createActionSession(adapter, { sequence });
  Object.assign(session.state, { mode: 'student', assignment: {}, attempt: {} });
  const version = createSequenceVersion(session);
  session.state.sequenceVersion = version.refresh();
  const before = studentPlaybackState(session.state, 'ua');
  assert.match(before.status, /Запис попередньої версії/);
  assert.equal(before.replayLabel, 'Переглянути попередній запис');
  assert.equal(before.replayDisabled, false);
  assert.equal(before.summary.includes('Попередня версія'), true);
  for (const stage of ['playing', 'paused', 'complete', 'restored']) {
    if (stage === 'playing') session.replay();
    if (stage === 'paused') session.pausePlayback();
    if (stage === 'complete') {
      session.pausePlayback();
      session.tick(0.1);
    }
    if (stage === 'restored') session.stopPlayback();
    session.state.sequenceVersion = version.refresh();
    const value = studentPlaybackState(session.state, 'ua');
    assert.match(value.versionMessage, /Запис попередньої версії/);
    assert.match(
      value.versionMessage,
      new RegExp(`Схема запису: ${recordedNodes} компонентів; поточна: ${recordedNodes + 1}`),
    );
    if (stage !== 'restored') assert.equal(project.nodes.length, recordedNodes);
  }
  assert.equal(project, original);
});

test('source operation and layout changes keep a recording current, while a new recording clears its previous-version marker', () => {
  const project = createExample('half-adder'),
    sequence = createSequence(project);
  project.nodes.find((node) => node.type === 'switch').params.value = 0;
  project.nodes[0].x += 100;
  project.nodes[0].label = 'Renamed';
  assert.equal(describeSequenceVersion(sequence, project).previous, false);
  project.wires.pop();
  assert.equal(describeSequenceVersion(sequence, project).previous, true);
  const renewed = createSequence(project);
  const version = describeSequenceVersion(renewed, project);
  assert.equal(version.previous, false);
  assert.equal(previousVersionMessage(version, 'ua'), '');
});
