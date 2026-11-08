import test from 'node:test';
import assert from 'node:assert/strict';
import { createMomentaryController } from '../../src/application/momentary-controller.js';
import { createActionSession } from '../../src/classroom/action-session.js';
import { createRuntime, simulate } from '../../src/simulation/index.js';
import { parseSequence, serializeSequence, replaySequence } from '../../src/experiments/actions.js';
import { createCommands } from '../../src/application/commands.js';

function fixture(t) {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = new EventTarget();
  globalThis.window = new EventTarget();
  const f = {
    project: {
      version: 1,
      name: 'Momentary experiment',
      nodes: [
        { id: 'push', type: 'button', x: 0, y: 0, params: { value: 0 } },
        { id: 'lamp', type: 'led', x: 200, y: 0, params: {} },
        { id: 'count', type: 'counter', x: 400, y: 0, params: { initial: 0 } },
      ],
      wires: [
        { id: 'light', from: { node: 'push', port: 'out' }, to: { node: 'lamp', port: 'in' } },
        { id: 'clock', from: { node: 'push', port: 'out' }, to: { node: 'count', port: 'clk' } },
      ],
    },
    runtime: createRuntime(),
    writes: [],
    active: true,
    writable: true,
    session: null,
  };
  const canWrite = () => f.writable && (!f.session?.isLocked() || f.session.state.recording);
  f.controller = createMomentaryController({
    getProject: () => f.project,
    canPress: () => f.active && canWrite(),
    canWrite,
    writeValue: (node, value) => {
      if ((node.params.value ?? 0) === value) return;
      node.params.value = value;
      simulate(f.project, f.runtime, 0);
      f.writes.push({ value, at: f.runtime.time });
      if (canWrite()) f.session?.inputChanged(node.id, 'value', value);
    },
  });
  f.adapter = {
    getProject: () => f.project,
    getRuntime: () => f.runtime,
    resetForSequence: () => {
      f.runtime = createRuntime();
      simulate(f.project, f.runtime, 0);
    },
    setRunning() {},
    adoptPlayback: (project, runtime) => {
      f.project = project;
      f.runtime = runtime;
    },
    refreshPlayback() {},
  };
  simulate(f.project, f.runtime, 0);
  t.after(() => {
    f.controller.dispose();
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  });
  return f;
}

test('simultaneous board and linked-panel holds keep the source high until both controls release', (t) => {
  const f = fixture(t);
  assert.equal(f.controller.press('push'), true);
  assert.equal(f.runtime.inputs.lamp.in, 1);
  assert.equal(f.runtime.state.count.q, 1);
  assert.equal(f.controller.press('push'), true);
  f.controller.release('push');
  assert.equal(f.runtime.inputs.lamp.in, 1);
  f.controller.release('push');
  assert.equal(f.runtime.inputs.lamp.in, 0);
  assert.equal(f.runtime.state.count.q, 1);
  assert.deepEqual(
    f.writes.map(({ value }) => value),
    [1, 0],
  );
});

test('window blur, page hiding and disabling a held button cannot leave a high live source', (t) => {
  const f = fixture(t);
  for (const kind of ['blur', 'hidden', 'disabled']) {
    f.project.nodes[0].enabled = true;
    f.controller.press('push');
    if (kind === 'blur') window.dispatchEvent(new Event('blur'));
    if (kind === 'hidden') {
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    }
    if (kind === 'disabled') {
      f.project.nodes[0].enabled = false;
      f.controller.reconcile();
    }
    assert.equal(f.project.nodes[0].params.value, 0);
    assert.equal(f.controller.release('push'), false);
  }
  assert.deepEqual(
    f.writes.map(({ value }) => value),
    [1, 0, 1, 0, 1, 0],
  );
});

test('replacement clears the original hold without changing a readonly replay node with the same ID', (t) => {
  const f = fixture(t);
  f.controller.press('push');
  const original = f.project;
  f.project = structuredClone(original);
  f.writable = false;
  f.controller.reconcile();
  assert.equal(original.nodes[0].params.value, 0);
  assert.equal(f.project.nodes[0].params.value, 1);
  assert.equal(f.controller.press('push'), false);
  assert.equal(f.controller.release('push'), false);
  assert.equal(f.project.nodes[0].params.value, 1);
  f.writable = true;
  f.controller.reconcile();
  assert.equal(f.project.nodes[0].params.value, 0, 'a live imported press has no physical owner');
});

test('unowned saved presses normalize on live adoption; locked, disabled or missing sources cannot be pressed', (t) => {
  const f = fixture(t);
  f.project.nodes[0].params.value = 1;
  f.controller.reconcile();
  assert.equal(f.project.nodes[0].params.value, 0);
  f.active = false;
  assert.equal(f.controller.press('push'), false);
  f.active = true;
  f.project.nodes[0].enabled = false;
  assert.equal(f.controller.press('push'), false);
  assert.equal(f.controller.press('missing'), false);
  assert.equal(f.controller.press('lamp'), false);
  assert.equal(f.runtime.state.count.q, 0);
});

test('real classroom recording saves press/release edges and replays readonly without physical input', (t) => {
  const f = fixture(t);
  f.session = createActionSession(f.adapter);
  f.session.startRecording({ probes: [{ node: 'push', port: 'out', side: 'outputs' }] });
  f.controller.press('push');
  simulate(f.project, f.runtime, 0.05);
  f.controller.release('push');
  f.session.stopRecording();
  const sequence = parseSequence(serializeSequence(f.session.state.sequence));
  assert.deepEqual(
    sequence.actions.map(({ value, at }) => [value, at]),
    [
      [1, 0],
      [0, 0.05],
    ],
  );
  assert.deepEqual(
    f.session.state.observations.map(({ values }) => values),
    [[0], [1], [0]],
  );
  assert.equal(replaySequence(sequence).runtime.state.count.q, 1);
  f.session.replay();
  f.controller.reconcile();
  const player = f.session.state.player;
  assert.equal(f.controller.press('push'), false);
  f.session.tick(0.1);
  assert.equal(f.session.state.player, player);
  assert.equal(f.runtime.outputs.push.out, 0);
  assert.equal(f.runtime.state.count.q, 1);
  assert.deepEqual(f.session.state.sequence, sequence);
});

test('export releases a live press before serializing so the downloaded project cannot keep it held', async (t) => {
  const f = fixture(t);
  let downloaded;
  document.createElement = () => ({ click() {} });
  t.mock.method(URL, 'createObjectURL', (blob) => {
    downloaded = blob;
    return 'blob:button-test';
  });
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.mock.method(globalThis, 'setTimeout', (callback) => callback());
  const commands = createCommands({
    state: { project: f.project },
    services: { buttons: f.controller },
    actions: { notify() {} },
    t: (key) => key,
  });
  f.controller.press('push');
  commands.exportProject();
  assert.equal(f.project.nodes[0].params.value, 0);
  assert.equal(JSON.parse(await downloaded.text()).nodes[0].params.value, 0);
  assert.deepEqual(
    f.writes.map(({ value }) => value),
    [1, 0],
  );
});
