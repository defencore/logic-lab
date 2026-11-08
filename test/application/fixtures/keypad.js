import { createKeypadController } from '../../../src/application/keypad-controller.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

export function keypadFixture(t, mode = 'hold') {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = new EventTarget();
  globalThis.window = new EventTarget();
  document.hidden = false;
  const f = {
    project: {
      version: 1,
      name: 'Keypad controls',
      nodes: [
        { id: 'pad', type: 'keypad', x: 0, y: 0, enabled: true, params: { mode, keys: 0 } },
        { id: 'power', type: 'vcc', x: 300, y: 0, params: {} },
      ],
      wires: Array.from({ length: 4 }, (_, row) => ({
        id: `scan-${row}`,
        from: { node: 'power', port: 'out' },
        to: { node: 'pad', port: `row${row}` },
      })),
    },
    runtime: createRuntime(),
    writes: [],
    flags: { active: true, writable: true },
    session: null,
    node: () => f.project.nodes.find(({ id }) => id === 'pad'),
  };
  f.canWrite = () => f.flags.writable && (!f.session?.isLocked() || f.session.state.recording);
  f.controller = createKeypadController({
    getProject: () => f.project,
    getTime: () => f.runtime.time,
    canPress: () => f.flags.active && f.canWrite(),
    canWrite: f.canWrite,
    writeKeys(node, keys) {
      if ((node.params.keys ?? 0) === keys) return;
      node.params.keys = keys;
      simulate(f.project, f.runtime, 0);
      f.writes.push({ keys, at: f.runtime.time });
      if (f.canWrite()) f.session?.inputChanged(node.id, 'keys', keys);
    },
  });
  f.adapter = {
    getProject: () => f.project,
    getRuntime: () => f.runtime,
    resetForSequence() {
      f.runtime = createRuntime();
      simulate(f.project, f.runtime, 0);
    },
    setRunning() {},
    adoptPlayback(project, runtime) {
      f.project = project;
      f.runtime = runtime;
    },
    refreshPlayback() {},
  };
  f.setKey = (id, index, pressed) =>
    pressed ? f.controller.press(id, index) : f.controller.release(id, index);
  f.controller.reconcile();
  simulate(f.project, f.runtime, 0);
  t.after(() => {
    f.controller.dispose();
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  });
  return f;
}
