import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../../examples/index.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { createSequenceController } from '../../src/classroom/sequence-controller.js';
import { lcd1602Snapshot } from '../../src/simulation/lcd1602.js';
import { fixture, sequenceFor } from './fixtures/classroom-session.js';

test('the LCD demo starts directly, writes both lines and restores the original circuit and recording', () => {
  const f = fixture();
  const original = f.project;
  const originalRuntime = f.runtime;
  const sequence = sequenceFor(original);
  let saved = 0;
  const session = createActionSession(f.adapter, { sequence, onSave: () => saved++ });
  session.state.dockOpen = false;
  const effects = [];
  const controls = createSequenceController({
    adapter: {
      closeModal: () => effects.push('closed'),
      showDemoCanvas: (node) => effects.push(node),
    },
    session,
    safe: (action) => action,
    guardEditableSession: () => assert.equal(session.isLocked(), false),
    controls: {},
  });
  const example = EXAMPLES.find(({ id }) => id === 'lcd1602-parallel');
  controls.playExample(example);
  assert.deepEqual(effects, ['closed', 'lcd']);
  assert.equal(session.state.reviewMode, 'demo');
  assert.equal(session.state.playbackRunning, true);
  assert.equal(session.projectToSave(), original);
  assert.equal(session.sequenceToSave(), sequence);
  function finishDemo() {
    for (let tick = 0; tick < 8 && !session.state.player.done; tick++) session.tick(1);
    assert.equal(session.state.player.done, true);
    assert.deepEqual(
      lcd1602Snapshot(f.runtime.state.lcd).rows.map((row) => row.trimEnd()),
      ['LOGIC LAB', 'PARALLEL LCD'],
    );
  }
  finishDemo();
  session.replay();
  finishDemo();
  session.stopPlayback();
  assert.equal(f.project, original);
  assert.equal(f.runtime, originalRuntime);
  assert.equal(session.state.sequence, sequence);
  assert.equal(session.state.dockOpen, false);
  assert.equal(saved, 0);
});
