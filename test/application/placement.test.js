import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommands } from '../../src/application/commands.js';
import { dimensions } from '../../src/circuits/geometry/index.js';
import { editingContext, withDocument } from './fixture.js';

test('adding switch then LED leaves both controls visible and unoccluded', (t) => {
  withDocument(t);
  const context = editingContext();
  const commands = createCommands(context);
  commands.addNode('switch');
  commands.addNode('led');
  const [source, lamp] = context.state.project.nodes;
  const sourceSize = dimensions(source),
    lampSize = dimensions(lamp);
  assert.ok(
    source.x + sourceSize.w + 24 <= lamp.x ||
      lamp.x + lampSize.w + 24 <= source.x ||
      source.y + sourceSize.h + 24 <= lamp.y ||
      lamp.y + lampSize.h + 24 <= source.y,
  );
  for (const item of [source, lamp]) {
    const { w, h } = dimensions(item);
    assert.ok(item.x >= 0 && item.x + w <= 800);
    assert.ok(item.y >= 0 && item.y + h <= 600);
  }
});

test('an explicit drop keeps its snapped location and viewport even when it overlaps another node', (t) => {
  withDocument(t);
  const context = editingContext();
  const commands = createCommands(context);
  commands.addNode('matrix', { x: 35, y: 42 });
  const originalView = { ...context.state.view };
  commands.addNode('led', { x: 35, y: 42 });
  assert.deepEqual(
    context.state.project.nodes.map(({ x, y }) => ({ x, y })),
    [
      { x: 40, y: 40 },
      { x: 40, y: 40 },
    ],
  );
  assert.deepEqual(context.state.view, originalView);
});
