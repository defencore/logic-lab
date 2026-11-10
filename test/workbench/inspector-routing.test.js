import test from 'node:test';
import assert from 'node:assert/strict';
import { createInspectorController } from '../../src/workbench/inspector-controller.js';
import { withDocument } from '../application/fixture.js';

test('the routing controls follow the classroom lock and selected wire style without a rerender', (t) => {
  const elements = withDocument(t);
  elements.set('#inspector-content', { closest: () => ({ classList: { toggle() {} } }) });
  let locked = true;
  const state = {
    project: { nodes: [], wires: [], autoRouting: false },
    selected: new Set(),
    classroom: { isLocked: () => locked },
  };
  const inspector = createInspectorController(state, { t: (key) => key });
  inspector.render();
  const routing = elements.get('#routing');
  const automatic = elements.get('#auto-routing');
  assert.equal(routing.disabled, true);
  assert.equal(automatic.disabled, true);

  locked = false;
  inspector.updateRoutingControls(locked);
  assert.equal(routing.disabled, false);
  assert.equal(automatic.disabled, false);

  state.project.wireStyle = 'bezier';
  inspector.updateRoutingControls(locked);
  assert.equal(routing.disabled, false);
  assert.equal(automatic.disabled, true);
  assert.equal(state.project.autoRouting, false);
});
