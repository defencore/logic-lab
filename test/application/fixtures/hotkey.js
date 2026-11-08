import { node, wire } from '../../assessment/fixtures/lab-assessment.js';
import { validateProject } from '../../../src/circuits/project.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';
import { createHotkeyController } from '../../../src/application/hotkey-controller.js';

export function keyboardEvent(type, code, extra = {}) {
  const event = new Event(type, { cancelable: true, bubbles: true });
  Object.assign(event, {
    code,
    key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...extra,
  });
  return event;
}

export function hotkeyFixture(mode = 'hold', binding = 'KeyA') {
  const f = {
    project: validateProject({
      version: 1,
      name: 'Keyboard input',
      nodes: [node('key', 'hotkey', { mode, binding }), node('lamp', 'led')],
      wires: [wire('q', 'key', 'out', 'lamp', 'in')],
    }),
    runtime: createRuntime(),
    writes: [],
    claims: 0,
    focused: 0,
    session: null,
    flags: { write: true, active: true, capture: true },
  };
  const canWrite = () =>
    f.flags.write && (!f.session || !f.session.isLocked() || f.session.state.recording);
  f.controller = createHotkeyController({
    getProject: () => f.project,
    canWrite,
    canActivate: () => canWrite() && f.flags.active,
    canCapture: (id) =>
      f.flags.capture && !f.session?.isLocked() && f.project.nodes.some((n) => n.id === id),
    writeValue: (id, value) => {
      const key = f.project.nodes.find((n) => n.id === id);
      if (!key || (key.params.value ?? 0) === value) return;
      key.params.value = value;
      simulate(f.project, f.runtime, 0);
      f.writes.push({ id, value, at: f.runtime.time });
      f.session?.inputChanged(id, 'value', value);
    },
    onClaim: () => f.claims++,
    focusWorkspace: () => f.focused++,
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
  f.down = (code = 'KeyA', extra) => f.controller.keyDown(keyboardEvent('keydown', code, extra));
  f.up = (code = 'KeyA', extra) => f.controller.keyUp(keyboardEvent('keyup', code, extra));
  f.output = () => f.runtime.signals.outputs.key.out;
  f.controller.reconcile();
  simulate(f.project, f.runtime, 0);
  return f;
}
