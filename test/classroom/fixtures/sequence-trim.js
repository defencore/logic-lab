import { createSequence, appendAction, finishSequence } from '../../../src/experiments/actions.js';
import { createActionSession } from '../../../src/classroom/action-session.js';
import { createSequenceTrim } from '../../../src/classroom/sequence-trim-controller.js';
import { createClassroomOperations } from '../../../src/classroom/files.js';
import { createRuntime, simulate } from '../../../src/simulation/index.js';

export function trimFixture(t, { language = 'en', heavy = false, trim } = {}) {
  const previous = globalThis.document;
  const initial = {
    version: 1,
    name: 'Trim experiment',
    nodes: [
      { id: 'input', type: 'switch', x: 0, y: 0, params: { value: 0 } },
      { id: 'counter', type: 'counter', x: 300, y: 0, params: { initial: 0 } },
      ...(heavy
        ? [
            { id: 'fast', type: 'clock', x: 0, y: 500, params: { frequency: 1000, duty: 0.5 } },
            ...Array.from({ length: 197 }, (_, index) => ({
              id: `ram${index}`,
              type: 'ram',
              x: index * 300,
              y: 1000,
              params: {},
            })),
          ]
        : []),
    ],
    wires: [
      { id: 'clock', from: { node: 'input', port: 'out' }, to: { node: 'counter', port: 'clk' } },
    ],
  };
  const original = createSequence(initial, {
    id: 'trim-sequence',
    probes: [{ node: 'counter', port: 'out', side: 'outputs' }],
  });
  for (const [at, value] of [
    [0, 0],
    [1, 1],
    [1, 0],
    [2, 1],
  ])
    appendAction(original, { at, node: 'input', key: 'value', value });
  finishSequence(original, heavy ? 120 : 3);
  let project = structuredClone(initial),
    runtime = createRuntime(),
    markup = '',
    closed = 0,
    adopted = 0;
  project.nodes[0].params.value = 1;
  simulate(project, runtime, 0);
  runtime.time = 7;
  const elements = new Map(),
    notifications = [],
    locks = [],
    calls = [],
    changes = [];
  globalThis.document = {
    querySelector: (selector) => elements.get(selector) || null,
    querySelectorAll: () => [],
    createElement: () => ({ click() {} }),
  };
  t.after(() => {
    globalThis.document = previous;
  });
  const adapter = {
    getProject: () => project,
    getRuntime: () => runtime,
    getLanguage: () => language,
    setRunning() {},
    adoptPlayback(nextProject, nextRuntime) {
      project = nextProject;
      runtime = nextRuntime;
      adopted++;
    },
    refreshPlayback() {},
    closeModal() {
      closed++;
      for (const element of elements.values()) element.isConnected = false;
      elements.clear();
    },
    notify: (message) => notifications.push(message),
    showModal(html) {
      markup = html;
      elements.clear();
      for (const id of ['until', 'preview', 'copy', 'cancel', 'apply'])
        elements.set(`#sequence-trim-${id}`, {
          value: '',
          disabled: false,
          textContent: '',
          isConnected: true,
        });
      for (const selector of ['.modal', '.modal-backdrop', '#close-modal']) {
        const element = new EventTarget();
        element.isConnected = true;
        elements.set(selector, element);
      }
      elements.get('#sequence-trim-until').value =
        html.match(/id="sequence-trim-until"[^>]*\bvalue="([^"]*)"/)?.[1] || '';
    },
  };
  const session = createActionSession(adapter, {
    sequence: original,
    onChange: () => changes.push('change'),
    onSave: () => changes.push('save'),
  });
  const state = Object.assign(session.state, {
    busy: false,
    notes: 'Keep this explanation',
    attempt: { journal: [{ kind: 'created', id: 'construction-evidence' }] },
  });
  const operations = createClassroomOperations((busy) => {
    state.busy = busy;
    locks.push(busy);
  });
  const actualTrim = session.trimRecording;
  session.trimRecording = async (cutoff, options) => {
    calls.push({ cutoff, options, locked: operations.isBusy() });
    return trim
      ? trim({ cutoff, options, state, session })
      : actualTrim.call(session, cutoff, options);
  };
  const guardIdle = () => {
    if (state.busy) throw Error('Wait for the current operation.');
  };
  const open = createSequenceTrim({
    adapter,
    state,
    session,
    L: (ua, en) => (language === 'ua' ? ua : en),
    guardIdle,
    operations,
  });
  const element = (id) => elements.get(`#sequence-trim-${id}`);
  function cutoff(value) {
    element('until').value = String(value);
    element('until').oninput();
  }
  return {
    adapter,
    state,
    session,
    original,
    initial,
    notifications,
    locks,
    calls,
    changes,
    open,
    cutoff,
    element,
    operations,
    modalElement: (selector) => elements.get(selector),
    get project() {
      return project;
    },
    get runtime() {
      return runtime;
    },
    get markup() {
      return markup;
    },
    get closed() {
      return closed;
    },
    get adopted() {
      return adopted;
    },
  };
}
