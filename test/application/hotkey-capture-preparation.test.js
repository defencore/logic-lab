import test from 'node:test';
import assert from 'node:assert/strict';
import { createGestures } from '../../src/application/gestures.js';
import { createEditing } from '../../src/workbench/wiring/editing.js';
import { withDocument } from './fixture.js';

test('preparing a key capture clears pending wire interactions without replacing its active inspector; ordinary cancellation still refreshes it', (t) => {
  withDocument(t);
  document.querySelector('#viewport').classList.remove = () => {};
  document.querySelector('#marquee').remove = () => {};
  const state = { gesture: null, suppressPanClick: true };
  const wiringState = {
    action: { kind: 'reconnect' },
    activeHandle: 2,
    traceSeed: {},
    hoverSeed: {},
  };
  let replacements = 0,
    refreshes = 0,
    cancelledWires = 0,
    cancelledGestures = 0;
  const wiring = createEditing({
    state: wiringState,
    options: { refreshInspector: () => replacements++ },
    commands: { cancelGesture: () => cancelledGestures++, refresh: () => refreshes++ },
  });
  const actions = { cancelWire: () => cancelledWires++ };
  const gestures = createGestures({
    state,
    actions,
    services: { wiring: { ...wiring, cancelGesture: () => cancelledGestures++ } },
  });
  actions.cancelGesture = gestures.cancelGesture;
  gestures.cancelInteraction({ refreshInspector: false });
  assert.equal(replacements, 0, 'the Assign a key panel must survive its preparation');
  assert.equal(wiringState.action, null);
  assert.equal(wiringState.activeHandle, null);
  assert.equal(wiringState.traceSeed, null);
  assert.equal(wiringState.hoverSeed, null);
  assert.equal(cancelledWires, 1);
  assert.equal(refreshes, 1);
  assert.equal(cancelledGestures, 2);
  gestures.cancelInteraction();
  assert.equal(replacements, 1, 'regular editor interactions retain inspector refresh');
});
