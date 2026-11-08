import test from 'node:test';
import assert from 'node:assert/strict';
import { yieldToMain } from '../../src/assessment/scheduling.js';

test('cancellation immediately rejects a yield even when its background timer never fires', async (context) => {
  const timer = { id: 'throttled' };
  let scheduled = null;
  let cleared = null;
  let clears = 0;
  context.mock.method(globalThis, 'setTimeout', (callback) => {
    scheduled = callback;
    return timer;
  });
  context.mock.method(globalThis, 'clearTimeout', (handle) => {
    cleared = handle;
    clears++;
  });
  const controller = new AbortController();
  const pending = yieldToMain(controller.signal);
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  controller.abort();
  await rejection;
  assert.equal(cleared, timer);
  assert.equal(typeof scheduled, 'function');
  // A callback that was already queued cannot revive the cancelled operation.
  scheduled();
  assert.equal(clears, 1);
});

test('ordinary yields resolve and clean up their abort listener and timer', async (context) => {
  let scheduled = null;
  let clears = 0;
  context.mock.method(globalThis, 'setTimeout', (callback) => {
    scheduled = callback;
    return 7;
  });
  context.mock.method(globalThis, 'clearTimeout', () => {
    clears++;
  });
  const controller = new AbortController();
  const pending = yieldToMain(controller.signal);
  scheduled();
  await pending;
  controller.abort();
  assert.equal(clears, 1, 'the abort listener was detached after resolution');
});
